import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { summarize } from "@/lib/groq-client";
import { buildModuleSummaryPrompt, estimateTokens } from "@/lib/prompts";

// Serverless functions have execution time limits, and a repo with many
// modules queued behind a ~30 RPM cap can easily take minutes. Rather than
// trying to process everything in one request, this route processes a
// bounded batch per call and is resumable: it only ever selects modules
// where llm_summary IS NULL, so calling it repeatedly (e.g. from a client
// poll loop, or a cron-style retry) picks up exactly where it left off.
const BATCH_SIZE = 8;

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const runId = Number(params.runId);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const runRes = await query<{ status: string; progress_total: number }>(
    `SELECT status, progress_total FROM analysis_runs WHERE id = $1`,
    [runId]
  );
  if (runRes.rows.length === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (!["summarizing"].includes(runRes.rows[0].status)) {
    return NextResponse.json({ status: runRes.rows[0].status, skipped: true });
  }

  const pending = await query<{
    id: number;
    path: string;
    language: string | null;
    imports: string[];
  }>(
    `SELECT m.id, m.path, m.language, m.imports
     FROM modules m
     WHERE m.run_id = $1 AND m.llm_summary IS NULL
     ORDER BY m.topo_order ASC NULLS LAST
     LIMIT $2`,
    [runId, BATCH_SIZE]
  );

  if (pending.rows.length === 0) {
    // Nothing left to summarize — advance to synthesis.
    await query(`UPDATE analysis_runs SET status = 'synthesizing' WHERE id = $1`, [runId]);
    return NextResponse.json({ status: "synthesizing", done: true });
  }

  for (const mod of pending.rows) {
    const fileRes = await query<{ content: string }>(
      `SELECT content FROM raw_files WHERE run_id = $1 AND path = $2`,
      [runId, mod.path]
    );
    const content = fileRes.rows[0]?.content ?? "";

    const { prompt } = buildModuleSummaryPrompt({
      path: mod.path,
      language: mod.language,
      resolvedImports: mod.imports ?? [],
      content,
    });

    let summaryText: string;
    try {
      summaryText = await summarize(prompt, { maxTokens: 300 });
    } catch (err: any) {
      // Edge case: a single module failing the LLM call (rate limit
      // exhausted for the day, transient API error) shouldn't fail the
      // whole run. Record a placeholder and move on — it'll show up in
      // the guide as "summary unavailable" rather than blocking everyone
      // else's already-completed work.
      summaryText = `(summary unavailable: ${err.message ?? "LLM call failed"})`;
    }

    await query(
      `UPDATE modules SET llm_summary = $1, token_count_estimate = $2 WHERE id = $3`,
      [summaryText, estimateTokens(prompt), mod.id]
    );

    await query(
      `UPDATE analysis_runs SET progress_current = progress_current + 1 WHERE id = $1`,
      [runId]
    );
  }

  const remaining = await query<{ count: string }>(
    `SELECT count(*) FROM modules WHERE run_id = $1 AND llm_summary IS NULL`,
    [runId]
  );
  const remainingCount = Number(remaining.rows[0].count);

  if (remainingCount === 0) {
    await query(`UPDATE analysis_runs SET status = 'synthesizing' WHERE id = $1`, [runId]);
    return NextResponse.json({ status: "synthesizing", done: true, processed: pending.rows.length });
  }

  return NextResponse.json({
    status: "summarizing",
    done: false,
    processed: pending.rows.length,
    remaining: remainingCount,
  });
}
