/**
 * Ingestion layer: pulls repo tree + file contents via the GitHub REST API
 * (no git clone needed). Requires a GitHub PAT to get the
 * 5,000 req/hr authenticated rate limit instead of 60/hr unauthenticated.
 */

const GITHUB_API = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

export function parseRepoUrl(url: string): { owner: string; name: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/#?]+)/);
  if (!match) throw new Error("Could not parse a GitHub owner/repo from that URL");
  return { owner: match[1], name: match[2].replace(/\.git$/, "") };
}

export async function getRepoMeta(
  owner: string,
  name: string
): Promise<{ defaultBranch: string }> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, { headers: headers() });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Repo not found — check the URL, or it may be private");
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { defaultBranch: data.default_branch as string };
}

export async function getLatestCommitSha(
  owner: string,
  name: string,
  branch = "main"
): Promise<string> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${name}/commits/${branch}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.sha as string;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
  ".ttf", ".eot", ".lock", ".map", ".min.js", ".pdf", ".zip", ".tar",
  ".gz", ".mp4", ".mp3", ".wasm"
]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "vendor", ".next", "out"]);

export async function fetchRepoFiles(
  owner: string,
  name: string,
  commitSha: string
): Promise<RepoFile[]> {
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${name}/git/trees/${commitSha}?recursive=1`,
    { headers: headers() }
  );
  if (!treeRes.ok) throw new Error(`GitHub tree fetch failed: ${treeRes.status}`);
  const tree = await treeRes.json();

  const candidates = (tree.tree || []).filter((entry: any) => {
    if (entry.type !== "blob") return false;
    const topDir = entry.path.split("/")[0];
    if (SKIP_DIRS.has(topDir)) return false;
    if ([...SKIP_EXTENSIONS].some((ext) => entry.path.endsWith(ext))) return false;
    // Edge case: skip anything unreasonably large (generated bundles / binary files)
    if (entry.size && entry.size > 200_000) return false;
    return true;
  });

  const files: RepoFile[] = [];
  const CONCURRENCY = 10;
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const idx = cursor++;
      const entry = candidates[idx];
      try {
        const blobRes = await fetch(
          `${GITHUB_API}/repos/${owner}/${name}/git/blobs/${entry.sha}`,
          { headers: headers() }
        );
        if (!blobRes.ok) continue;
        const blob = await blobRes.json();
        const content = Buffer.from(blob.content, "base64").toString("utf-8");
        // Skip binary files that slipped past extension check
        if (content.includes("\u0000")) continue;
        files.push({ path: entry.path, content, size: entry.size });
      } catch {
        // Individual blob fetch failure shouldn't kill the entire pipeline
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, candidates.length) },
    () => worker()
  );
  await Promise.all(workers);

  return files;
}
