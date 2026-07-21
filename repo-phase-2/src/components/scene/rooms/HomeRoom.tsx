"use client";

import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  HOME_SIZE,
  HOME_HALF,
  HOME_WALL_HEIGHT,
  HOME_ENTRANCE_Z,
  HOME_EXIT_WIDTH,
  HOME_EXIT_HEIGHT,
} from "./homeLayout";
import { getCorridorDoorStand } from "@/components/scene/corridorLayout";
import { useSpaceStore } from "@/store/spaceStore";
import { useNewspaperTexture } from "@/components/scene/textures/useNewspaperTexture";

// Same anchor floor color as the corridor so the building reads as one
// place, per the architecture doc's "muted/desaturated, carried into
// rooms" note — walls get a muted tint of the same newsprint texture.
const FLOOR_COLOR = "#16302a";
const CEILING_COLOR = "#141210";
const WALL_TINT = "#9a9484"; // dims/desaturates the newsprint map for the "inside the building" wall version
const WOOD_DARK = "#3c2817";
const WOOD_MID = "#5a4632";

function ExitDoor() {
  function handleExitClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const spawn = getCorridorDoorStand("home");
    useSpaceStore.getState().requestTransition("corridor", spawn);
  }

  return (
    <group position={[0, 0, HOME_ENTRANCE_Z - 0.02]} rotation={[0, Math.PI, 0]}>
      <mesh
        position={[0, HOME_EXIT_HEIGHT / 2, 0]}
        onClick={handleExitClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[HOME_EXIT_WIDTH, HOME_EXIT_HEIGHT, 0.08]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
      </mesh>
      <Html
        position={[0, HOME_EXIT_HEIGHT + 0.35, 0.05]}
        center
        distanceFactor={8}
        occlude
        zIndexRange={[10, 0]}
      >
        <div className="font-[family-name:var(--font-bacley)] text-lg tracking-widest px-3 py-1 bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-ink)]/30 whitespace-nowrap select-none">
          EXIT
        </div>
      </Html>
    </group>
  );
}

/** The wall-mounted noticeboard the front page sits in — gives the Html
 *  panel something physical to be "in" instead of floating in mid-air. */
function PanelFrame() {
  return (
    <group position={[0, 2.05, -HOME_HALF + 0.14]}>
      <mesh>
        <boxGeometry args={[3.7, 2.85, 0.08]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      {/* Inner bevel so it reads as a frame, not a solid block */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[3.5, 2.65, 0.04]} />
        <meshStandardMaterial color="#221609" roughness={0.9} />
      </mesh>
    </group>
  );
}

function MastheadPanel() {
  return (
    <Html
      position={[0, 2.05, -HOME_HALF + 0.17]}
      transform
      distanceFactor={3.9}
      occlude
      zIndexRange={[10, 0]}
    >
      <div
        className="w-[660px] bg-[var(--color-paper)] text-[var(--color-ink)] px-9 py-7 select-none"
        style={{ boxShadow: "0 14px 44px rgba(0,0,0,0.55)" }}
      >
        {/* Masthead strip */}
        <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase text-[var(--color-ink)]/55 pb-2 border-b border-[var(--color-ink)]/30">
          <span>Karachi Edition</span>
          <span>Personal Dispatch, No. 1</span>
        </div>

        <h1 className="font-[family-name:var(--font-bacley)] text-center text-[3.4rem] leading-none tracking-wide pt-3 whitespace-nowrap">
          MAHANDAR KUMAR
        </h1>
        <p className="font-[family-name:var(--font-spirtush)] text-center text-2xl text-[var(--color-masthead)] pt-1 pb-3 border-b-2 border-[var(--color-ink)]">
          Living to lead a change
        </p>

        <div className="grid grid-cols-[1fr_190px] gap-6 pt-5">
          {/* Lead column, drop-cap intro */}
          <div className="text-[14.5px] leading-relaxed text-[var(--color-ink)]/90">
            <p>
              <span className="float-left font-[family-name:var(--font-bacley)] text-[3.6rem] leading-[0.75] pr-2 pt-1">
                B
              </span>
              SCS student at FAST&#8209;NUCES Karachi, building things at the
              intersection of software development, applied AI/ML, and
              competitive problem&#8209;solving. Most days split between
              shipping something real and sharpening how fast a hard
              problem gets solved.
            </p>
          </div>

          {/* Sidebar */}
          <div className="border-l border-[var(--color-ink)]/30 pl-5">
            <p className="font-[family-name:var(--font-bacley)] text-[11px] tracking-widest uppercase text-[var(--color-ink)]/55 mb-2">
              Currently Focused On
            </p>
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-[13px] border border-[var(--color-ink)]/40 px-2 py-1 text-center">
                Software Dev
              </span>
              <span className="text-[13px] border border-[var(--color-ink)]/40 px-2 py-1 text-center">
                AI / ML
              </span>
              <span className="text-[13px] border border-[var(--color-ink)]/40 px-2 py-1 text-center leading-tight">
                Competitive
                <br />
                Programming
              </span>
            </div>
            <p className="font-[family-name:var(--font-bacley)] text-[11px] tracking-widest uppercase text-[var(--color-ink)]/55 mb-1">
              Credentials
            </p>
            <p className="text-[13px]">BSCS, FAST-NUCES Karachi</p>
          </div>
        </div>

        {/* Footer nav hint — points at the other three doors */}
        <div className="flex items-center justify-center gap-3 mt-6 pt-3 border-t border-[var(--color-ink)]/30 text-[11px] tracking-[0.22em] uppercase text-[var(--color-ink)]/50">
          <span>Skills</span>
          <span>&#10022;</span>
          <span>Projects</span>
          <span>&#10022;</span>
          <span>About</span>
        </div>
      </div>
    </Html>
  );
}

/** Thematic window — a static "outside" backdrop, not a functional view. */
function Window() {
  return (
    <group position={[HOME_HALF - 0.03, 2.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[1.6, 1.6]} />
        <meshStandardMaterial color="#7a6a52" emissive="#3a3020" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color="#1c2a30" emissive="#243d44" emissiveIntensity={0.6} />
      </mesh>
      {/* Mullions */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.5, 0.05, 0.02]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.5, 0.05, 0.02]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
    </group>
  );
}

/** A stack of bound "back issues" — low-poly boxes, flanking one side of
 *  the panel so it doesn't sit alone against a bare wall. */
function PaperStack({ x }: { x: number }) {
  const heights = [0.09, 0.085, 0.095, 0.08];
  let y = 0;
  return (
    <group position={[x, 0, -HOME_HALF + 0.6]}>
      {heights.map((h, i) => {
        const yy = y + h / 2;
        y += h;
        return (
          <mesh key={i} position={[0, yy, 0]} rotation={[0, i * 0.15, 0]} castShadow>
            <boxGeometry args={[0.42, h, 0.3]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#d8cfae" : "#c9bf9c"} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A simple potted plant — cylinder pot + cluster of cone "leaves" — for
 *  a lived-in touch on the other side of the panel. */
function Plant({ x }: { x: number }) {
  return (
    <group position={[x, 0, -HOME_HALF + 0.65]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.36, 10]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.3) * 0.08, 0.5 + i * 0.07, Math.cos(i * 1.3) * 0.08]}
          rotation={[0.15, i, 0.1]}
          castShadow
        >
          <coneGeometry args={[0.14, 0.42, 6]} />
          <meshStandardMaterial color="#3f6b45" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A small round rug under the panel, warmer than the bare floor —
 *  visually anchors the "this is the space you look at" area. */
function Rug() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -HOME_HALF + 1.4]}>
      <circleGeometry args={[1.7, 32]} />
      <meshStandardMaterial color="#7a2f2a" roughness={1} />
    </mesh>
  );
}

/** Wiring a spotLight's target via `target-position` alone doesn't work
 *  unless that target object is actually in the scene graph (its
 *  matrixWorld never updates otherwise) — so this mounts a real
 *  Object3D as the target and assigns it explicitly. */
function PanelSpotlight() {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <spotLight
        ref={lightRef}
        position={[0, 3.6, -1.5]}
        angle={0.5}
        penumbra={0.6}
        intensity={2.2}
        color="#fff1d8"
        distance={8}
        decay={2}
      />
      <object3D ref={targetRef} position={[0, 2, -HOME_HALF]} />
    </>
  );
}

export default function HomeRoom() {
  const wallTexture = useNewspaperTexture();

  const walls: { x: number; z: number; rotY: number; width: number }[] = [
    { x: 0, z: -HOME_HALF, rotY: 0, width: HOME_SIZE }, // back wall (masthead)
    { x: -HOME_HALF, z: 0, rotY: Math.PI / 2, width: HOME_SIZE }, // left
    { x: HOME_HALF, z: 0, rotY: -Math.PI / 2, width: HOME_SIZE }, // right (window sits on this one)
    { x: 0, z: HOME_HALF, rotY: Math.PI, width: HOME_SIZE }, // front/entrance wall
  ];

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HOME_HALF * 2, HOME_HALF * 2]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={1} />
      </mesh>
      <Rug />
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HOME_WALL_HEIGHT, 0]}>
        <planeGeometry args={[HOME_HALF * 2, HOME_HALF * 2]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={1} />
      </mesh>
      {/* Walls */}
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, HOME_WALL_HEIGHT / 2, w.z]} rotation={[0, w.rotY, 0]} receiveShadow>
          <planeGeometry args={[w.width, HOME_WALL_HEIGHT]} />
          <meshStandardMaterial
            map={wallTexture ?? undefined}
            color={wallTexture ? WALL_TINT : "#3a352d"}
            side={THREE.DoubleSide}
            roughness={0.95}
          />
        </mesh>
      ))}

      {/* Warm hero-panel lighting — distinct mood from the corridor's dim
          practicals. A spotlight puts the panel "on display" rather than
          just evenly lit like the rest of the room. */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 3, -2.5]} color="#ffe2b8" intensity={1.1} distance={9} decay={2} />
      <pointLight position={[0, 3, 2]} color="#ffcf9e" intensity={0.5} distance={7} decay={2} />
      <PanelSpotlight />

      <PanelFrame />
      <MastheadPanel />
      <PaperStack x={-2.6} />
      <Plant x={2.6} />
      <Window />
      <ExitDoor />
    </group>
  );
}
