import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { summarize } from "@/lib/groq-client";
import { buildSynthesisPrompt } from "@/lib/prompts";
import { buildArchitectureMermaid, buildSequenceMermaid } from "@/lib/diagram-builder";

// Cap how many module summaries get fed into the single synthesis call.
// The diagrams already handle density via most-connected selection; the
// text synthesis needs its own guard since a 200-module repo's summaries
// concatenated would blow well past the free-tier TPM ceiling in one call.
const MAX_MODULES_IN_SYNTHESIS = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const runId = Number(params.runId);
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
  if (runRes.rows[0].status !== "synthesizing") {
    return NextResponse.json({ status: runRes.rows[0].status, skipped: true });
  }

  const repoRes = await query<{ owner: string; name: string }>(
    `SELECT owner, name FROM repos WHERE id = $1`,
    [runRes.rows[0].repo_id]
  );
  const repoName = repoRes.rows[0] ? `${repoRes.rows[0].owner}/${repoRes.rows[0].name}` : "repository";

  const modulesRes = await query<{
    path: string;
    imports: string[];
    topo_order: number | null;
    llm_summary: string | null;
  }>(
    `SELECT path, imports, topo_order, llm_summary
     FROM modules WHERE run_id = $1 ORDER BY topo_order ASC NULLS LAST`,
    [runId]
  );

  if (modulesRes.rows.length === 0) {
    return NextResponse.json({ error: "No modules found for this run" }, { status: 422 });
  }

  const diagramModules = modulesRes.rows.map((m) => ({
    path: m.path,
    resolvedImports: m.imports ?? [],
    topoOrder: m.topo_order,
  }));

  try {
    // Diagrams: deterministic, zero LLM cost.
    const { mermaid: architectureMermaid } = buildArchitectureMermaid(diagramModules);
    const sequenceMermaid = buildSequenceMermaid(diagramModules);

    await query(
      `INSERT INTO diagrams (run_id, kind, mermaid_src) VALUES ($1, 'architecture', $2), ($1, 'sequence', $3)`,
      [runId, architectureMermaid, sequenceMermaid]
    );

    // Narrative + onboarding guide: the one LLM call this phase makes.
    const withSummaries = modulesRes.rows.filter((m) => m.llm_summary);
    const capped = withSummaries.slice(0, MAX_MODULES_IN_SYNTHESIS);
    const omitted = withSummaries.length - capped.length;

    const prompt = buildSynthesisPrompt({
      repoName,
      moduleSummaries: capped.map((m) => ({
        path: m.path,
        summary: m.llm_summary as string,
        topoOrder: m.topo_order,
      })),
    });

    const finalPrompt =
      omitted > 0
        ? `${prompt}\n\n(Note: ${omitted} additional smaller/less-connected modules exist but are omitted from this summary for brevity.)`
        : prompt;

    let raw: string;
    try {
      raw = await summarize(finalPrompt, { maxTokens: 1200 });
    } catch (err: any) {
      // Edge case: synthesis call itself fails (rate limit exhausted for
      // the day, etc). Don't leave the run stuck — mark it done with a
      // clear placeholder rather than failing after all the per-module
      // work already succeeded.
      raw = `Narrative unavailable (${err.message ?? "LLM call failed"}). Module-level summaries above are still complete.\n---ONBOARDING---\nOnboarding guide unavailable for the same reason.`;
    }

    const [narrative, onboarding] = raw.split("---ONBOARDING---").map((s) => s.trim());

    await query(
      `INSERT INTO guides (run_id, narrative_md, onboarding_md) VALUES ($1, $2, $3)`,
      [runId, narrative || raw, onboarding || "Onboarding guide unavailable."]
    );

    await query(
      `UPDATE analysis_runs SET status = 'done', completed_at = now() WHERE id = $1`,
      [runId]
    );

    return NextResponse.json({ status: "done" });
  } catch (err: any) {
    await query(`UPDATE analysis_runs SET status = 'failed', error = $2 WHERE id = $1`, [
      runId,
      err.message ?? "Synthesis failed",
    ]);
    return NextResponse.json({ error: err.message ?? "Synthesis failed" }, { status: 500 });
  }
}
