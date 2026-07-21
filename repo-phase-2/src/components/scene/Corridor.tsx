"use client";

import { Html } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  CORRIDOR_WIDTH,
  CORRIDOR_START_Z,
  CORRIDOR_END_Z,
  WALL_HEIGHT,
  WALL_X,
  DOORS,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  DOOR_STAND_DISTANCE,
  PLAYER_BOUNDS,
  type RoomId,
} from "./corridorLayout";
import { usePlayerStore } from "@/store/playerStore";
import { useSpaceStore } from "@/store/spaceStore";
import { useNewspaperTexture } from "./textures/useNewspaperTexture";

const CORRIDOR_LENGTH = CORRIDOR_END_Z - CORRIDOR_START_Z;
const CORRIDOR_CENTER_Z = (CORRIDOR_START_Z + CORRIDOR_END_Z) / 2;

// Deep matte bottle-green — a calm, saturated anchor against the cream/ink
// newsprint walls, evoking an old reading-room floor rather than matching
// (or clashing with) the masthead red accent.
const FLOOR_COLOR = "#16302a";
const CEILING_COLOR = "#141210";
const FIXTURE_LIGHT_COLOR = "#ffcf9e"; // warm practicals

function Floor() {
  const setTarget = usePlayerStore((s) => s.setTarget);
  const setPendingEntry = useSpaceStore((s) => s.setPendingEntry);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const x = Math.min(
      PLAYER_BOUNDS.maxX,
      Math.max(PLAYER_BOUNDS.minX, e.point.x)
    );
    const z = Math.min(
      PLAYER_BOUNDS.maxZ,
      Math.max(PLAYER_BOUNDS.minZ, e.point.z)
    );
    setPendingEntry(null);
    setTarget([x, z]);
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, CORRIDOR_CENTER_Z]}
      onClick={handleClick}
      receiveShadow
    >
      <planeGeometry args={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} />
      <meshStandardMaterial color={FLOOR_COLOR} roughness={1} metalness={0} />
    </mesh>
  );
}

function Ceiling() {
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, WALL_HEIGHT, CORRIDOR_CENTER_Z]}
    >
      <planeGeometry args={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} />
      <meshStandardMaterial color={CEILING_COLOR} roughness={1} />
    </mesh>
  );
}

/** Small glowing fixture mesh so the overhead lighting has a visible source. */
function LightFixture({ z }: { z: number }) {
  return (
    <mesh position={[0, WALL_HEIGHT - 0.05, z]}>
      <boxGeometry args={[1.2, 0.06, 0.3]} />
      <meshStandardMaterial
        color={FIXTURE_LIGHT_COLOR}
        emissive={FIXTURE_LIGHT_COLOR}
        emissiveIntensity={1.4}
      />
    </mesh>
  );
}

const FIXTURE_POSITIONS = [-10, -4, 2, 8];

function Wall({
  side,
  texture,
}: {
  side: "left" | "right";
  texture: THREE.CanvasTexture | null;
}) {
  const x = side === "left" ? -WALL_X : WALL_X;
  const rotY = side === "left" ? Math.PI / 2 : -Math.PI / 2;

  return (
    <mesh
      position={[x, WALL_HEIGHT / 2, CORRIDOR_CENTER_Z]}
      rotation={[0, rotY, 0]}
      receiveShadow
    >
      <planeGeometry args={[CORRIDOR_LENGTH, WALL_HEIGHT]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? "#ffffff" : "#3a352d"}
        side={THREE.DoubleSide}
        roughness={0.9}
      />
    </mesh>
  );
}

function Door({
  id,
  label,
  side,
  z,
}: {
  id: RoomId;
  label: string;
  side: "left" | "right";
  z: number;
}) {
  const setTarget = usePlayerStore((s) => s.setTarget);
  const setPendingEntry = useSpaceStore((s) => s.setPendingEntry);
  const x = side === "left" ? -WALL_X + 0.02 : WALL_X - 0.02;
  const rotY = side === "left" ? Math.PI / 2 : -Math.PI / 2;

  function handleDoorClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const standX =
      side === "left"
        ? -WALL_X + DOOR_STAND_DISTANCE
        : WALL_X - DOOR_STAND_DISTANCE;
    const clampedX = Math.min(
      PLAYER_BOUNDS.maxX,
      Math.max(PLAYER_BOUNDS.minX, standX)
    );
    setPendingEntry(id);
    setTarget([clampedX, z]);
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
  }

  function handlePointerOut(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    document.body.style.cursor = "auto";
  }

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* Door slab - click to walk up to this door */}
      <mesh
        position={[0, DOOR_HEIGHT / 2, 0]}
        onClick={handleDoorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#5a4632" roughness={0.7} />
      </mesh>
      {/* Nameplate board */}
      <Html
        position={[0, DOOR_HEIGHT + 0.35, 0.05]}
        center
        distanceFactor={8}
        occlude
        zIndexRange={[10, 0]}
      >
        <div className="font-[family-name:var(--font-bacley)] text-lg tracking-widest px-3 py-1 bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-ink)]/30 whitespace-nowrap select-none">
          {label}
        </div>
      </Html>
    </group>
  );
}

export default function Corridor() {
  const wallTexture = useNewspaperTexture();

  return (
    <group>
      {/* Dim, warm overhead practicals — pools of light between doors, per
          the architecture doc's "archive hallway" mood. Owned here, not
          in SceneRoot, so each space carries its own lighting mood. */}
      <ambientLight intensity={0.28} />
      <directionalLight position={[4, 8, -6]} intensity={0.5} castShadow shadow-mapSize={[1024, 1024]} />
      {FIXTURE_POSITIONS.map((z) => (
        <pointLight key={`light-${z}`} position={[0, 3.5, z]} color={FIXTURE_LIGHT_COLOR} intensity={1.1} distance={7} decay={2} />
      ))}
      <Floor />
      <Ceiling />
      <Wall side="left" texture={wallTexture} />
      <Wall side="right" texture={wallTexture} />
      {FIXTURE_POSITIONS.map((z) => (
        <LightFixture key={z} z={z} />
      ))}
      {DOORS.map((d) => (
        <Door key={d.id} id={d.id} label={d.label} side={d.side} z={d.z} />
      ))}
    </group>
  );
}
