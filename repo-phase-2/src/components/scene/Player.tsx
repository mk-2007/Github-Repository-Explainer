"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/playerStore";
import { useControlsStore } from "@/store/controlsStore";
import { useSpaceStore, type Space } from "@/store/spaceStore";
import { SPAWN_POSITION, PLAYER_BOUNDS, EYE_HEIGHT, type RoomId } from "./corridorLayout";
import { HOME_BOUNDS, HOME_SPAWN } from "./rooms/homeLayout";
import { SKILLS_BOUNDS, SKILLS_SPAWN } from "./rooms/skillsLayout";
import Hand from "./character/Hand";

const WALK_SPEED = 3.5; // units/sec, click-to-walk
const MANUAL_MOVE_SPEED = 3; // units/sec, D-pad/keyboard forward-back
const MANUAL_TURN_SPEED = 2.4; // rad/sec, D-pad/keyboard turning
const ARRIVE_THRESHOLD = 0.05;
const TURN_SPEED = 6; // click-to-walk auto-face turn rate

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

// Per-space floor-clamp bounds. Rooms without an entry here (not built
// yet) simply aren't reachable, so they never need one until they exist.
const BOUNDS_FOR: Partial<Record<Space, Bounds>> = {
  corridor: PLAYER_BOUNDS,
  home: HOME_BOUNDS,
  skills: SKILLS_BOUNDS,
};

// Default spawn if a space is entered with no explicit pendingSpawn
// queued (covers first mount, and any direct/dev navigation to a space).
const DEFAULT_SPAWN_FOR: Record<Space, { x: number; z: number; yaw: number }> = {
  corridor: { x: SPAWN_POSITION[0], z: SPAWN_POSITION[2], yaw: Math.PI },
  home: HOME_SPAWN,
  skills: SKILLS_SPAWN,
  projects: HOME_SPAWN, // placeholder until Projects room exists — unreachable for now
  about: HOME_SPAWN,
};

// Where walking into a given door's arrival point should take you. Rooms
// not listed here just stop the player at the door — that's "not built
// yet," not a bug.
const ENTRY_SPAWN_FOR: Partial<Record<RoomId, { x: number; z: number; yaw: number }>> = {
  home: HOME_SPAWN,
  skills: SKILLS_SPAWN,
};

function boundsFor(space: Space): Bounds {
  return BOUNDS_FOR[space] ?? PLAYER_BOUNDS;
}

/**
 * The camera IS the visitor (first-person). Two things drive it:
 *   1. Manual — D-pad/keyboard (controlsStore.turn/move). Free rotation
 *      and forward/back movement.
 *   2. Click-to-walk — click a floor/door point (playerStore.target).
 * Manual input always wins when active, clearing any pending click
 * target so the two never fight.
 *
 * Room transitions: a door click in Corridor.tsx sets both a walk target
 * AND spaceStore.pendingEntry. When the walk *arrives*, this component
 * checks pendingEntry and — if that room exists in ENTRY_SPAWN_FOR —
 * kicks off a space transition. That arrival-gate is what makes it
 * "walk into the door" rather than "click door, teleport."
 */
export default function Player() {
  const target = usePlayerStore((s) => s.target);
  const clearTarget = usePlayerStore((s) => s.clearTarget);
  const space = useSpaceStore((s) => s.space);
  const { camera } = useThree();

  const posRef = useRef(new THREE.Vector3());
  const yawRef = useRef(0);

  // Runs on mount AND whenever `space` changes (corridor<->room). Reads
  // whatever spawn the transition queued (or a sane default) and snaps
  // the camera there before paint — the fade overlay is covering this.
  useLayoutEffect(() => {
    const spawn = useSpaceStore.getState().consumeSpawn() ?? DEFAULT_SPAWN_FOR[space];
    posRef.current.set(spawn.x, EYE_HEIGHT, spawn.z);
    yawRef.current = spawn.yaw;
    camera.position.copy(posRef.current);
    camera.rotation.set(0, spawn.yaw, 0);
  }, [space, camera]);

  useFrame((_, delta) => {
    const pos = posRef.current;
    const bounds = boundsFor(space);
    // Read every frame without subscribing — this store changes ~every
    // frame while a button/key is held, so a React subscription here
    // would mean a re-render per frame. getState() sidesteps that.
    const { turn, move } = useControlsStore.getState();
    const manualActive = turn !== 0 || move !== 0;

    if (manualActive) {
      if (usePlayerStore.getState().target) clearTarget();
      useSpaceStore.getState().setPendingEntry(null);

      yawRef.current += turn * MANUAL_TURN_SPEED * delta;

      if (move !== 0) {
        // Default three.js camera forward is -Z; this is that vector
        // rotated by the current yaw (see the click-to-walk yaw solve
        // below for the same relationship in reverse).
        const forwardX = -Math.sin(yawRef.current);
        const forwardZ = -Math.cos(yawRef.current);
        const step = MANUAL_MOVE_SPEED * move * delta;
        pos.x = THREE.MathUtils.clamp(pos.x + forwardX * step, bounds.minX, bounds.maxX);
        pos.z = THREE.MathUtils.clamp(pos.z + forwardZ * step, bounds.minZ, bounds.maxZ);
      }
    } else if (target) {
      const [tx, tz] = target;
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < ARRIVE_THRESHOLD) {
        clearTarget();

        const pendingEntry = useSpaceStore.getState().pendingEntry;
        if (pendingEntry) {
          const spawn = ENTRY_SPAWN_FOR[pendingEntry];
          if (spawn) {
            useSpaceStore.getState().requestTransition(pendingEntry, spawn);
          } else {
            useSpaceStore.getState().setPendingEntry(null);
          }
        }
      } else {
        const step = Math.min(dist, WALK_SPEED * delta);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        // Solves -sin(yaw)=dx/dist, -cos(yaw)=dz/dist for the yaw that
        // makes the camera's forward (-Z) point at (dx, dz).
        yawRef.current = Math.atan2(-dx, -dz);
      }
    }

    camera.position.set(pos.x, EYE_HEIGHT, pos.z);

    // Shortest-path turn via quaternion slerp — avoids the wraparound
    // snap a raw rotation.y lerp would do when crossing +-PI.
    const targetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, yawRef.current, 0)
    );
    camera.quaternion.slerp(targetQuat, Math.min(1, TURN_SPEED * delta));
  });

  return <Hand />;
}
