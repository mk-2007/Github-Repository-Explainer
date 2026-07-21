/**
 * Shared corridor geometry constants. Single source of truth so the floor,
 * walls, doors, and player-bounds clamping never drift out of sync.
 */

export const CORRIDOR_WIDTH = 6; // x: -3 to +3
export const CORRIDOR_HALF_WIDTH = CORRIDOR_WIDTH / 2;
export const CORRIDOR_START_Z = -14; // entrance / spawn end
export const CORRIDOR_END_Z = 12; // far end
export const WALL_HEIGHT = 4;
export const WALL_X = CORRIDOR_HALF_WIDTH; // walls sit at x = ±WALL_X

// Keep the player from walking into geometry — a small margin inside the walls.
export const PLAYER_MARGIN = 0.5;
export const PLAYER_BOUNDS = {
  minX: -CORRIDOR_HALF_WIDTH + PLAYER_MARGIN,
  maxX: CORRIDOR_HALF_WIDTH - PLAYER_MARGIN,
  minZ: CORRIDOR_START_Z + PLAYER_MARGIN,
  maxZ: CORRIDOR_END_Z - PLAYER_MARGIN,
};

export const SPAWN_POSITION: [number, number, number] = [0, 0, CORRIDOR_START_Z + 1.5];

// Phase 5: navigation is first-person (camera = the visitor). No body to
// place at ground level anymore, so this is the one number that matters —
// how tall the "visitor" stands.
export const EYE_HEIGHT = 1.6;

export type DoorSide = "left" | "right";

export interface DoorDef {
  id: "home" | "skills" | "projects" | "about";
  label: string;
  side: DoorSide;
  z: number; // position along the corridor
}

// Alternating left/right, Home closest to spawn, About furthest — per the
// architecture doc's proposed order (open item, revisit if it feels wrong in-scene).
export const DOORS: DoorDef[] = [
  { id: "home", label: "HOME", side: "left", z: -8 },
  { id: "skills", label: "SKILLS", side: "right", z: -2 },
  { id: "projects", label: "PROJECTS", side: "left", z: 4 },
  { id: "about", label: "ABOUT", side: "right", z: 10 },
];

export const DOOR_WIDTH = 1.6;
export const DOOR_HEIGHT = 2.6;
export const DOOR_STAND_DISTANCE = 1.3; // how far into the corridor the player stops when walking to a door

export type RoomId = DoorDef["id"];

/**
 * Where the player should land, and which way they should face, when
 * exiting a room back into the corridor at the door they entered from —
 * same math Corridor.tsx's door-click handler uses, so arriving and
 * leaving a door put you in the same spot.
 */
export function getCorridorDoorStand(id: RoomId): {
  x: number;
  z: number;
  yaw: number;
} {
  const door = DOORS.find((d) => d.id === id);
  if (!door) throw new Error(`Unknown door id: ${id}`);

  const rawX =
    door.side === "left"
      ? -WALL_X + DOOR_STAND_DISTANCE
      : WALL_X - DOOR_STAND_DISTANCE;
  const x = Math.min(PLAYER_BOUNDS.maxX, Math.max(PLAYER_BOUNDS.minX, rawX));

  // Face away from the wall, into the corridor: left wall -> +X, right wall -> -X.
  // (yaw solves -sin(yaw)=forwardX, -cos(yaw)=0 for a camera whose forward is -Z.)
  const yaw = door.side === "left" ? -Math.PI / 2 : Math.PI / 2;

  return { x, z: door.z, yaw };
}
