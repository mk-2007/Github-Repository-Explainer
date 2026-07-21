"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  SKILLS_SIZE,
  SKILLS_HALF,
  SKILLS_WALL_HEIGHT,
  SKILLS_ENTRANCE_Z,
  SKILLS_EXIT_WIDTH,
  SKILLS_EXIT_HEIGHT,
} from "./skillsLayout";
import { getCorridorDoorStand } from "@/components/scene/corridorLayout";
import { useSpaceStore } from "@/store/spaceStore";
import { useNewspaperTexture } from "@/components/scene/textures/useNewspaperTexture";

// Same floor anchor as every other space — "one building" cohesion.
const FLOOR_COLOR = "#16302a";
const CEILING_COLOR = "#141210";
const WALL_TINT = "#8f95a0"; // cooler tint than Home's warm WALL_TINT — study/archive mood
const WOOD_DARK = "#3c2817";
const WOOD_MID = "#5a4632";
const BOARD_COLOR = "#4a3f2e"; // corkboard-ish backing for the clippings

function ExitDoor() {
  function handleExitClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const spawn = getCorridorDoorStand("skills");
    useSpaceStore.getState().requestTransition("corridor", spawn);
  }

  return (
    <group position={[0, 0, SKILLS_ENTRANCE_Z - 0.02]} rotation={[0, Math.PI, 0]}>
      <mesh
        position={[0, SKILLS_EXIT_HEIGHT / 2, 0]}
        onClick={handleExitClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[SKILLS_EXIT_WIDTH, SKILLS_EXIT_HEIGHT, 0.08]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
      </mesh>
      <Html
        position={[0, SKILLS_EXIT_HEIGHT + 0.35, 0.05]}
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

/** A corkboard-style backing so each clipping has something physical to
 *  be pinned to, same role PanelFrame plays in the Home room. */
function Board({
  position,
  rotation,
  width,
  height,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[width, height, 0.06]} />
      <meshStandardMaterial color={BOARD_COLOR} roughness={0.95} />
    </mesh>
  );
}

/** One skill "clipping" — a slightly rotated, pinned newspaper-clipping
 *  look, per the architecture doc's "each skill cluster its own
 *  clipping" note. Content passed as children so this stays reusable. */
function Clipping({
  width,
  rotateDeg,
  eyebrow,
  title,
  children,
}: {
  width: number;
  rotateDeg: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative bg-[var(--color-paper)] text-[var(--color-ink)] px-6 py-5 select-none"
      style={{
        width,
        transform: `rotate(${rotateDeg}deg)`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      {/* Pushpin */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
        style={{ background: "var(--color-masthead)", boxShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
      />
      <p className="font-[family-name:var(--font-spirtush)] text-xs uppercase tracking-widest text-[var(--color-masthead)] mb-1">
        {eyebrow}
      </p>
      <h2 className="font-[family-name:var(--font-bacley)] text-2xl tracking-wide mb-3 whitespace-nowrap">
        {title}
      </h2>
      {children}
    </div>
  );
}

function AiMlClipping() {
  return (
    <Html position={[0, 2.1, -SKILLS_HALF + 0.15]} transform distanceFactor={3.6} occlude zIndexRange={[10, 0]}>
      <Clipping width={320} rotateDeg={-1.5} eyebrow="Active Focus Area" title="AI / ML">
        <p className="text-[13px] leading-relaxed text-[var(--color-ink)]/85">
          Currently the deepest well of attention — working through the
          fundamentals and applying them in real projects rather than
          just theory.
        </p>
      </Clipping>
    </Html>
  );
}

function LanguagesClipping() {
  return (
    <Html
      position={[-SKILLS_HALF + 0.15, 2.1, -1]}
      rotation={[0, Math.PI / 2, 0]}
      transform
      distanceFactor={3.6}
      occlude
      zIndexRange={[10, 0]}
    >
      <Clipping width={260} rotateDeg={1.2} eyebrow="Languages" title="Code In">
        <div className="flex gap-2">
          <span className="text-sm border border-[var(--color-ink)]/40 px-3 py-1.5">Python</span>
          <span className="text-sm border border-[var(--color-ink)]/40 px-3 py-1.5">C++</span>
        </div>
      </Clipping>
    </Html>
  );
}

function CompetitiveProgrammingClipping() {
  return (
    <Html
      position={[SKILLS_HALF - 0.15, 2.1, -1]}
      rotation={[0, -Math.PI / 2, 0]}
      transform
      distanceFactor={3.6}
      occlude
      zIndexRange={[10, 0]}
    >
      <Clipping width={300} rotateDeg={-1} eyebrow="Competitive Programming" title="The Roadmap">
        <ol className="text-[13px] leading-relaxed text-[var(--color-ink)]/85 list-decimal list-inside space-y-0.5">
          <li>Codeforces — Div 3/4 → Div 2</li>
          <li>CSES Problem Set</li>
          <li>cp-algorithms</li>
          <li>Striver&apos;s A2Z DSA Sheet</li>
        </ol>
        <p className="text-[13px] mt-3 pt-2 border-t border-[var(--color-ink)]/30 text-[var(--color-ink)]/85">
          + LeetCode, ongoing alongside it
        </p>
      </Clipping>
    </Html>
  );
}

/** A small bookshelf — a plank with a row of book-shaped boxes, the
 *  "study/archive" identity's main physical prop. */
function Bookshelf({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const bookColors = ["#7a2f2a", "#3f6b45", "#5a4632", "#7a5c1e", "#2c4a5e", "#5c2c4a"];
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {[0.9, 1.7, 2.5].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.5, 0.05, 0.34]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-0.65 + i * 0.16, y + 0.16, 0]} rotation={[0, 0, (i % 2) * 0.04]}>
              <boxGeometry args={[0.13, 0.3, 0.28]} />
              <meshStandardMaterial color={bookColors[i % bookColors.length]} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Side frames */}
      {[-0.78, 0.78].map((sx) => (
        <mesh key={sx} position={[sx, 1.5, 0]}>
          <boxGeometry args={[0.05, 3, 0.36]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Small desk lamp — the one warm focal light in an otherwise cooler
 *  room, same "something to look at" role Home's spotlight plays. */
function DeskLamp() {
  const lightRef = useRef<THREE.PointLight>(null);
  return (
    <group position={[0, 0, 1.6]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#2c241d" />
      </mesh>
      <mesh position={[0, 1.05, 0.12]} rotation={[0.6, 0, 0]}>
        <coneGeometry args={[0.16, 0.28, 12, 1, true]} />
        <meshStandardMaterial
          color="#d8a24a"
          emissive="#d8a24a"
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1.0, 0.15]} color="#ffcf9e" intensity={1.2} distance={4} decay={2} />
    </group>
  );
}

export default function SkillsRoom() {
  const wallTexture = useNewspaperTexture();

  const walls: { x: number; z: number; rotY: number; width: number }[] = [
    { x: 0, z: -SKILLS_HALF, rotY: 0, width: SKILLS_SIZE },
    { x: -SKILLS_HALF, z: 0, rotY: Math.PI / 2, width: SKILLS_SIZE },
    { x: SKILLS_HALF, z: 0, rotY: -Math.PI / 2, width: SKILLS_SIZE },
    { x: 0, z: SKILLS_HALF, rotY: Math.PI, width: SKILLS_SIZE },
  ];

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SKILLS_HALF * 2, SKILLS_HALF * 2]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={1} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, SKILLS_WALL_HEIGHT, 0]}>
        <planeGeometry args={[SKILLS_HALF * 2, SKILLS_HALF * 2]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={1} />
      </mesh>
      {/* Walls */}
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, SKILLS_WALL_HEIGHT / 2, w.z]} rotation={[0, w.rotY, 0]} receiveShadow>
          <planeGeometry args={[w.width, SKILLS_WALL_HEIGHT]} />
          <meshStandardMaterial
            map={wallTexture ?? undefined}
            color={wallTexture ? WALL_TINT : "#3a352d"}
            side={THREE.DoubleSide}
            roughness={0.95}
          />
        </mesh>
      ))}

      {/* Cooler study/archive lighting mood, distinct from Home's warm
          masthead spotlight — one warm desk lamp is the only "on
          display" focal light here. */}
      <ambientLight intensity={0.32} color="#b9c8d1" />
      <pointLight position={[0, 3.2, -2]} color="#cdd8de" intensity={0.7} distance={9} decay={2} />
      <DeskLamp />

      <Board position={[0, 2.1, -SKILLS_HALF + 0.1]} rotation={[0, 0, 0]} width={2.4} height={2} />
      <AiMlClipping />

      <Board position={[-SKILLS_HALF + 0.1, 2.1, -1]} rotation={[0, Math.PI / 2, 0]} width={2} height={1.8} />
      <LanguagesClipping />

      <Board position={[SKILLS_HALF - 0.1, 2.1, -1]} rotation={[0, -Math.PI / 2, 0]} width={2.2} height={1.9} />
      <CompetitiveProgrammingClipping />

      <Bookshelf x={-SKILLS_HALF + 0.9} z={2.3} rotY={Math.PI / 2} />
      <ExitDoor />
    </group>
  );
}
