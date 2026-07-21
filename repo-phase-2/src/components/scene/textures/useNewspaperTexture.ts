"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { createNewspaperTexture } from "./newspaperTexture";

/**
 * Builds the newsprint texture once, lazily on first client render (canvas/
 * document don't exist during Next.js server rendering, hence the guard).
 * Returns null on the server / before the guard passes; callers should fall
 * back to a flat placeholder color in the meantime.
 */
export function useNewspaperTexture(): THREE.CanvasTexture | null {
  const [texture] = useState<THREE.CanvasTexture | null>(() =>
    typeof document !== "undefined" ? createNewspaperTexture() : null
  );

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  return texture;
}
