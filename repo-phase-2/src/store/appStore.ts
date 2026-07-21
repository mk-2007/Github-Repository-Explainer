import { create } from "zustand";

/**
 * Top-level "which screen" state — separate from playerStore (which only
 * ever tracks walk targets) so swapping stages doesn't touch movement state.
 *
 * Phase 5: "welcome" is the house-exterior entrance screen; clicking its
 * door flips this to "corridor" and the 3D corridor mounts.
 */
export type AppStage = "welcome" | "corridor";

interface AppState {
  stage: AppStage;
  enterCorridor: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: "welcome",
  enterCorridor: () => set({ stage: "corridor" }),
}));
