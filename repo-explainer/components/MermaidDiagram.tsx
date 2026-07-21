"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInstance: any = null;

export default function MermaidDiagram({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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
        // Edge case: malformed diagram source (shouldn't happen since
        // generation is deterministic, but a truly unusual repo structure
        // could produce an edge Mermaid doesn't like). Fail visibly
        // rather than leaving a blank panel with no explanation.
        if (!cancelled) setError(err.message ?? "Could not render diagram");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return <p style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: "0.85rem" }}>{error}</p>;
  }

  return <div ref={containerRef} style={{ overflowX: "auto" }} />;
}
