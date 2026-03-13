/**
 * 3D Tetromino piece definitions
 * Based on the reference image showing various 3D block shapes:
 * - Single cube (white/gray)
 * - 2-cube domino (white)
 * - L-tromino (black/dark)
 * - I-bar 3 (yellow)
 * - T-shape (green)
 * - S/Z shapes (red, blue)
 * - L-shapes (orange)
 * - Standard tetris I, O, T, S, Z, L, J extended to 3D
 *
 * Each piece is defined as an array of [x, y, z] offsets from origin
 * Colors are vivid and slightly metallic for the space theme
 */

export interface PieceDef {
  name: string;
  blocks: [number, number, number][];
  color: [number, number, number]; // RGB 0-1
}

// All piece definitions - a mix of classic tetris + 3D extensions
export const PIECES: PieceDef[] = [
  // === Classic 2D Tetrominos (flat, z=0) ===
  {
    name: "I",
    blocks: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]],
    color: [0.2, 0.85, 0.95], // Cyan
  },
  {
    name: "O",
    blocks: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
    color: [0.95, 0.85, 0.15], // Yellow
  },
  {
    name: "T",
    blocks: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]],
    color: [0.7, 0.2, 0.9], // Purple
  },
  {
    name: "S",
    blocks: [[1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0]],
    color: [0.2, 0.85, 0.3], // Green
  },
  {
    name: "Z",
    blocks: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]],
    color: [0.95, 0.2, 0.2], // Red
  },
  {
    name: "L",
    blocks: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]],
    color: [0.95, 0.55, 0.1], // Orange
  },
  {
    name: "J",
    blocks: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]],
    color: [0.2, 0.4, 0.95], // Blue
  },

  // === 3D Extended Pieces (use z-axis) ===
  {
    name: "3D-L",
    blocks: [[0, 0, 0], [1, 0, 0], [1, 0, 1]],
    color: [0.95, 0.55, 0.1], // Orange 3D
  },
  {
    name: "3D-T",
    blocks: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1]],
    color: [0.2, 0.85, 0.3], // Green 3D
  },
  {
    name: "3D-S",
    blocks: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [2, 0, 1]],
    color: [0.2, 0.4, 0.95], // Blue 3D
  },
  {
    name: "3D-Corner",
    blocks: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
    color: [0.15, 0.15, 0.15], // Dark/Black
  },
  {
    name: "3D-Tower",
    blocks: [[0, 0, 0], [0, 1, 0], [0, 2, 0]],
    color: [0.85, 0.85, 0.9], // White/Silver
  },
];

/**
 * Rotate a piece's blocks around the Y axis (90 degrees)
 */
export function rotateBlocksY(blocks: [number, number, number][]): [number, number, number][] {
  // Find center
  let cx = 0, cz = 0;
  for (const b of blocks) { cx += b[0]; cz += b[2]; }
  cx /= blocks.length; cz /= blocks.length;

  return blocks.map(([x, y, z]) => {
    const rx = z - cz;
    const rz = -(x - cx);
    return [Math.round(rx + cx), y, Math.round(rz + cz)] as [number, number, number];
  });
}

/**
 * Rotate a piece's blocks around the X axis (90 degrees)
 */
export function rotateBlocksX(blocks: [number, number, number][]): [number, number, number][] {
  let cy = 0, cz = 0;
  for (const b of blocks) { cy += b[1]; cz += b[2]; }
  cy /= blocks.length; cz /= blocks.length;

  return blocks.map(([x, y, z]) => {
    const ry = -(z - cz);
    const rz = y - cy;
    return [x, Math.round(ry + cy), Math.round(rz + cz)] as [number, number, number];
  });
}

/**
 * Rotate a piece's blocks around the Z axis (90 degrees)
 */
export function rotateBlocksZ(blocks: [number, number, number][]): [number, number, number][] {
  let cx = 0, cy = 0;
  for (const b of blocks) { cx += b[0]; cy += b[1]; }
  cx /= blocks.length; cy /= blocks.length;

  return blocks.map(([x, y, z]) => {
    const rx = y - cy;
    const ry = -(x - cx);
    return [Math.round(rx + cx), Math.round(ry + cy), z] as [number, number, number];
  });
}

/**
 * Normalize blocks so minimum x, y, z are all 0
 */
export function normalizeBlocks(blocks: [number, number, number][]): [number, number, number][] {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b[0]);
    minY = Math.min(minY, b[1]);
    minZ = Math.min(minZ, b[2]);
  }
  return blocks.map(([x, y, z]) => [x - minX, y - minY, z - minZ]);
}

/**
 * Get the bounding box of a set of blocks
 */
export function getBlocksBounds(blocks: [number, number, number][]): { maxX: number; maxY: number; maxZ: number } {
  let maxX = 0, maxY = 0, maxZ = 0;
  for (const b of blocks) {
    maxX = Math.max(maxX, b[0]);
    maxY = Math.max(maxY, b[1]);
    maxZ = Math.max(maxZ, b[2]);
  }
  return { maxX, maxY, maxZ };
}

/**
 * Get a random piece definition
 */
export function getRandomPiece(): PieceDef {
  return PIECES[Math.floor(Math.random() * PIECES.length)];
}
