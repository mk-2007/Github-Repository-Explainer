#!/usr/bin/env node
/**
 * Converts a Mixamo FBX export to GLB, so we can load it with drei's
 * useGLTF instead of dealing with FBX loading (and instead of needing Blender
 * just to change file format). Uses the FBX2glTF binary bundled inside the
 * fbx2gltf npm package - no separate download step.
 *
 * Usage:
 *   node scripts/convert-fbx.js <input.fbx> <output.glb>
 *
 * Example:
 *   node scripts/convert-fbx.js downloads/idle.fbx public/models/character-idle.glb
 */
const convert = require("fbx2gltf");
const path = require("path");
const fs = require("fs");

const [, , input, output] = process.argv;

if (!input || !output) {
  console.error("Usage: node scripts/convert-fbx.js <input.fbx> <output.glb>");
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });

convert(input, output)
  .then((result) => {
    console.log(`Converted -> ${result}`);
  })
  .catch((err) => {
    console.error("Conversion failed:", err.message);
    process.exit(1);
  });
