"use client";

import * as THREE from "three";
import {
  CORRIDOR_START_Z,
  CORRIDOR_END_Z,
  WALL_HEIGHT,
} from "../corridorLayout";

const CORRIDOR_LENGTH = CORRIDOR_END_Z - CORRIDOR_START_Z;

/**
 * Draws a newsprint-page texture onto a canvas, entirely procedurally -
 * no external image assets, so there's nothing to source or license.
 * Masthead band + multi-column "body text" (as bars, not real glyphs) +
 * occasional halftone photo blocks + faint paper grain.
 */
function drawHalftoneBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = "#d8d0bd";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#1a1714";
  const spacing = 7;
  for (let dy = 0; dy < h; dy += spacing) {
    for (let dx = 0; dx < w; dx += spacing) {
      const r = Math.random() * 2.2;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createNewspaperTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Paper base
  ctx.fillStyle = "#ece6d8";
  ctx.fillRect(0, 0, size, size);

  // Faint paper grain
  const grain = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    grain.data[i] = grain.data[i] + n;
    grain.data[i + 1] = grain.data[i + 1] + n;
    grain.data[i + 2] = grain.data[i + 2] + n;
  }
  ctx.putImageData(grain, 0, 0);

  // Masthead band
  ctx.fillStyle = "#1a1714";
  ctx.fillRect(40, 40, size - 80, 70);
  ctx.fillStyle = "#7a2620";
  ctx.fillRect(40, 118, size - 80, 4);
  ctx.fillStyle = "#ece6d8";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(70 + i * 260, 58, 190, 30);
  }

  // Body columns
  const colCount = 4;
  const colGap = 16;
  const colWidth = (size - 80 - colGap * (colCount - 1)) / colCount;
  const startY = 160;
  const endY = size - 60;

  for (let c = 0; c < colCount; c++) {
    const colX = 40 + c * (colWidth + colGap);
    let y = startY;

    ctx.fillStyle = "#1a1714";
    ctx.fillRect(colX, y, colWidth * (0.6 + Math.random() * 0.3), 14);
    y += 26;

    while (y < endY - 10) {
      if (Math.random() < 0.05 && y < endY - 100) {
        drawHalftoneBlock(ctx, colX, y, colWidth, 90);
        y += 104;
        continue;
      }
      ctx.fillStyle = "#4a453c";
      const lineWidth = colWidth * (0.7 + Math.random() * 0.3);
      ctx.fillRect(colX, y, lineWidth, 6);
      y += 12;
      if (Math.random() < 0.08) y += 10;
    }
  }

  // Column rules
  ctx.strokeStyle = "#1a1714";
  ctx.lineWidth = 1;
  for (let c = 1; c < colCount; c++) {
    const x = 40 + c * (colWidth + colGap) - colGap / 2;
    ctx.beginPath();
    ctx.moveTo(x, startY - 10);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Tile roughly every ~5 units horizontally, ~4 vertically so the "page"
  // reads as a repeating panel rather than one stretched image.
  texture.repeat.set(CORRIDOR_LENGTH / 5, WALL_HEIGHT / 4);
  return texture;
}
