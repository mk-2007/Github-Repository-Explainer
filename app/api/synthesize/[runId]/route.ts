import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { summarize } from "@/lib/llm-client";
import { buildSynthesisPrompt } from "@/lib/prompts";
import { buildArchitectureMermaid, buildSequenceMermaid } from "@/lib/diagram-builder";

const MAX_MODULES_IN_SYNTHESIS = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: rawRunId } = await params;
  const runId = Number(rawRunId);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const runRes = await query<{ status: string; repo_id: number }>(
    `SELECT status, repo_id FROM analysis_runs WHERE id = $1`,
    [runId]
  );
  if (runRes.rows.length === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const repoRes = await query<{ name: string }>(`SELECT name FROM repos WHERE id = $1`, [
    runRes.rows[0].repo_id,
  ]);
  const repoName = repoRes.rows[0]?.name ?? "repository";

  const modulesRes = await query<{
    path: string;
    imports: string[];
    topo_order: number | null;
    llm_summary: string | null;
  }>(
    `SELECT path, imports, topo_order, llm_summary
     FROM modules WHERE run_id = $1
     ORDER BY topo_order ASC NULLS LAST`,
    [runId]
  );

  const graphModules = modulesRes.rows.map((r) => ({
    path: r.path,
    resolvedImports: r.imports ?? [],
    topoOrder: r.topo_order,
  }));

  const archMermaid = buildArchitectureMermaid(graphModules);
  const seqMermaid = buildSequenceMermaid(graphModules);

  await query(`INSERT INTO diagrams (run_id, kind, mermaid_src) VALUES ($1, 'architecture', $2)`, [
    runId,
    archMermaid,
  ]);
  await query(`INSERT INTO diagrams (run_id, kind, mermaid_src) VALUES ($1, 'sequence', $2)`, [
    runId,
    seqMermaid,
  ]);

  const cappedSummaries = modulesRes.rows.slice(0, MAX_MODULES_IN_SYNTHESIS).map((r) => ({
    path: r.path,
    summary: r.llm_summary ?? "(summary unavailable)",
    topoOrder: r.topo_order,
  }));

  const synthesisPrompt = buildSynthesisPrompt({
    repoName,
    moduleSummaries: cappedSummaries,
  });

  let rawSynthesis: string;
  try {
    rawSynthesis = await summarize(synthesisPrompt, { maxTokens: 1200, temperature: 0.3 });
  } catch (err: any) {
    rawSynthesis = `Failed to generate architecture synthesis: ${err.message}`;
  }

  const parts = rawSynthesis.split("---ONBOARDING---");
  const narrative = parts[0]?.trim() || "No narrative generated.";
  const onboarding = parts[1]?.trim() || "No onboarding guide generated.";

  await query(`INSERT INTO guides (run_id, narrative_md, onboarding_md) VALUES ($1, $2, $3)`, [
    runId,
    narrative,
    onboarding,
  ]);

  await query(`UPDATE analysis_runs SET status = 'done', completed_at = now() WHERE id = $1`, [
    runId,
  ]);

  return NextResponse.json({ status: "done" });
}
