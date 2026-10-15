"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GraphHero from "@/components/GraphHero";

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(`/run/${data.runId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
        <GraphHero />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(11,14,20,0.4) 0%, rgba(11,14,20,0.92) 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 640 }}>
        <div className="badge badge-mint" style={{ marginBottom: 20 }}>
          <span>●</span> static analysis · zero-cost architecture pass
        </div>

        <h1
          className="mono"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          repo <span style={{ color: "var(--mint)" }}>// explainer</span>
        </h1>

        <p style={{ color: "var(--text-dim)", fontSize: "1.05rem", margin: "0 0 32px" }}>
          Paste a GitHub repo. Get its dependency graph, a module-by-module
          walkthrough in real build order, and an onboarding guide —
          parsed, not guessed.
        </p>

        <form
          onSubmit={handleSubmit}
          className="panel"
          style={{
            display: "flex",
            gap: 8,
            padding: 8,
            borderRadius: 6,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="github.com/owner/repo"
            required
            className="mono"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text)",
              fontSize: "0.95rem",
              padding: "10px 12px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="mono"
            style={{
              background: "var(--mint)",
              color: "#0b0e14",
              border: "none",
              borderRadius: 4,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "analyzing…" : "explain →"}
          </button>
        </form>

        {error && (
          <p style={{ color: "var(--amber)", marginTop: 16, fontFamily: "var(--mono)", fontSize: "0.85rem" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
