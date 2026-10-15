import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseRepoUrl, getRepoMeta, getLatestCommitSha, fetchRepoFiles } from "@/lib/github-fetch";

export async function POST(req: NextRequest) {
  let owner: string, name: string;
  try {
    const body = await req.json();
    ({ owner, name } = parseRepoUrl(body.repoUrl));
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const { defaultBranch } = await getRepoMeta(owner, name);
    const commitSha = await getLatestCommitSha(owner, name, defaultBranch);

    // Upsert the repo row.
    const repoRes = await query<{ id: number }>(
      `INSERT INTO repos (owner, name, default_branch)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner, name) DO UPDATE SET default_branch = $3
       RETURNING id`,
      [owner, name, defaultBranch]
    );
    const repoId = repoRes.rows[0].id;

    // Cache check — this is the whole point. Same repo at the same commit
    // costs zero LLM tokens the second time, whether it's done or already
    // in progress from another request.
    const existing = await query<{ id: number; status: string }>(
      `SELECT id, status FROM analysis_runs WHERE repo_id = $1 AND commit_sha = $2`,
      [repoId, commitSha]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ runId: existing.rows[0].id, status: existing.rows[0].status, cached: true });
    }

    // New run: create the row, then ingest. Ingestion happens inline here
    // rather than queued, since GitHub fetch is comparatively fast and
    // cheap (no token cost) — parsing/summarization (Phases 3-4) are what
    // actually need the async job queue, because those hit the Groq
    // rate limit.
    const runRes = await query<{ id: number }>(
      `INSERT INTO analysis_runs (repo_id, commit_sha, status) VALUES ($1, $2, 'fetching') RETURNING id`,
      [repoId, commitSha]
    );
    const runId = runRes.rows[0].id;

    let files;
    try {
      files = await fetchRepoFiles(owner, name, commitSha);
    } catch (err: any) {
      await query(`UPDATE analysis_runs SET status = 'failed', error = $2 WHERE id = $1`, [
        runId,
        err.message,
      ]);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    if (files.length === 0) {
      await query(`UPDATE analysis_runs SET status = 'failed', error = $2 WHERE id = $1`, [
        runId,
        "No analyzable source files found (repo may be empty, or entirely binary/vendored content)",
      ]);
      return NextResponse.json({ error: "No analyzable files found in this repo" }, { status: 422 });
    }

    // Persist raw files so the Phase 3 parsing step can pick them up in a
    // separate invocation without re-fetching from GitHub.
    for (const file of files) {
      await query(
        `INSERT INTO raw_files (run_id, path, content, size) VALUES ($1, $2, $3, $4)
         ON CONFLICT (run_id, path) DO NOTHING`,
        [runId, file.path, file.content, file.size]
      );
    }

    await query(
      `UPDATE analysis_runs SET status = 'parsing', progress_total = $2 WHERE id = $1`,
      [runId, files.length]
    );

    return NextResponse.json({ runId, status: "parsing", cached: false, fileCount: files.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}
