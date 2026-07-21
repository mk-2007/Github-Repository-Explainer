import { create } from "zustand";

/**
 * Manual movement intent from the D-pad HUD (NavControls.tsx) or keyboard.
 * Kept separate from playerStore's click-target so the two input methods
 * never fight over the same field — Player.tsx just checks this first
 * each frame and, if either axis is non-zero, takes priority over any
 * pending click-to-walk target.
 */
export type Axis = -1 | 0 | 1;

interface ControlsState {
  turn: Axis; // -1 = left, 1 = right
  move: Axis; // -1 = backward, 1 = forward
  setTurn: (turn: Axis) => void;
  setMove: (move: Axis) => void;
}

export const useControlsStore = create<ControlsState>((set) => ({
  turn: 0,
  move: 0,
  setTurn: (turn) => set({ turn }),
  setMove: (move) => set({ move }),
}));
