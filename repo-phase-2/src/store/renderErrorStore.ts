import { create } from "zustand";

/**
 * <Canvas> mounts its own React root for everything inside it — an error
 * boundary living in the outer page-level DOM tree can't catch anything
 * thrown inside Corridor/HomeRoom/etc, because it's a different root
 * entirely. SceneErrorBoundary (inside the Canvas tree) writes here on
 * catch; page.tsx reads it to show a visible banner instead of the
 * failure being a silent blank/black Canvas.
 */
interface RenderErrorState {
  error: string | null;
  setError: (error: string | null) => void;
}

export const useRenderErrorStore = create<RenderErrorState>((set) => ({
  error: null,
  setError: (error) => set({ error }),
}));
