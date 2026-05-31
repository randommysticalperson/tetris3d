/**
 * 3D Tetris Game Logic
 * Manages the well grid, active piece, collision detection, and layer clearing
 */
import {
  PieceDef,
  getRandomPiece,
  normalizeBlocks,
  rotateBlocksX,
  rotateBlocksY,
  rotateBlocksZ,
  getBlocksBounds,
} from "./pieces";
import type { CubeInstance } from "./renderer";

export interface GameState {
  // Well dimensions
  wellW: number;
  wellH: number;
  wellD: number;

  // 3D grid: grid[y][z][x] = color or null
  grid: (null | [number, number, number])[][][];

  // Active piece
  activePiece: PieceDef | null;
  activeBlocks: [number, number, number][];
  activePos: [number, number, number]; // position offset in well

  // Next piece
  nextPiece: PieceDef;

  // Hold piece
  holdPiece: PieceDef | null;
  holdUsed: boolean; // prevents infinite hold swapping per drop

  // Game state
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;

  // Timing
  dropInterval: number; // ms between drops
  lastDrop: number;

  // Effects
  clearingLayers: number[]; // y-indices currently being cleared
  clearTimer: number;

  // Particles for clear effect
  particles: Particle[];
}

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; g: number; b: number;
  life: number;
  maxLife: number;
}

export function createGameState(wellW = 6, wellH = 16, wellD = 6): GameState {
  const grid: (null | [number, number, number])[][][] = [];
  for (let y = 0; y < wellH; y++) {
    grid[y] = [];
    for (let z = 0; z < wellD; z++) {
      grid[y][z] = [];
      for (let x = 0; x < wellW; x++) {
        grid[y][z][x] = null;
      }
    }
  }

  return {
    wellW,
    wellH,
    wellD,
    grid,
    activePiece: null,
    activeBlocks: [],
    activePos: [0, 0, 0],
    nextPiece: getRandomPiece(),
    holdPiece: null,
    holdUsed: false,
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    paused: false,
    started: false,
    dropInterval: 1000,
    lastDrop: 0,
    clearingLayers: [],
    clearTimer: 0,
    particles: [],
  };
}

function isInBounds(state: GameState, blocks: [number, number, number][], pos: [number, number, number]): boolean {
  for (const [bx, by, bz] of blocks) {
    const x = bx + pos[0];
    const y = by + pos[1];
    const z = bz + pos[2];
    if (x < 0 || x >= state.wellW) return false;
    if (z < 0 || z >= state.wellD) return false;
    if (y < 0) return false;
    if (y >= state.wellH) return false;
  }
  return true;
}

function collides(state: GameState, blocks: [number, number, number][], pos: [number, number, number]): boolean {
  for (const [bx, by, bz] of blocks) {
    const x = bx + pos[0];
    const y = by + pos[1];
    const z = bz + pos[2];
    if (x < 0 || x >= state.wellW) return true;
    if (z < 0 || z >= state.wellD) return true;
    if (y < 0) return true;
    if (y >= state.wellH) continue; // above well is ok
    if (state.grid[y][z][x] !== null) return true;
  }
  return false;
}

export function spawnPiece(state: GameState): boolean {
  state.activePiece = state.nextPiece;
  state.nextPiece = getRandomPiece();
  state.activeBlocks = normalizeBlocks([...state.activePiece.blocks]);
  state.holdUsed = false; // reset hold lock on new piece

  const bounds = getBlocksBounds(state.activeBlocks);
  const startX = Math.floor((state.wellW - bounds.maxX - 1) / 2);
  const startZ = Math.floor((state.wellD - bounds.maxZ - 1) / 2);
  const startY = state.wellH - bounds.maxY - 1;

  state.activePos = [startX, startY, startZ];

  if (collides(state, state.activeBlocks, state.activePos)) {
    state.gameOver = true;
    return false;
  }
  return true;
}

export function holdPieceAction(state: GameState): boolean {
  if (!state.activePiece || state.gameOver || state.paused) return false;
  if (state.holdUsed) return false; // can only hold once per drop

  const currentPiece = state.activePiece;

  if (state.holdPiece) {
    // Swap hold with active
    state.activePiece = state.holdPiece;
    state.activeBlocks = normalizeBlocks([...state.activePiece.blocks]);

    const bounds = getBlocksBounds(state.activeBlocks);
    const startX = Math.floor((state.wellW - bounds.maxX - 1) / 2);
    const startZ = Math.floor((state.wellD - bounds.maxZ - 1) / 2);
    const startY = state.wellH - bounds.maxY - 1;
    state.activePos = [startX, startY, startZ];

    // If the swapped piece collides, revert
    if (collides(state, state.activeBlocks, state.activePos)) {
      state.activePiece = currentPiece;
      state.activeBlocks = normalizeBlocks([...currentPiece.blocks]);
      return false;
    }
  } else {
    // No held piece yet - spawn next piece
    state.activePiece = state.nextPiece;
    state.nextPiece = getRandomPiece();
    state.activeBlocks = normalizeBlocks([...state.activePiece.blocks]);

    const bounds = getBlocksBounds(state.activeBlocks);
    const startX = Math.floor((state.wellW - bounds.maxX - 1) / 2);
    const startZ = Math.floor((state.wellD - bounds.maxZ - 1) / 2);
    const startY = state.wellH - bounds.maxY - 1;
    state.activePos = [startX, startY, startZ];
  }

  state.holdPiece = currentPiece;
  state.holdUsed = true;
  state.lastDrop = 0; // reset drop timer
  return true;
}

export function moveActive(state: GameState, dx: number, dy: number, dz: number): boolean {
  if (!state.activePiece || state.gameOver || state.paused) return false;
  const newPos: [number, number, number] = [
    state.activePos[0] + dx,
    state.activePos[1] + dy,
    state.activePos[2] + dz,
  ];
  if (!collides(state, state.activeBlocks, newPos)) {
    state.activePos = newPos;
    return true;
  }
  return false;
}

export function rotateActive(state: GameState, axis: "x" | "y" | "z"): boolean {
  if (!state.activePiece || state.gameOver || state.paused) return false;

  let newBlocks: [number, number, number][];
  switch (axis) {
    case "x": newBlocks = normalizeBlocks(rotateBlocksX(state.activeBlocks)); break;
    case "y": newBlocks = normalizeBlocks(rotateBlocksY(state.activeBlocks)); break;
    case "z": newBlocks = normalizeBlocks(rotateBlocksZ(state.activeBlocks)); break;
  }

  // Try original position
  if (!collides(state, newBlocks, state.activePos)) {
    state.activeBlocks = newBlocks;
    return true;
  }

  // Wall kick: try shifting +-1 in x and z
  for (const dx of [-1, 1, -2, 2]) {
    for (const dz of [-1, 0, 1]) {
      const kickPos: [number, number, number] = [
        state.activePos[0] + dx,
        state.activePos[1],
        state.activePos[2] + dz,
      ];
      if (!collides(state, newBlocks, kickPos)) {
        state.activeBlocks = newBlocks;
        state.activePos = kickPos;
        return true;
      }
    }
  }

  return false;
}

export function hardDrop(state: GameState): number {
  if (!state.activePiece || state.gameOver || state.paused) return 0;
  let dropped = 0;
  while (!collides(state, state.activeBlocks, [state.activePos[0], state.activePos[1] - 1, state.activePos[2]])) {
    state.activePos[1]--;
    dropped++;
  }
  lockPiece(state);
  return dropped;
}

export function getGhostPos(state: GameState): [number, number, number] | null {
  if (!state.activePiece) return null;
  let y = state.activePos[1];
  while (!collides(state, state.activeBlocks, [state.activePos[0], y - 1, state.activePos[2]])) {
    y--;
  }
  return [state.activePos[0], y, state.activePos[2]];
}

export function lockPiece(state: GameState) {
  if (!state.activePiece) return;
  const color = state.activePiece.color;
  for (const [bx, by, bz] of state.activeBlocks) {
    const x = bx + state.activePos[0];
    const y = by + state.activePos[1];
    const z = bz + state.activePos[2];
    if (y >= 0 && y < state.wellH && x >= 0 && x < state.wellW && z >= 0 && z < state.wellD) {
      state.grid[y][z][x] = [color[0], color[1], color[2]];
    }
  }
  state.activePiece = null;
  state.activeBlocks = [];

  // Check for complete layers
  checkLayers(state);
}

function checkLayers(state: GameState) {
  const fullLayers: number[] = [];
  for (let y = 0; y < state.wellH; y++) {
    let full = true;
    for (let z = 0; z < state.wellD; z++) {
      for (let x = 0; x < state.wellW; x++) {
        if (state.grid[y][z][x] === null) {
          full = false;
          break;
        }
      }
      if (!full) break;
    }
    if (full) fullLayers.push(y);
  }

  if (fullLayers.length > 0) {
    state.clearingLayers = fullLayers;
    state.clearTimer = 500; // ms for clear animation

    // Generate particles for each cleared layer
    for (const y of fullLayers) {
      for (let z = 0; z < state.wellD; z++) {
        for (let x = 0; x < state.wellW; x++) {
          const color = state.grid[y][z][x];
          if (color) {
            for (let i = 0; i < 3; i++) {
              state.particles.push({
                x: x + 0.5,
                y: y + 0.5,
                z: z + 0.5,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 1,
                vz: (Math.random() - 0.5) * 4,
                r: color[0],
                g: color[1],
                b: color[2],
                life: 1.0,
                maxLife: 0.8 + Math.random() * 0.4,
              });
            }
          }
        }
      }
    }
  } else {
    // No layers to clear, spawn next piece
    spawnPiece(state);
  }
}

export function clearCompletedLayers(state: GameState) {
  if (state.clearingLayers.length === 0) return;

  const count = state.clearingLayers.length;

  // Remove layers from top to bottom
  const sorted = [...state.clearingLayers].sort((a, b) => b - a);
  for (const y of sorted) {
    state.grid.splice(y, 1);
    // Add empty layer at top
    const emptyLayer: (null | [number, number, number])[][] = [];
    for (let z = 0; z < state.wellD; z++) {
      emptyLayer[z] = [];
      for (let x = 0; x < state.wellW; x++) {
        emptyLayer[z][x] = null;
      }
    }
    state.grid.push(emptyLayer);
  }

  // Scoring
  const multipliers = [0, 100, 300, 500, 800];
  state.score += (multipliers[Math.min(count, 4)] || count * 200) * state.level;
  state.lines += count;
  state.level = Math.floor(state.lines / 5) + 1;
  state.dropInterval = Math.max(100, 1000 - (state.level - 1) * 80);

  state.clearingLayers = [];

  // Spawn next piece
  spawnPiece(state);
}

export function updateParticles(state: GameState, dt: number) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 5 * dt; // gravity
    p.life -= dt / p.maxLife;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

export function getGridCubes(state: GameState): CubeInstance[] {
  const cubes: CubeInstance[] = [];
  for (let y = 0; y < state.wellH; y++) {
    // Skip layers being cleared (they'll flash)
    if (state.clearingLayers.includes(y)) continue;
    for (let z = 0; z < state.wellD; z++) {
      for (let x = 0; x < state.wellW; x++) {
        const c = state.grid[y][z][x];
        if (c) {
          cubes.push({ x, y, z, r: c[0], g: c[1], b: c[2] });
        }
      }
    }
  }
  return cubes;
}

export function getClearingCubes(state: GameState, time: number): CubeInstance[] {
  if (state.clearingLayers.length === 0) return [];
  const cubes: CubeInstance[] = [];
  const flash = Math.sin(time * 15) * 0.5 + 0.5;
  for (const y of state.clearingLayers) {
    for (let z = 0; z < state.wellD; z++) {
      for (let x = 0; x < state.wellW; x++) {
        const c = state.grid[y][z][x];
        if (c) {
          cubes.push({
            x, y, z,
            r: c[0] * 0.5 + 0.5 * flash,
            g: c[1] * 0.5 + 0.5 * flash,
            b: c[2] * 0.5 + 0.5 * flash,
            scale: 1.0 + flash * 0.1,
          });
        }
      }
    }
  }
  return cubes;
}

export function getActiveCubes(state: GameState): CubeInstance[] {
  if (!state.activePiece) return [];
  return state.activeBlocks.map(([bx, by, bz]) => ({
    x: bx + state.activePos[0],
    y: by + state.activePos[1],
    z: bz + state.activePos[2],
    r: state.activePiece!.color[0],
    g: state.activePiece!.color[1],
    b: state.activePiece!.color[2],
  }));
}

export function getGhostCubes(state: GameState): CubeInstance[] {
  if (!state.activePiece) return [];
  const ghostPos = getGhostPos(state);
  if (!ghostPos || ghostPos[1] === state.activePos[1]) return [];
  return state.activeBlocks.map(([bx, by, bz]) => ({
    x: bx + ghostPos[0],
    y: by + ghostPos[1],
    z: bz + ghostPos[2],
    r: state.activePiece!.color[0] * 0.3,
    g: state.activePiece!.color[1] * 0.3,
    b: state.activePiece!.color[2] * 0.3,
    alpha: 0.3,
  }));
}

export function getNextPieceCubes(state: GameState): CubeInstance[] {
  const piece = state.nextPiece;
  const blocks = normalizeBlocks([...piece.blocks]);
  return blocks.map(([x, y, z]) => ({
    x, y, z,
    r: piece.color[0],
    g: piece.color[1],
    b: piece.color[2],
  }));
}

export function getHoldPieceCubes(state: GameState): CubeInstance[] {
  if (!state.holdPiece) return [];
  const piece = state.holdPiece;
  const blocks = normalizeBlocks([...piece.blocks]);
  const dimFactor = state.holdUsed ? 0.5 : 1.0; // dim if hold already used
  return blocks.map(([x, y, z]) => ({
    x, y, z,
    r: piece.color[0] * dimFactor,
    g: piece.color[1] * dimFactor,
    b: piece.color[2] * dimFactor,
  }));
}

export function getParticleCubes(state: GameState): CubeInstance[] {
  return state.particles.map((p) => ({
    x: p.x - 0.5,
    y: p.y - 0.5,
    z: p.z - 0.5,
    r: p.r,
    g: p.g,
    b: p.b,
    scale: p.life * 0.5,
  }));
}
