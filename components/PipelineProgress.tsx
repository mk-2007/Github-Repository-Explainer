"use client";

import { useEffect, useState } from "react";

export type Phase = "fetching" | "parsing" | "summarizing" | "synthesizing" | "done" | "failed";

interface PipelineProgressProps {
  phase: Phase;
  progress: { current: number; total: number } | null;
}

const STEPS: { key: Phase; label: string; desc: string }[] = [
  { key: "fetching", label: "Ingestion", desc: "Fetching repo files via GitHub API" },
  { key: "parsing", label: "AST Parse", desc: "Tree-sitter syntax & dependency graph" },
  { key: "summarizing", label: "AI Analysis", desc: "Topological module summarization" },
  { key: "synthesizing", label: "Synthesis", desc: "Generating architecture guide & diagrams" },
];

export default function PipelineProgress({ phase, progress }: PipelineProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.key === phase);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  const percent =
    phase === "summarizing" && progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : phase === "synthesizing"
      ? 92
      : phase === "parsing"
      ? 35
      : 15;

  return (
    <div
      className="panel"
      style={{
        maxWidth: 620,
        width: "100%",
        padding: "32px 28px",
        borderRadius: 8,
        background: "var(--panel)",
        border: "1px solid var(--panel-border)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="badge badge-mint">
          <span>●</span> {phase.toUpperCase()} IN PROGRESS
        </div>
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
          Elapsed: {elapsed}s
        </span>
      </div>

      {/* Progress Bar Container */}
      <div
        style={{
          width: "100%",
          height: 8,
          background: "rgba(255, 255, 255, 0.06)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, var(--mint) 0%, var(--violet) 100%)",
            borderRadius: 4,
            transition: "width 0.4s ease-out",
          }}
        />
      </div>

      {/* Steps Pipeline */}
      <div style={{ display: "grid", gap: 14 }}>
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 14px",
                borderRadius: 6,
                background: isCurrent ? "rgba(110, 231, 183, 0.05)" : "transparent",
                border: isCurrent ? "1px solid rgba(110, 231, 183, 0.25)" : "1px solid transparent",
                opacity: isDone || isCurrent ? 1 : 0.4,
              }}
            >
              <div
                className="mono"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: isDone ? "var(--mint)" : isCurrent ? "rgba(110, 231, 183, 0.2)" : "rgba(255,255,255,0.1)",
                  color: isDone ? "#0b0e14" : isCurrent ? "var(--mint)" : "var(--text-dim)",
                }}
              >
                {isDone ? "✓" : idx + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: "0.9rem", color: isCurrent ? "var(--mint)" : "var(--text)", fontWeight: 600 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {step.desc}
                </div>
              </div>

              {isCurrent && phase === "summarizing" && progress && (
                <div className="mono" style={{ fontSize: "0.85rem", color: "var(--mint)", fontWeight: 600 }}>
                  {progress.current} / {progress.total} ({percent}%)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
