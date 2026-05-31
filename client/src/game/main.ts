/**
 * Main game entry point - ties together renderer, game logic, HUD, and input
 * Deep Space Observatory themed 3D Tetris
 */
import { Renderer, CubeInstance } from "./renderer";
import { perspective, lookAt, createMat4, translate, Vec3 } from "./math";
import {
  createGameState,
  spawnPiece,
  moveActive,
  rotateActive,
  hardDrop,
  holdPieceAction,
  lockPiece,
  clearCompletedLayers,
  updateParticles,
  getGridCubes,
  getClearingCubes,
  getActiveCubes,
  getGhostCubes,
  getNextPieceCubes,
  getHoldPieceCubes,
  getParticleCubes,
  GameState,
} from "./gameLogic";
import { normalizeBlocks } from "./pieces";
import { HUD } from "./hud";
import { AudioEngine } from "./audio";

export function initGame(canvas: HTMLCanvasElement) {
  const renderer = new Renderer(canvas);
  const hud = new HUD();
  const audio = new AudioEngine();

  // Well dimensions
  const WELL_W = 6;
  const WELL_H = 16;
  const WELL_D = 6;

  let state = createGameState(WELL_W, WELL_H, WELL_D);
  let prevLevel = 1;

  // Build well geometry
  renderer.buildGrid(WELL_W, WELL_D);
  renderer.buildWalls(WELL_W, WELL_H, WELL_D);

  // Camera
  let cameraAngle = 0.55; // horizontal orbit angle
  let cameraPitch = 0.45; // vertical angle
  let cameraDistance = 20;
  let cameraTargetAngle = 0.55;
  let cameraTargetPitch = 0.45;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Game functions
  function startGame() {
    state = createGameState(WELL_W, WELL_H, WELL_D);
    state.started = true;
    prevLevel = 1;
    spawnPiece(state);
    hud.hideStart();
    hud.hideGameOver();
    hud.hidePause();
    updateNextPieceDisplay();
    hud.clearHoldPiece();
    audio.startMusic();
  }

  function togglePause() {
    if (state.gameOver || !state.started) return;
    state.paused = !state.paused;
    if (state.paused) {
      hud.showPause();
    } else {
      hud.hidePause();
    }
  }

  function updateNextPieceDisplay() {
    const blocks = normalizeBlocks([...state.nextPiece.blocks]);
    hud.drawNextPiece(blocks, state.nextPiece.color);
  }

  function updateHoldPieceDisplay() {
    if (state.holdPiece) {
      const blocks = normalizeBlocks([...state.holdPiece.blocks]);
      hud.drawHoldPiece(blocks, state.holdPiece.color, state.holdUsed);
    } else {
      hud.clearHoldPiece();
    }
  }

  function performHold() {
    if (holdPieceAction(state)) {
      audio.playHold();
      updateNextPieceDisplay();
      updateHoldPieceDisplay();
    }
  }

  // HUD callbacks
  hud.onStart = startGame;
  hud.onRestart = startGame;
  hud.onPause = togglePause;

  // Audio control callbacks
  hud.onToggleMute = () => {
    const muted = audio.toggleMute();
    hud.updateMuteState(muted);
  };
  hud.onMusicVolume = (v: number) => audio.setMusicVolume(v);
  hud.onSfxVolume = (v: number) => audio.setSfxVolume(v);

  // Mobile controls
  hud.onMobileAction = (action: string) => {
    if (!state.started || state.gameOver) return;
    if (state.paused && action !== "pause") return;
    switch (action) {
      case "moveLeft": if (moveActive(state, -1, 0, 0)) audio.playMove(); break;
      case "moveRight": if (moveActive(state, 1, 0, 0)) audio.playMove(); break;
      case "moveUp": if (moveActive(state, 0, 0, -1)) audio.playMove(); break;
      case "moveDown": if (moveActive(state, 0, 0, 1)) audio.playMove(); break;
      case "rotX": if (rotateActive(state, "x")) audio.playRotate(); break;
      case "rotY": if (rotateActive(state, "y")) audio.playRotate(); break;
      case "rotZ": if (rotateActive(state, "z")) audio.playRotate(); break;
      case "drop":
        const d = hardDrop(state);
        state.score += d * 2;
        audio.playHardDrop();
        break;
      case "hold": performHold(); break;
      case "pause": togglePause(); break;
    }
    updateNextPieceDisplay();
  };

  // Keyboard input
  function onKeyDown(e: KeyboardEvent) {
    if (!state.started) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      togglePause();
      return;
    }

    if (e.key === "m" || e.key === "M") {
      const muted = audio.toggleMute();
      hud.updateMuteState(muted);
      return;
    }

    if (state.paused || state.gameOver) return;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (moveActive(state, -1, 0, 0)) audio.playMove();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (moveActive(state, 1, 0, 0)) audio.playMove();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (moveActive(state, 0, 0, -1)) audio.playMove();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (moveActive(state, 0, 0, 1)) audio.playMove();
        break;
      case "q":
      case "Q":
        if (rotateActive(state, "x")) audio.playRotate();
        break;
      case "e":
      case "E":
        if (rotateActive(state, "z")) audio.playRotate();
        break;
      case "w":
      case "W":
        if (rotateActive(state, "y")) audio.playRotate();
        break;
      case "s":
      case "S":
        // Soft drop
        if (moveActive(state, 0, -1, 0)) {
          state.score += 1;
          audio.playSoftDrop();
        }
        break;
      case " ":
        e.preventDefault();
        const dropped = hardDrop(state);
        state.score += dropped * 2;
        audio.playHardDrop();
        break;
      case "c":
      case "C":
        performHold();
        break;
    }
    updateNextPieceDisplay();
  }

  window.addEventListener("keydown", onKeyDown);

  // Mouse/touch camera control
  function onMouseDown(e: MouseEvent) {
    if (e.button === 0 && (e.target === canvas)) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  }
  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraTargetAngle += dx * 0.005;
    cameraTargetPitch = Math.max(-0.5, Math.min(1.2, cameraTargetPitch - dy * 0.005));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
  function onMouseUp() { isDragging = false; }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    cameraDistance = Math.max(10, Math.min(35, cameraDistance + e.deltaY * 0.02));
  }

  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // Touch camera control
  let touchStartX = 0, touchStartY = 0;
  let touchId: number | null = null;
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchId = e.touches[0].identifier;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  });
  canvas.addEventListener("touchmove", (e) => {
    if (touchId === null) return;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        const dx = e.touches[i].clientX - touchStartX;
        const dy = e.touches[i].clientY - touchStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          cameraTargetAngle += dx * 0.003;
          cameraTargetPitch = Math.max(-0.5, Math.min(1.2, cameraTargetPitch - dy * 0.003));
          touchStartX = e.touches[i].clientX;
          touchStartY = e.touches[i].clientY;
        }
        break;
      }
    }
  });
  canvas.addEventListener("touchend", () => { touchId = null; });

  // Main game loop
  let animId = 0;
  let lastTime = 0;
  let gameTime = 0;

  function gameLoop(timestamp: number) {
    animId = requestAnimationFrame(gameLoop);

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    gameTime += dt;

    renderer.resize();

    // Smooth camera
    cameraAngle += (cameraTargetAngle - cameraAngle) * 0.08;
    cameraPitch += (cameraTargetPitch - cameraPitch) * 0.08;

    // Auto-rotate slightly when not dragging
    if (!isDragging && state.started && !state.paused) {
      cameraTargetAngle += 0.0003;
    }

    // Game logic update
    if (state.started && !state.paused && !state.gameOver) {
      // Handle clearing animation
      if (state.clearingLayers.length > 0) {
        state.clearTimer -= dt * 1000;
        if (state.clearTimer <= 0) {
          const layerCount = state.clearingLayers.length;
          clearCompletedLayers(state);
          audio.playClear(layerCount);
          updateNextPieceDisplay();

          // Check for level up
          if (state.level > prevLevel) {
            audio.playLevelUp();
            prevLevel = state.level;
          }
        }
      } else {
        // Gravity drop
        state.lastDrop += dt * 1000;
        if (state.lastDrop >= state.dropInterval) {
          state.lastDrop = 0;
          if (!moveActive(state, 0, -1, 0)) {
            lockPiece(state);
            if (state.gameOver) {
              audio.playGameOver();
              audio.stopMusic();
              hud.showGameOver(state.score);
            } else {
              audio.playLock();
              updateNextPieceDisplay();
            }
          }
        }
      }

      // Update particles
      updateParticles(state, dt);
    }

    // Update HUD
    hud.update(state.score, state.level, state.lines);

    // === RENDERING ===
    renderer.clear();

    // Star background
    renderer.drawStars(gameTime);

    // Camera setup
    const centerX = WELL_W / 2;
    const centerY = WELL_H * 0.35;
    const centerZ = WELL_D / 2;

    const camX = centerX + Math.sin(cameraAngle) * Math.cos(cameraPitch) * cameraDistance;
    const camY = centerY + Math.sin(cameraPitch) * cameraDistance;
    const camZ = centerZ + Math.cos(cameraAngle) * Math.cos(cameraPitch) * cameraDistance;

    const cameraPos: Vec3 = [camX, camY, camZ];
    const aspect = canvas.width / canvas.height;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 100);
    const view = lookAt(cameraPos, [centerX, centerY, centerZ], [0, 1, 0]);
    const model = createMat4();

    // Draw grid floor
    renderer.drawGrid(proj, view, model);

    // Draw walls
    renderer.drawWalls(proj, view, model);

    // Collect all cubes to render
    const gridCubes = getGridCubes(state);
    const clearCubes = getClearingCubes(state, gameTime);
    const activeCubes = getActiveCubes(state);
    const ghostCubes = getGhostCubes(state);
    const particleCubes = getParticleCubes(state);

    // Draw ghost piece (translucent)
    if (ghostCubes.length > 0) {
      renderer.drawCubes(proj, view, model, ghostCubes, cameraPos, 0.5);
      renderer.drawCubeEdges(proj, view, model, ghostCubes, [0.3, 0.5, 0.8, 0.3]);
    }

    // Draw placed blocks
    renderer.drawCubes(proj, view, model, gridCubes, cameraPos, 0.3);
    renderer.drawCubeEdges(proj, view, model, gridCubes, [0.1, 0.2, 0.3, 0.4]);

    // Draw clearing blocks (flashing)
    renderer.drawCubes(proj, view, model, clearCubes, cameraPos, 1.5);

    // Draw active piece
    renderer.drawCubes(proj, view, model, activeCubes, cameraPos, 0.8);
    renderer.drawCubeEdges(proj, view, model, activeCubes, [0.8, 0.9, 1.0, 0.6]);

    // Draw particles
    if (particleCubes.length > 0) {
      renderer.drawCubes(proj, view, model, particleCubes, cameraPos, 2.0);
    }
  }

  animId = requestAnimationFrame(gameLoop);

  // Show start screen
  hud.showStart();

  return {
    destroy() {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      hud.destroy();
      audio.destroy();
    },
  };
}
