/**
 * Audio Engine for 3D Tetris - Deep Space Observatory
 * Procedurally generated ambient background music + enhanced sound effects
 * All audio is synthesized via Web Audio API - no external files needed
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music state
  private musicPlaying = false;
  private musicNodes: AudioNode[] = [];
  private musicTimers: number[] = [];
  private beatInterval: number | null = null;
  private chordIndex = 0;
  private beatCount = 0;

  // Volume settings (0-1)
  private _masterVolume = 0.7;
  private _musicVolume = 0.4;
  private _sfxVolume = 0.8;
  private _muted = false;

  // Chord progression for ambient space music (minor/ethereal)
  // Using frequencies for a Cm -> Ab -> Eb -> Bb progression
  private chords: number[][] = [
    [130.81, 155.56, 196.00, 261.63], // Cm (C3, Eb3, G3, C4)
    [103.83, 130.81, 155.56, 207.65], // Ab (Ab2, C3, Eb3, Ab3)
    [155.56, 196.00, 233.08, 311.13], // Eb (Eb3, G3, Bb3, Eb4)
    [116.54, 146.83, 174.61, 233.08], // Bb (Bb2, D3, F3, Bb3)
    [130.81, 155.56, 196.00, 246.94], // Cm add9 variation
    [103.83, 123.47, 155.56, 196.00], // Ab maj7
    [146.83, 174.61, 220.00, 293.66], // Dm (passing)
    [116.54, 146.83, 174.61, 220.00], // Bb add4
  ];

  // Pentatonic scale for melodic arpeggios (C minor pentatonic)
  private melodyNotes = [
    261.63, 293.66, 311.13, 349.23, 392.00, // C4, D4, Eb4, F4, G4
    466.16, 523.25, 587.33, 622.25, 698.46, // Bb4, C5, D5, Eb5, F5
  ];

  get muted() { return this._muted; }
  get masterVolume() { return this._masterVolume; }
  get musicVolume() { return this._musicVolume; }
  get sfxVolume() { return this._sfxVolume; }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMasterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
    }
  }

  setMusicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) {
      this.musicGain.gain.value = this._musicVolume;
    }
  }

  setSfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxVolume;
    }
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
    }
    return this._muted;
  }

  // === BACKGROUND MUSIC ===

  startMusic() {
    if (this.musicPlaying) return;
    const ctx = this.ensureContext();
    this.musicPlaying = true;
    this.chordIndex = 0;
    this.beatCount = 0;

    // Start the ambient pad
    this.playAmbientPad();

    // Start beat loop (tempo ~72 BPM = 833ms per beat)
    this.beatInterval = window.setInterval(() => {
      if (!this.musicPlaying) return;
      this.onBeat();
    }, 833);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.beatInterval !== null) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    // Clear all scheduled timers
    for (const t of this.musicTimers) {
      clearTimeout(t);
    }
    this.musicTimers = [];
    // Stop all music nodes
    for (const node of this.musicNodes) {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch (_) {}
    }
    this.musicNodes = [];
  }

  private playAmbientPad() {
    if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chord = this.chords[this.chordIndex % this.chords.length];

    // Play a soft pad chord with slow attack/release
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.value = chord[i];
      // Slight detune for warmth
      osc.detune.value = (Math.random() - 0.5) * 8;

      filter.type = "lowpass";
      filter.frequency.value = 800 + Math.random() * 400;
      filter.Q.value = 0.5;

      // Slow envelope for ambient feel
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 1.5);
      gain.gain.setValueAtTime(0.06, now + 4.5);
      gain.gain.linearRampToValueAtTime(0, now + 6.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 7);

      this.musicNodes.push(osc, gain, filter);
    }

    // Add a sub-bass note
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.value = chord[0] / 2; // One octave below root
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.08, now + 1.0);
    subGain.gain.setValueAtTime(0.08, now + 5.0);
    subGain.gain.linearRampToValueAtTime(0, now + 6.5);
    subOsc.connect(subGain);
    subGain.connect(this.musicGain);
    subOsc.start(now);
    subOsc.stop(now + 7);
    this.musicNodes.push(subOsc, subGain);

    // Schedule next chord change
    this.chordIndex++;
    const timer = window.setTimeout(() => {
      this.playAmbientPad();
    }, 6600);
    this.musicTimers.push(timer);
  }

  private onBeat() {
    if (!this.ctx || !this.musicGain || !this.musicPlaying) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.beatCount++;

    // Every 2 beats, play a soft arpeggio note
    if (this.beatCount % 2 === 0) {
      const noteIdx = Math.floor(Math.random() * this.melodyNotes.length);
      const freq = this.melodyNotes[noteIdx];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 5;

      filter.type = "lowpass";
      filter.frequency.value = 2000;
      filter.Q.value = 1;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 2);
      this.musicNodes.push(osc, gain, filter);
    }

    // Every 4 beats, add a subtle percussion hit (filtered noise)
    if (this.beatCount % 4 === 0) {
      this.playPercHit(0.03);
    }

    // Every 8 beats, play a deeper resonant tone
    if (this.beatCount % 8 === 0) {
      const chord = this.chords[this.chordIndex % this.chords.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = chord[0] * 2; // Higher octave root
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 3);
      this.musicNodes.push(osc, gain);
    }
  }

  private playPercHit(vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Use a buffer source with noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 4000 + Math.random() * 2000;
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(now);

    this.musicNodes.push(source, filter, gain);
  }

  // === SOUND EFFECTS ===

  playMove() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.03);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playRotate() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Dual-tone whoosh
    for (const freq of [440, 660]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.3, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  playDrop() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Impact thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    // Noise burst for impact texture
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  playHardDrop() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Heavy impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Metallic ring
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = "triangle";
    ring.frequency.value = 800;
    ring.detune.value = 50;
    ringGain.gain.setValueAtTime(0.05, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ring.start(now);
    ring.stop(now + 0.45);

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  playClear(lineCount: number) {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Ascending chime cascade - more notes for more lines
    const baseFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const count = Math.min(lineCount + 2, baseFreqs.length);

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = baseFreqs[i];
      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    }

    // Shimmer effect (high-frequency sweep)
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(2000, now);
    shimmer.frequency.linearRampToValueAtTime(4000 + lineCount * 500, now + 0.3);
    shimmerGain.gain.setValueAtTime(0.03, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmer.start(now);
    shimmer.stop(now + 0.5);

    // Satisfying whoosh noise
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 3000;
    noiseFilter.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.06 + lineCount * 0.02;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  playHold() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Soft "whoosh" swap sound
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.linearRampToValueAtTime(400, now + 0.1);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(350, now + 0.05);
    osc2.frequency.linearRampToValueAtTime(500, now + 0.12);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.05, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.18);
  }

  playLock() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Soft "click" when piece locks in place
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playGameOver() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Descending dissonant tones
    const freqs = [400, 350, 280, 200, 150];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freqs[i];
      osc.detune.value = (Math.random() - 0.5) * 30;
      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.55);
    }

    // Low rumble
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = "sine";
    rumble.frequency.value = 50;
    rumbleGain.gain.setValueAtTime(0.12, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 1.6);
  }

  playLevelUp() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    // Triumphant ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 E5 G5 C6 E6
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[i];
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    }
  }

  playSoftDrop() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.03);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  destroy() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
