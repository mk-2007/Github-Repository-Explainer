import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const runId = Number(rawId);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const res = await query(
    `SELECT id, status, progress_current, progress_total, error, created_at, completed_at
     FROM analysis_runs WHERE id = $1`,
    [runId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(res.rows[0]);
}
