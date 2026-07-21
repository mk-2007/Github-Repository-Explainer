/**
 * Home room geometry. Same "single source of truth" pattern as
 * corridorLayout.ts — floor/walls/exit-door/bounds all read from here so
 * they can't drift out of sync with each other.
 */

export const HOME_SIZE = 8; // square room, x/z in [-4, 4]
export const HOME_HALF = HOME_SIZE / 2;
export const HOME_WALL_HEIGHT = 4;

// Entrance/exit is the wall you spawn facing away from — the +Z wall.
export const HOME_ENTRANCE_Z = HOME_HALF;

const MARGIN = 0.5;
export const HOME_BOUNDS = {
  minX: -HOME_HALF + MARGIN,
  maxX: HOME_HALF - MARGIN,
  minZ: -HOME_HALF + MARGIN,
  maxZ: HOME_HALF - MARGIN,
};

// Just inside the entrance, facing into the room (yaw 0 -> forward -Z).
export const HOME_SPAWN = { x: 0, z: HOME_HALF - 1.4, yaw: 0 };

export const HOME_EXIT_WIDTH = 1.6;
export const HOME_EXIT_HEIGHT = 2.6;
