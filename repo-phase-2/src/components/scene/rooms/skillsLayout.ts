/**
 * Skills room geometry. Same pattern as homeLayout.ts — one source of
 * truth for bounds/spawn/entrance so the room and Player.tsx can't drift
 * out of sync.
 */

export const SKILLS_SIZE = 8; // square room, x/z in [-4, 4]
export const SKILLS_HALF = SKILLS_SIZE / 2;
export const SKILLS_WALL_HEIGHT = 4;

export const SKILLS_ENTRANCE_Z = SKILLS_HALF;

const MARGIN = 0.5;
export const SKILLS_BOUNDS = {
  minX: -SKILLS_HALF + MARGIN,
  maxX: SKILLS_HALF - MARGIN,
  minZ: -SKILLS_HALF + MARGIN,
  maxZ: SKILLS_HALF - MARGIN,
};

// Just inside the entrance, facing into the room (yaw 0 -> forward -Z).
export const SKILLS_SPAWN = { x: 0, z: SKILLS_HALF - 1.4, yaw: 0 };

export const SKILLS_EXIT_WIDTH = 1.6;
export const SKILLS_EXIT_HEIGHT = 2.6;
