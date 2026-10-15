"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInstance: any = null;

export default function MermaidDiagram({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        if (!mermaidInstance) {
          const mod = await import("mermaid");
          mermaidInstance = mod.default;
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              background: "#12161f",
              primaryColor: "#171c28",
              primaryTextColor: "#e6e8ef",
              primaryBorderColor: "#6ee7b7",
              lineColor: "#8b5cf6",
              fontFamily: "JetBrains Mono, monospace",
            },
          });
        }
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaidInstance.render(id, src);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Could not render diagram");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [src]);

  function handleCopySource() {
    navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleZoomIn() {
    setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
  }

  function handleZoomReset() {
    setZoom(1);
  }

  if (error) {
    return (
      <div style={{ padding: 16, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6 }}>
        <p style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: "0.85rem", margin: "0 0 12px" }}>
          Unable to render visual diagram: {error}
        </p>
        <button
          onClick={handleCopySource}
          className="mono"
          style={{
            background: "none",
            border: "1px solid var(--panel-border)",
            color: "var(--text)",
            padding: "4px 10px",
            fontSize: "0.75rem",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          {copied ? "✓ Copied Source" : "Copy Raw Mermaid"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Interactive Diagram Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "1px solid var(--panel-border)",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleZoomIn}
            className="mono"
            title="Zoom In"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--panel-border)",
              color: "var(--text)",
              width: 28,
              height: 28,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="mono"
            title="Zoom Out"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--panel-border)",
              color: "var(--text)",
              width: 28,
              height: 28,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            −
          </button>
          <button
            onClick={handleZoomReset}
            className="mono"
            title="Reset Zoom"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--panel-border)",
              color: "var(--text-dim)",
              padding: "4px 8px",
              height: 28,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

        <button
          onClick={handleCopySource}
          className="mono"
          style={{
            background: "transparent",
            border: "1px solid var(--panel-border)",
            color: copied ? "var(--mint)" : "var(--text-dim)",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: "0.75rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {copied ? "✓ Copied" : "Copy Mermaid"}
        </button>
      </div>

      {/* Rendered Container */}
      <div
        style={{
          overflow: "auto",
          maxHeight: "75vh",
          padding: "16px 8px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
        />
      </div>
    </div>
  );
}
