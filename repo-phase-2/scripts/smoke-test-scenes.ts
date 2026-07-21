/**
 * Headless render smoke test.
 *
 * tsc/eslint/next-build only check types and syntax — none of them
 * actually execute the React Three Fiber render tree, so a thrown
 * runtime error inside a room (bad geometry args, a null ref access, an
 * invalid `attach` target, etc.) sails straight through all three and
 * only shows up as a blank/black Canvas in an actual browser.
 *
 * This script sets up a minimal jsdom + canvas-context stub, then uses
 * @react-three/test-renderer to genuinely mount each space with the real
 * R3F reconciler and catch anything that throws.
 *
 * Two passes:
 *   1. Each space mounted standalone in its own root.
 *   2. The persistent-root SWAP sequence SceneRoot.tsx actually uses in
 *      production (one root, children swapped in place) — this is the
 *      pass that matters most, since a standalone mount can pass while
 *      the swap sequence still breaks (found exactly this once already).
 *
 * Run: npx tsx scripts/smoke-test-scenes.ts
 */
import { JSDOM } from "jsdom";

// --- Minimal browser-shaped globals, before any app module is imported ---
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
});
const { window } = dom;

// A "black hole" mock CanvasRenderingContext2D: every property read is
// callable and chainable, every call returns another black hole, every
// assignment is accepted silently. Good enough for our procedural
// newsprint-texture drawing code to run to completion without a real
// native canvas backend (which isn't installable in this sandbox).
function blackHole(): unknown {
  const fn = (..._args: unknown[]) => blackHole();
  return new Proxy(fn, {
    get: (_t, prop) => {
      if (prop === "then" || prop === "canvas") return undefined;
      if (prop === Symbol.toPrimitive) return (hint: string) => (hint === "number" ? 0 : "");
      if (prop === "valueOf") return () => 0;
      if (prop === "toString") return () => "";
      if (prop === "width" || prop === "height") return 0;
      return blackHole();
    },
    set: () => true,
  });
}
type MockableCanvas = { getContext: () => unknown };
(window.HTMLCanvasElement.prototype as unknown as MockableCanvas).getContext = () => blackHole();

Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  HTMLCanvasElement: window.HTMLCanvasElement,
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

const BENIGN = /not configured to support act|overlapping act\(\) calls/;

/** Runs `fn`, capturing console.error + reportError, filtering the
 *  known-benign test-harness act() warnings, and returns whatever real
 *  errors were logged (empty array = clean). */
async function withErrorCapture<T>(fn: () => Promise<T>): Promise<{ result: T; errors: unknown[] }> {
  const captured: unknown[] = [];
  const origError = console.error;
  const origReportError = globalThis.reportError;
  console.error = (...args: unknown[]) => {
    captured.push(args);
    origError(...args);
  };
  globalThis.reportError = (err: unknown) => {
    captured.push([err]);
    if (origReportError) origReportError(err);
  };
  try {
    const result = await fn();
    const errors = captured.filter((e) => !BENIGN.test(String((e as unknown[])[0])));
    return { result, errors };
  } finally {
    console.error = origError;
    globalThis.reportError = origReportError;
  }
}

// Imports MUST come after the globals above are in place - several of
// these modules check `typeof document` at module scope.
async function main() {
  const React = await import("react");
  const ReactThreeTestRenderer = (await import("@react-three/test-renderer")).default;
  const { default: Corridor } = await import("../src/components/scene/Corridor");
  const { default: HomeRoom } = await import("../src/components/scene/rooms/HomeRoom");
  const { default: SkillsRoom } = await import("../src/components/scene/rooms/SkillsRoom");

  let failures = 0;

  // --- Pass 1: standalone mounts ---
  console.log("--- Pass 1: standalone mounts ---");
  const standalone: [string, React.ComponentType][] = [
    ["Corridor", Corridor],
    ["HomeRoom", HomeRoom],
    ["SkillsRoom", SkillsRoom],
  ];
  for (const [name, Comp] of standalone) {
    const { result, errors } = await withErrorCapture(async () => {
      const renderer = await ReactThreeTestRenderer.create(React.createElement(Comp));
      await renderer.advanceFrames(2, 16);
      const childCount = renderer.scene.children.length;
      await renderer.unmount();
      return childCount;
    });
    if (result === 0 || errors.length > 0) {
      failures++;
      console.error(`FAIL  ${name} — ${result} children; errors:`, errors);
    } else {
      console.log(`PASS  ${name} — ${result} top-level children`);
    }
  }

  // --- Pass 2: the real swap sequence, one persistent root ---
  console.log("\n--- Pass 2: persistent-root swap (mirrors SceneRoot.tsx) ---");
  const sequence: [string, React.ComponentType][] = [
    ["corridor (initial)", Corridor],
    ["-> home", HomeRoom],
    ["-> corridor", Corridor],
    ["-> skills", SkillsRoom],
    ["-> corridor", Corridor],
  ];
  const { errors: seqErrors } = await withErrorCapture(async () => {
    const renderer = await ReactThreeTestRenderer.create(React.createElement(sequence[0][1]));
    await renderer.advanceFrames(1, 16);
    console.log(`  ${sequence[0][0]}: children=${renderer.scene.children.length}`);
    if (renderer.scene.children.length === 0) failures++;

    for (const [label, Comp] of sequence.slice(1)) {
      await renderer.update(React.createElement(Comp));
      await renderer.advanceFrames(1, 16);
      const n = renderer.scene.children.length;
      console.log(`  ${label}: children=${n}`);
      if (n === 0) failures++;
    }
    await renderer.unmount();
  });
  if (seqErrors.length > 0) {
    failures++;
    console.error("FAIL  swap sequence logged errors:", seqErrors);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll scenes and the full swap sequence rendered cleanly.");
  }
}

main();
