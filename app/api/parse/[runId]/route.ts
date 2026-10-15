import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseFile } from "@/lib/parser";
import { buildGraph } from "@/lib/dependency-graph";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: rawRunId } = await params;
  const runId = Number(rawRunId);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const runRes = await query<{ id: number; status: string }>(
    `SELECT id, status FROM analysis_runs WHERE id = $1`,
    [runId]
  );
  if (runRes.rows.length === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (!["parsing", "failed"].includes(runRes.rows[0].status)) {
    return NextResponse.json({ status: runRes.rows[0].status, skipped: true });
  }

  const filesRes = await query<{ path: string; content: string }>(
    `SELECT path, content FROM raw_files WHERE run_id = $1`,
    [runId]
  );

  if (filesRes.rows.length === 0) {
    return NextResponse.json({ error: "No raw files found for this run" }, { status: 422 });
  }

  try {
    const parsed = filesRes.rows.map((f) => parseFile(f.path, f.content));
    const graph = buildGraph(parsed);

    // Batch insert modules into PostgreSQL
    const BATCH_SIZE = 50;
    for (let i = 0; i < graph.length; i += BATCH_SIZE) {
      const chunk = graph.slice(i, i + BATCH_SIZE);
      for (const m of chunk) {
        await query(
          `INSERT INTO modules (run_id, path, language, imports, exports, loc, topo_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (run_id, path) DO UPDATE SET
             language = $3, imports = $4, exports = $5, loc = $6, topo_order = $7`,
          [
            runId,
            m.path,
            m.language,
            JSON.stringify(m.resolvedImports),
            JSON.stringify(m.exports.slice(0, 10)),
            m.loc,
            m.topoOrder,
          ]
        );
      }
    }

    await query(
      `UPDATE analysis_runs SET status = 'summarizing', progress_current = 0, progress_total = $2 WHERE id = $1`,
      [runId, graph.length]
    );

    const unresolvedLanguageCount = graph.filter((m) => m.language === null).length;

    return NextResponse.json({
      status: "summarizing",
      moduleCount: graph.length,
      unsupportedLanguageFiles: unresolvedLanguageCount,
    });
  } catch (err: any) {
    await query(`UPDATE analysis_runs SET status = 'failed', error = $2 WHERE id = $1`, [
      runId,
      err.message ?? "Parsing failed",
    ]);
    return NextResponse.json({ error: err.message ?? "Parsing failed" }, { status: 500 });
  }
}
