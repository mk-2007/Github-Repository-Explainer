"use client";

import { useRenderErrorStore } from "@/store/renderErrorStore";

export default function RenderErrorBanner() {
  const error = useRenderErrorStore((s) => s.error);
  if (!error) return null;

  return (
    <div className="absolute top-0 inset-x-0 z-50 bg-red-950/95 text-red-100 text-sm px-4 py-3 border-b border-red-500/40">
      <span className="font-semibold">Scene failed to render:</span> {error} — check the
      browser console for the full stack trace.
    </div>
  );
}
