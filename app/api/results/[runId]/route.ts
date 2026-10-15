import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: rawRunId } = await params;
  const runId = Number(rawRunId);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const runRes = await query(
    `SELECT ar.id, ar.status, ar.commit_sha, r.owner, r.name
     FROM analysis_runs ar JOIN repos r ON r.id = ar.repo_id
     WHERE ar.id = $1`,
    [runId]
  );
  if (runRes.rows.length === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (runRes.rows[0].status !== "done") {
    return NextResponse.json({ error: "Run not finished yet", status: runRes.rows[0].status }, { status: 409 });
  }

  const modulesRes = await query(
    `SELECT path, language, loc, topo_order, llm_summary
     FROM modules WHERE run_id = $1
     ORDER BY topo_order ASC NULLS LAST`,
    [runId]
  );

  const diagramsRes = await query(
    `SELECT kind, mermaid_src FROM diagrams WHERE run_id = $1`,
    [runId]
  );

  const guideRes = await query(
    `SELECT narrative_md, onboarding_md FROM guides WHERE run_id = $1`,
    [runId]
  );

  return NextResponse.json({
    repo: `${runRes.rows[0].owner}/${runRes.rows[0].name}`,
    commitSha: runRes.rows[0].commit_sha,
    modules: modulesRes.rows,
    diagrams: diagramsRes.rows,
    guide: guideRes.rows[0] ?? null,
  });
}
