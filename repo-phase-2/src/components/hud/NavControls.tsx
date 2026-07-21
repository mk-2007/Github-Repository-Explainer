"use client";

import { useEffect } from "react";
import { useControlsStore, type Axis } from "@/store/controlsStore";

const BTN =
  "w-12 h-12 flex items-center justify-center rounded-md bg-[var(--color-ink)]/70 border border-[var(--color-paper)]/25 text-[var(--color-paper)] text-xl select-none touch-none active:bg-[var(--color-masthead)]/70";

/**
 * Manual navigation HUD. Click-to-walk (Corridor.tsx) only works on
 * geometry that's on-screen, so it can't turn you around or back you up —
 * this D-pad (plus arrow keys / WASD on desktop) covers that gap. Holding
 * a direction sets an axis in controlsStore; Player.tsx reads it every
 * frame and gives it priority over any pending click target.
 */
export default function NavControls() {
  const setTurn = useControlsStore((s) => s.setTurn);
  const setMove = useControlsStore((s) => s.setMove);

  useEffect(() => {
    const held = new Set<string>();

    function recompute() {
      const left = held.has("ArrowLeft") || held.has("a") || held.has("A");
      const right = held.has("ArrowRight") || held.has("d") || held.has("D");
      const fwd = held.has("ArrowUp") || held.has("w") || held.has("W");
      const back = held.has("ArrowDown") || held.has("s") || held.has("S");

      const turn: Axis = left && !right ? -1 : right && !left ? 1 : 0;
      const move: Axis = fwd && !back ? 1 : back && !fwd ? -1 : 0;
      setTurn(turn);
      setMove(move);
    }

    function onKeyDown(e: KeyboardEvent) {
      held.add(e.key);
      recompute();
    }
    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.key);
      recompute();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      setTurn(0);
      setMove(0);
    };
  }, [setTurn, setMove]);

  function moveHandlers(v: Axis) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        setMove(v);
      },
      onPointerUp: () => setMove(0),
      onPointerLeave: () => setMove(0),
      onPointerCancel: () => setMove(0),
    };
  }
  function turnHandlers(v: Axis) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        setTurn(v);
      },
      onPointerUp: () => setTurn(0),
      onPointerLeave: () => setTurn(0),
      onPointerCancel: () => setTurn(0),
    };
  }

  return (
    <div className="absolute bottom-6 right-6 z-20 grid grid-cols-3 grid-rows-2 gap-1.5">
      <div />
      <button className={BTN} aria-label="Walk forward" {...moveHandlers(1)}>
        ▲
      </button>
      <div />
      <button className={BTN} aria-label="Turn left" {...turnHandlers(-1)}>
        ◀
      </button>
      <button className={BTN} aria-label="Walk backward" {...moveHandlers(-1)}>
        ▼
      </button>
      <button className={BTN} aria-label="Turn right" {...turnHandlers(1)}>
        ▶
      </button>
    </div>
  );
}
