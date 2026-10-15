"use client";

import { useEffect, useState, useMemo, use } from "react";
import MermaidDiagram from "@/components/MermaidDiagram";
import PipelineProgress, { type Phase } from "@/components/PipelineProgress";

interface ModuleRow {
  path: string;
  language: string | null;
  loc: number;
  topo_order: number | null;
  llm_summary: string | null;
}

interface Results {
  repo: string;
  commitSha: string;
  modules: ModuleRow[];
  diagrams: { kind: string; mermaid_src: string }[];
  guide: { narrative_md: string; onboarding_md: string } | null;
}

function isLikelyEntryPoint(filePath: string): boolean {
  const norm = filePath.toLowerCase().replace(/\\/g, "/");
  return (
    norm === "index.ts" ||
    norm === "index.js" ||
    norm === "main.py" ||
    norm === "app.py" ||
    norm === "src/index.ts" ||
    norm === "src/index.js" ||
    norm === "src/main.ts" ||
    norm.endsWith("/page.tsx") ||
    norm.endsWith("/cli.ts") ||
    norm.endsWith("/main.py")
  );
}

function languageBadgeClass(lang: string | null) {
  if (lang === "typescript") return "badge-violet";
  if (lang === "python") return "badge-mint";
  if (lang === "javascript") return "badge-mint";
  return "badge-amber";
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = use(params);
  const [phase, setPhase] = useState<Phase>("parsing");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<"architecture" | "sequence" | "guide" | "modules">(
    "architecture"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [copiedGuide, setCopiedGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function drive() {
      try {
        const statusRes = await fetch(`/api/status/${runId}`);
        const status = await statusRes.json();
        if (!statusRes.ok) throw new Error(status.error ?? "Could not load run");

        let current = status.status as Phase;

        if (current === "parsing") {
          const r = await fetch(`/api/parse/${runId}`, { method: "POST" });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Parsing failed");
          current = "summarizing";
        }
        if (cancelled) return;
        setPhase(current);

        while (current === "summarizing" && !cancelled) {
          const r = await fetch(`/api/summarize/${runId}`, { method: "POST" });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Summarization failed");
          if (data.remaining !== undefined) {
            setProgress({ current: (data.processed ?? 0), total: data.remaining + (data.processed ?? 0) });
          }
          if (data.done) current = "synthesizing";
        }
        if (cancelled) return;
        setPhase(current);

        if (current === "synthesizing") {
          const r = await fetch(`/api/synthesize/${runId}`, { method: "POST" });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Synthesis failed");
          current = "done";
        }
        if (cancelled) return;
        setPhase(current);

        if (current === "done") {
          const r = await fetch(`/api/results/${runId}`);
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Could not load results");
          if (!cancelled) setResults(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setPhase("failed");
        }
      }
    }

    drive();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const filteredModules = useMemo(() => {
    if (!results) return [];
    return results.modules.filter((m) => {
      const matchesSearch = m.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang =
        selectedLanguage === "all" ||
        (selectedLanguage === "unsupported" && m.language === null) ||
        m.language === selectedLanguage;
      return matchesSearch && matchesLang;
    });
  }, [results, searchQuery, selectedLanguage]);

  const languages = useMemo(() => {
    if (!results) return [];
    const set = new Set<string>();
    results.modules.forEach((m) => set.add(m.language ?? "unsupported"));
    return Array.from(set).sort();
  }, [results]);

  function handleCopyGuide() {
    if (!results?.guide) return;
    const fullText = `# ${results.repo} Architecture Guide\nCommit: ${results.commitSha}\n\n## Architecture Narrative\n${results.guide.narrative_md}\n\n## Onboarding Guide\n${results.guide.onboarding_md}`;
    navigator.clipboard.writeText(fullText);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2000);
  }

  function handleDownloadMarkdown() {
    if (!results?.guide) return;
    const fullText = `# ${results.repo} Architecture Guide\nCommit: ${results.commitSha}\n\n## Architecture Narrative\n${results.guide.narrative_md}\n\n## Onboarding Guide\n${results.guide.onboarding_md}`;
    const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${results.repo.replace("/", "-")}-architecture.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "failed") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="panel" style={{ padding: 32, maxWidth: 540, width: "100%", borderRadius: 8, border: "1px solid var(--panel-border)" }}>
          <div className="badge badge-amber" style={{ marginBottom: 16 }}>
            ANALYSIS FAILED
          </div>
          <p className="mono" style={{ color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 24 }}>
            {error}
          </p>
          <a href="/" className="mono" style={{ color: "var(--mint)", textDecoration: "none" }}>
            ← Return and try another repository
          </a>
        </div>
      </main>
    );
  }

  if (!results) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <PipelineProgress phase={phase} progress={progress} />
      </main>
    );
  }

  const architectureDiagram = results.diagrams.find((d) => d.kind === "architecture");
  const sequenceDiagram = results.diagrams.find((d) => d.kind === "sequence");

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 className="mono" style={{ fontSize: "1.4rem", margin: "0 0 6px" }}>{results.repo}</h1>
          <a href="/" className="mono" style={{ fontSize: "0.8rem", color: "var(--text-dim)", textDecoration: "none" }}>
            ← Analyze another repo
          </a>
        </div>
        <span className="path">{results.commitSha.slice(0, 7)}</span>
      </header>

      <nav style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--panel-border)" }}>
        {(["architecture", "sequence", "guide", "modules"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="mono"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--mint)" : "2px solid transparent",
              color: activeTab === tab ? "var(--mint)" : "var(--text-dim)",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "architecture" && architectureDiagram && (
        <div className="panel" style={{ padding: 20, borderRadius: 6 }}>
          <MermaidDiagram src={architectureDiagram.mermaid_src} />
        </div>
      )}

      {activeTab === "sequence" && sequenceDiagram && (
        <div className="panel" style={{ padding: 20, borderRadius: 6 }}>
          <MermaidDiagram src={sequenceDiagram.mermaid_src} />
        </div>
      )}

      {activeTab === "guide" && results.guide && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={handleCopyGuide}
              className="mono"
              style={{
                background: "transparent",
                border: "1px solid var(--panel-border)",
                color: copiedGuide ? "var(--mint)" : "var(--text)",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {copiedGuide ? "✓ Copied Guide" : "Copy Markdown"}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="mono"
              style={{
                background: "var(--mint)",
                border: "none",
                color: "#0b0e14",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Download .md
            </button>
          </div>

          <div className="panel" style={{ padding: 24, borderRadius: 6 }}>
            <div className="badge badge-mint" style={{ marginBottom: 12 }}>architecture narrative</div>
            {results.guide.narrative_md.split("\n\n").map((p, i) => (
              <p key={i} style={{ lineHeight: 1.6, color: "var(--text)" }}>{p}</p>
            ))}
          </div>
          <div className="panel" style={{ padding: 24, borderRadius: 6 }}>
            <div className="badge badge-violet" style={{ marginBottom: 12 }}>onboarding guide</div>
            {results.guide.onboarding_md.split("\n").map((line, i) => (
              <p key={i} style={{ lineHeight: 1.6, color: "var(--text)" }}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {activeTab === "modules" && (
        <div>
          {/* Search and Language Filter Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search module path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mono"
              style={{
                flex: "1 1 240px",
                background: "var(--panel)",
                border: "1px solid var(--panel-border)",
                color: "var(--text)",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedLanguage("all")}
                className="mono"
                style={{
                  background: selectedLanguage === "all" ? "var(--panel-border)" : "transparent",
                  border: "1px solid var(--panel-border)",
                  color: selectedLanguage === "all" ? "var(--mint)" : "var(--text-dim)",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                All ({results.modules.length})
              </button>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className="mono"
                  style={{
                    background: selectedLanguage === lang ? "var(--panel-border)" : "transparent",
                    border: "1px solid var(--panel-border)",
                    color: selectedLanguage === lang ? "var(--mint)" : "var(--text-dim)",
                    padding: "4px 10px",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {filteredModules.map((m) => (
              <div key={m.path} className="panel" style={{ padding: 16, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <span className="path">{m.path}</span>
  {isLikelyEntryPoint(m.path) && (
    <span className="badge badge-mint" style={{ fontSize: "0.65rem" }}>
      ENTRY POINT
    </span>
  )}
</div>
                  <span className={`badge ${languageBadgeClass(m.language)}`}>
                    {m.language ?? "unsupported"} · {m.loc} loc
                  </span>
                </div>
                <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                  {m.llm_summary ?? "No summary generated."}
                </p>
              </div>
            ))}

            {filteredModules.length === 0 && (
              <div className="panel" style={{ padding: 24, textAlign: "center", borderRadius: 6 }}>
                <p className="mono" style={{ color: "var(--text-dim)", margin: 0, fontSize: "0.85rem" }}>
                  No modules match your search filter.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}


