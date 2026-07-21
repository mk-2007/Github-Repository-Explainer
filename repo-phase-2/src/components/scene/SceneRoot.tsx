"use client";

import { Canvas } from "@react-three/fiber";
import Corridor from "./Corridor";
import HomeRoom from "./rooms/HomeRoom";
import SkillsRoom from "./rooms/SkillsRoom";
import Player from "./Player";
import TransitionOverlay from "./TransitionOverlay";
import SceneErrorBoundary from "./SceneErrorBoundary";
import { useSpaceStore } from "@/store/spaceStore";
import { SPAWN_POSITION, EYE_HEIGHT } from "./corridorLayout";

/**
 * The persistent 3D root — one Canvas for the whole visit, corridor and
 * every room included. Swapping `space` swaps which group renders inside
 * it instead of mounting a new Canvas, so there's never a WebGL context
 * re-init or asset reload between spaces, just the fade in
 * TransitionOverlay masking the swap.
 *
 * Each space is wrapped in its own SceneErrorBoundary — a bug in one
 * room can't take down the whole Canvas (Player/lighting keep running),
 * and it surfaces to a visible banner instead of an unexplained blank
 * screen (see renderErrorStore.ts / RenderErrorBanner.tsx).
 */
export default function SceneRoot() {
  const space = useSpaceStore((s) => s.space);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [SPAWN_POSITION[0], EYE_HEIGHT, SPAWN_POSITION[2]],
          fov: 60,
        }}
      >
        {/* Explicit scene background - the canvas is transparent by default,
            so without this any part of the frustum not covered by geometry
            shows through to the page background instead of staying "in world." */}
        <color attach="background" args={["#0d0c0a"]} />
        {space === "corridor" && (
          <SceneErrorBoundary label="corridor">
            <Corridor />
          </SceneErrorBoundary>
        )}
        {space === "home" && (
          <SceneErrorBoundary label="home">
            <HomeRoom />
          </SceneErrorBoundary>
        )}
        {space === "skills" && (
          <SceneErrorBoundary label="skills">
            <SkillsRoom />
          </SceneErrorBoundary>
        )}
        <Player />
      </Canvas>
      <TransitionOverlay />
    </div>
  );
}
