/**
 * Ingestion layer: pulls repo tree + file contents via the GitHub REST API
 * (no git clone needed). Requires a GitHub PAT (also free) to get the
 * 5,000 req/hr authenticated rate limit instead of 60/hr unauthenticated —
 * a medium repo alone can burn through the unauthenticated limit.
 */

const GITHUB_API = "https://api.github.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
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
  ".ttf", ".eot", ".lock", ".map", ".min.js",
]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "vendor"]);

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

  const candidates = tree.tree.filter((entry: any) => {
    if (entry.type !== "blob") return false;
    if (SKIP_DIRS.has(entry.path.split("/")[0])) return false;
    if ([...SKIP_EXTENSIONS].some((ext) => entry.path.endsWith(ext))) return false;
    // Edge case: skip anything unreasonably large — a generated file or
    // vendored bundle that slipped past dir filtering. 200KB is a generous
    // ceiling for source files.
    if (entry.size && entry.size > 200_000) return false;
    return true;
  });

  const files: RepoFile[] = [];
  for (const entry of candidates) {
    const blobRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${name}/git/blobs/${entry.sha}`,
      { headers: headers() }
    );
    if (!blobRes.ok) continue; // edge case: deleted/unreadable blob, skip rather than fail the whole run
    const blob = await blobRes.json();
    const content = Buffer.from(blob.content, "base64").toString("utf-8");
    files.push({ path: entry.path, content, size: entry.size });
  }

  return files;
}
