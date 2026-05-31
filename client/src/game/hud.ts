/**
 * HTML-based HUD overlay for the 3D Tetris game
 * Deep Space Observatory theme - holographic panels with cyan accents
 */

const TITLE_BG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332318761/2XyE4q6Lc7Vo7qCiDxVYna/title-bg-Tih8kyGPrko2pi4VjgL9hD.webp";

export class HUD {
  container: HTMLDivElement;
  scoreEl: HTMLSpanElement;
  levelEl: HTMLSpanElement;
  linesEl: HTMLSpanElement;
  nextCanvas: HTMLCanvasElement;
  holdCanvas: HTMLCanvasElement;
  holdPanel: HTMLDivElement;
  startScreen: HTMLDivElement;
  gameOverScreen: HTMLDivElement;
  pauseScreen: HTMLDivElement;
  controlsHint: HTMLDivElement;
  finalScoreEl: HTMLSpanElement;

  muteBtn: HTMLButtonElement;
  musicSlider: HTMLInputElement;
  sfxSlider: HTMLInputElement;

  onStart: () => void = () => {};
  onRestart: () => void = () => {};
  onPause: () => void = () => {};
  onToggleMute: () => void = () => {};
  onMusicVolume: (v: number) => void = () => {};
  onSfxVolume: (v: number) => void = () => {};

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "hud";
    this.container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        #hud {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 10;
          font-family: 'Rajdhani', sans-serif;
          color: #c8d8ff;
          overflow: hidden;
        }
        #hud * {
          box-sizing: border-box;
        }

        .hud-panel {
          background: rgba(8, 16, 40, 0.75);
          border: 1px solid rgba(80, 160, 220, 0.3);
          border-radius: 4px;
          backdrop-filter: blur(8px);
          box-shadow: 0 0 15px rgba(40, 100, 180, 0.15), inset 0 0 20px rgba(40, 100, 180, 0.05);
        }

        .hud-panel-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(100, 180, 240, 0.8);
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(80, 160, 220, 0.2);
        }

        /* Top bar */
        .hud-top {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .hud-stat {
          text-align: center;
          padding: 8px 20px;
        }

        .hud-stat-label {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(100, 180, 240, 0.7);
        }

        .hud-stat-value {
          font-family: 'Orbitron', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #e0ecff;
          text-shadow: 0 0 10px rgba(100, 180, 240, 0.5);
        }

        /* Right panel - next piece */
        .hud-right {
          position: absolute;
          top: 80px;
          right: 16px;
          width: 140px;
          padding: 12px;
        }

        /* Left panel - hold piece */
        .hud-left {
          position: absolute;
          top: 80px;
          left: 16px;
          width: 140px;
          padding: 12px;
        }

        .hold-piece-canvas {
          width: 116px;
          height: 116px;
          display: block;
          margin: 0 auto;
        }

        .hud-left.hold-used {
          opacity: 0.4;
        }

        /* Audio controls panel */
        .hud-audio {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 160px;
          padding: 12px;
          pointer-events: auto;
        }

        .audio-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .audio-row:last-child {
          margin-bottom: 0;
        }

        .audio-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(160, 200, 240, 0.7);
          width: 38px;
          flex-shrink: 0;
        }

        .audio-mute-btn {
          background: rgba(80, 160, 220, 0.1);
          border: 1px solid rgba(80, 160, 220, 0.3);
          border-radius: 4px;
          color: rgba(160, 200, 240, 0.9);
          font-size: 16px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .audio-mute-btn:hover {
          background: rgba(80, 160, 220, 0.25);
          border-color: rgba(100, 180, 240, 0.5);
        }

        .audio-mute-btn.muted {
          color: rgba(160, 200, 240, 0.3);
          border-color: rgba(80, 160, 220, 0.15);
        }

        .audio-slider {
          -webkit-appearance: none;
          appearance: none;
          flex: 1;
          height: 4px;
          background: rgba(80, 160, 220, 0.2);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .audio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(100, 180, 240, 0.8);
          border: 1px solid rgba(140, 200, 255, 0.6);
          cursor: pointer;
          transition: transform 0.1s;
        }

        .audio-slider::-webkit-slider-thumb:hover {
          transform: scale(1.3);
        }

        .audio-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(100, 180, 240, 0.8);
          border: 1px solid rgba(140, 200, 255, 0.6);
          cursor: pointer;
        }

        .next-piece-canvas {
          width: 116px;
          height: 116px;
          display: block;
          margin: 0 auto;
        }

        /* Controls hint */
        .hud-controls {
          position: absolute;
          bottom: 16px;
          left: 16px;
          padding: 12px 16px;
          font-size: 12px;
          line-height: 1.8;
          opacity: 0.6;
        }

        .hud-controls kbd {
          display: inline-block;
          background: rgba(80, 160, 220, 0.15);
          border: 1px solid rgba(80, 160, 220, 0.3);
          border-radius: 3px;
          padding: 1px 6px;
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(160, 200, 240, 0.9);
          margin: 0 2px;
        }

        /* Start screen */
        .overlay-screen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(4, 8, 20, 0.85);
          backdrop-filter: blur(12px);
          pointer-events: auto;
          z-index: 20;
        }

        .overlay-screen.hidden {
          display: none;
        }

        .game-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 8px;
          text-transform: uppercase;
          background: linear-gradient(135deg, #60a5fa, #a78bfa, #60a5fa);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: titleGlow 3s ease-in-out infinite;
          margin-bottom: 8px;
        }

        @keyframes titleGlow {
          0%, 100% { background-position: 0% 50%; filter: brightness(1); }
          50% { background-position: 100% 50%; filter: brightness(1.3); }
        }

        .game-subtitle {
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 6px;
          text-transform: uppercase;
          color: rgba(160, 200, 240, 0.6);
          margin-bottom: 48px;
        }

        .btn-start {
          font-family: 'Orbitron', sans-serif;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #e0ecff;
          background: rgba(60, 120, 200, 0.2);
          border: 1px solid rgba(100, 180, 240, 0.4);
          border-radius: 4px;
          padding: 14px 48px;
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.3s ease;
          text-shadow: 0 0 8px rgba(100, 180, 240, 0.5);
        }

        .btn-start:hover {
          background: rgba(60, 120, 200, 0.35);
          border-color: rgba(100, 180, 240, 0.7);
          box-shadow: 0 0 20px rgba(60, 120, 200, 0.3);
          transform: scale(1.02);
        }

        .game-over-score {
          font-family: 'Orbitron', sans-serif;
          font-size: 20px;
          font-weight: 500;
          color: rgba(200, 220, 255, 0.8);
          margin: 16px 0 32px;
        }

        .pause-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 6px;
          color: rgba(200, 220, 255, 0.8);
        }

        /* Mobile controls */
        .mobile-controls {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px;
          pointer-events: auto;
          z-index: 15;
        }

        @media (max-width: 768px) {
          .mobile-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
          .hud-controls { display: none; }
          .hud-top { top: 8px; gap: 12px; }
          .hud-stat { padding: 6px 12px; }
          .hud-stat-value { font-size: 18px; }
          .hud-right { top: 60px; right: 8px; width: 100px; padding: 8px; }
          .hud-left { top: 60px; left: 8px; width: 100px; padding: 8px; }
          .hud-audio { bottom: 8px; right: 8px; width: 130px; padding: 8px; }
          .next-piece-canvas { width: 84px; height: 84px; }
          .hold-piece-canvas { width: 84px; height: 84px; }
          .game-title { font-size: 28px; letter-spacing: 4px; }
        }

        .mobile-btn {
          width: 52px;
          height: 52px;
          background: rgba(8, 16, 40, 0.7);
          border: 1px solid rgba(80, 160, 220, 0.3);
          border-radius: 8px;
          color: rgba(160, 200, 240, 0.8);
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }

        .mobile-btn:active {
          background: rgba(60, 120, 200, 0.3);
          border-color: rgba(100, 180, 240, 0.6);
        }

        .mobile-btn-wide {
          width: 80px;
        }

        .mobile-row {
          display: flex;
          gap: 8px;
          width: 100%;
          justify-content: center;
        }
      </style>

      <!-- Top stats bar -->
      <div class="hud-top">
        <div class="hud-panel hud-stat">
          <div class="hud-stat-label">Score</div>
          <div class="hud-stat-value" id="hud-score">0</div>
        </div>
        <div class="hud-panel hud-stat">
          <div class="hud-stat-label">Level</div>
          <div class="hud-stat-value" id="hud-level">1</div>
        </div>
        <div class="hud-panel hud-stat">
          <div class="hud-stat-label">Lines</div>
          <div class="hud-stat-value" id="hud-lines">0</div>
        </div>
      </div>

      <!-- Right panel - next piece -->
      <div class="hud-panel hud-right">
        <div class="hud-panel-title">Next</div>
        <canvas class="next-piece-canvas" id="next-piece-canvas" width="116" height="116"></canvas>
      </div>

      <!-- Left panel - hold piece -->
      <div class="hud-panel hud-left">
        <div class="hud-panel-title">Hold <kbd style="font-size:9px;background:rgba(80,160,220,0.15);border:1px solid rgba(80,160,220,0.3);border-radius:3px;padding:1px 5px;font-family:'Orbitron',sans-serif;color:rgba(160,200,240,0.9);margin-left:4px;">C</kbd></div>
        <canvas class="hold-piece-canvas" id="hold-piece-canvas" width="116" height="116"></canvas>
      </div>

      <!-- Audio controls -->
      <div class="hud-panel hud-audio" id="hud-audio">
        <div class="hud-panel-title">Audio</div>
        <div class="audio-row">
          <button class="audio-mute-btn" id="audio-mute-btn" title="Toggle Mute (M)">&#x1f50a;</button>
        </div>
        <div class="audio-row">
          <span class="audio-label">Music</span>
          <input type="range" class="audio-slider" id="music-slider" min="0" max="100" value="40" />
        </div>
        <div class="audio-row">
          <span class="audio-label">SFX</span>
          <input type="range" class="audio-slider" id="sfx-slider" min="0" max="100" value="80" />
        </div>
      </div>

      <!-- Controls hint -->
      <div class="hud-panel hud-controls" id="hud-controls">
        <div><kbd>\u2190</kbd> <kbd>\u2192</kbd> <kbd>\u2191</kbd> <kbd>\u2193</kbd> Move</div>
        <div><kbd>Q</kbd> <kbd>E</kbd> Rotate XZ</div>
        <div><kbd>W</kbd> <kbd>S</kbd> Rotate Y</div>
        <div><kbd>Space</kbd> Hard Drop</div>
        <div><kbd>C</kbd> Hold Piece</div>
        <div><kbd>M</kbd> Mute</div>
        <div><kbd>P</kbd> Pause</div>
      </div>

      <!-- Mobile controls -->
      <div class="mobile-controls" id="mobile-controls">
        <div class="mobile-row">
          <button class="mobile-btn" data-action="rotX">\u21BB X</button>
          <button class="mobile-btn" data-action="moveUp">\u2191</button>
          <button class="mobile-btn" data-action="rotY">\u21BB Y</button>
        </div>
        <div class="mobile-row">
          <button class="mobile-btn" data-action="moveLeft">\u2190</button>
          <button class="mobile-btn" data-action="moveDown">\u2193</button>
          <button class="mobile-btn" data-action="moveRight">\u2192</button>
        </div>
        <div class="mobile-row">
          <button class="mobile-btn" data-action="rotZ">\u21BB Z</button>
          <button class="mobile-btn mobile-btn-wide" data-action="drop">DROP</button>
          <button class="mobile-btn" data-action="hold">HOLD</button>
          <button class="mobile-btn" data-action="pause">\u23F8</button>
        </div>
      </div>

      <!-- Start screen -->
      <div class="overlay-screen" id="start-screen">
        <div class="game-title">3D TETRIS</div>
        <div class="game-subtitle">Deep Space Observatory</div>
        <button class="btn-start" id="btn-start">Start Game</button>
      </div>

      <!-- Game over screen -->
      <div class="overlay-screen hidden" id="gameover-screen">
        <div class="game-title" style="font-size:36px;">Game Over</div>
        <div class="game-over-score">Final Score: <span id="final-score">0</span></div>
        <button class="btn-start" id="btn-restart">Play Again</button>
      </div>

      <!-- Pause screen -->
      <div class="overlay-screen hidden" id="pause-screen">
        <div class="pause-text">Paused</div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.scoreEl = this.container.querySelector("#hud-score")!;
    this.levelEl = this.container.querySelector("#hud-level")!;
    this.linesEl = this.container.querySelector("#hud-lines")!;
    this.nextCanvas = this.container.querySelector("#next-piece-canvas")!;
    this.holdCanvas = this.container.querySelector("#hold-piece-canvas")!;
    this.holdPanel = this.container.querySelector(".hud-left")!;
    this.startScreen = this.container.querySelector("#start-screen")!;
    this.gameOverScreen = this.container.querySelector("#gameover-screen")!;
    this.pauseScreen = this.container.querySelector("#pause-screen")!;
    this.controlsHint = this.container.querySelector("#hud-controls")!;
    this.finalScoreEl = this.container.querySelector("#final-score")!;

    // Audio controls
    this.muteBtn = this.container.querySelector("#audio-mute-btn")!;
    this.musicSlider = this.container.querySelector("#music-slider")!;
    this.sfxSlider = this.container.querySelector("#sfx-slider")!;

    this.muteBtn.addEventListener("click", () => this.onToggleMute());
    this.musicSlider.addEventListener("input", () => {
      this.onMusicVolume(parseInt(this.musicSlider.value) / 100);
    });
    this.sfxSlider.addEventListener("input", () => {
      this.onSfxVolume(parseInt(this.sfxSlider.value) / 100);
    });

    // Button handlers
    this.container.querySelector("#btn-start")!.addEventListener("click", () => this.onStart());
    this.container.querySelector("#btn-restart")!.addEventListener("click", () => this.onRestart());

    // Mobile button handlers
    this.container.querySelectorAll(".mobile-btn").forEach((btn) => {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const action = (btn as HTMLElement).dataset.action;
        if (action) this.onMobileAction(action);
      });
      btn.addEventListener("click", () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action) this.onMobileAction(action);
      });
    });
  }

  onMobileAction: (action: string) => void = () => {};

  update(score: number, level: number, lines: number) {
    this.scoreEl.textContent = score.toLocaleString();
    this.levelEl.textContent = level.toString();
    this.linesEl.textContent = lines.toString();
  }

  showStart() {
    this.startScreen.classList.remove("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
  }

  hideStart() {
    this.startScreen.classList.add("hidden");
  }

  showGameOver(score: number) {
    this.finalScoreEl.textContent = score.toLocaleString();
    this.gameOverScreen.classList.remove("hidden");
  }

  hideGameOver() {
    this.gameOverScreen.classList.add("hidden");
  }

  showPause() {
    this.pauseScreen.classList.remove("hidden");
  }

  hidePause() {
    this.pauseScreen.classList.add("hidden");
  }

  drawNextPiece(blocks: [number, number, number][], color: [number, number, number]) {
    const ctx = this.nextCanvas.getContext("2d")!;
    const w = this.nextCanvas.width;
    const h = this.nextCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (blocks.length === 0) return;

    // Find bounds
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const [x, y, z] of blocks) {
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    const cellSize = Math.min(w, h) / (Math.max(maxX, maxY, maxZ) + 2.5);
    const offsetX = (w - (maxX + 1) * cellSize) / 2;
    const offsetY = (h - (maxY + 1) * cellSize) / 2;

    // Draw isometric-ish cubes
    for (const [x, y, z] of blocks) {
      const px = offsetX + x * cellSize + z * cellSize * 0.3;
      const py = offsetY + (maxY - y) * cellSize - z * cellSize * 0.3;

      // Top face (lighter)
      ctx.fillStyle = `rgba(${Math.round(color[0] * 255 * 1.2)}, ${Math.round(color[1] * 255 * 1.2)}, ${Math.round(color[2] * 255 * 1.2)}, 0.9)`;
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // Border
      ctx.strokeStyle = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, 0.6)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
      ctx.fillRect(px + 2, py + 2, cellSize - 4, 3);
    }
  }

  drawHoldPiece(blocks: [number, number, number][], color: [number, number, number], holdUsed: boolean) {
    const ctx = this.holdCanvas.getContext("2d")!;
    const w = this.holdCanvas.width;
    const h = this.holdCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Update panel opacity based on hold state
    if (holdUsed) {
      this.holdPanel.classList.add("hold-used");
    } else {
      this.holdPanel.classList.remove("hold-used");
    }

    if (blocks.length === 0) return;

    // Find bounds
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const [x, y, z] of blocks) {
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    const cellSize = Math.min(w, h) / (Math.max(maxX, maxY, maxZ) + 2.5);
    const offsetX = (w - (maxX + 1) * cellSize) / 2;
    const offsetY = (h - (maxY + 1) * cellSize) / 2;

    // Draw isometric-ish cubes
    for (const [x, y, z] of blocks) {
      const px = offsetX + x * cellSize + z * cellSize * 0.3;
      const py = offsetY + (maxY - y) * cellSize - z * cellSize * 0.3;

      // Top face (lighter)
      ctx.fillStyle = `rgba(${Math.round(color[0] * 255 * 1.2)}, ${Math.round(color[1] * 255 * 1.2)}, ${Math.round(color[2] * 255 * 1.2)}, 0.9)`;
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // Border
      ctx.strokeStyle = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, 0.6)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
      ctx.fillRect(px + 2, py + 2, cellSize - 4, 3);
    }
  }

  clearHoldPiece() {
    const ctx = this.holdCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    this.holdPanel.classList.remove("hold-used");
  }

  updateMuteState(muted: boolean) {
    if (muted) {
      this.muteBtn.classList.add("muted");
      this.muteBtn.innerHTML = "&#x1f507;";
    } else {
      this.muteBtn.classList.remove("muted");
      this.muteBtn.innerHTML = "&#x1f50a;";
    }
  }

  destroy() {
    this.container.remove();
  }
}
