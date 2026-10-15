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

    // Cache check: same repo at the same commit costs zero tokens.
    const existing = await query<{ id: number; status: string }>(
      `SELECT id, status FROM analysis_runs WHERE repo_id = $1 AND commit_sha = $2`,
      [repoId, commitSha]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ runId: existing.rows[0].id, status: existing.rows[0].status, cached: true });
    }

    // New run: create the row, then ingest.
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

    // Persist raw files in multi-row batches rather than single-row serial queries
    const BATCH_SIZE = 50;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const chunk = files.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const rowPlaceholders: string[] = [];

      chunk.forEach((f, idx) => {
        const offset = idx * 4;
        rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        values.push(runId, f.path, f.content, f.size);
      });

      await query(
        `INSERT INTO raw_files (run_id, path, content, size)
         VALUES ${rowPlaceholders.join(", ")}
         ON CONFLICT (run_id, path) DO NOTHING`,
        values
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
