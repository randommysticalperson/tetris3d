/**
 * WebGL Renderer for 3D Tetris
 * Deep Space Observatory theme - dark navy background, metallic pieces, holographic grid
 */
import { Mat4, Vec3 } from "./math";

// Vertex shader - handles 3D cube rendering with lighting
const VERT_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  gl_Position = uProjection * uView * worldPos;
  vColor = aColor;
  vNormal = mat3(uModel) * aNormal;
  vWorldPos = worldPos.xyz;
}
`;

// Fragment shader - Phong-like lighting with metallic sheen
const FRAG_SRC = `
precision mediump float;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform float uAmbient;
uniform float uGlow;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 32.0);

  // Secondary fill light from below-left
  vec3 L2 = normalize(vec3(-0.5, -0.3, 0.5));
  float diff2 = max(dot(N, L2), 0.0) * 0.15;

  vec3 ambient = vColor * uAmbient;
  vec3 diffuse = vColor * (diff * 0.7 + diff2);
  vec3 specular = vec3(1.0, 1.0, 1.0) * spec * 0.5;

  // Edge glow effect
  float edge = 1.0 - max(dot(N, V), 0.0);
  vec3 edgeGlow = vColor * edge * edge * uGlow * 0.3;

  vec3 color = ambient + diffuse + specular + edgeGlow;
  gl_FragColor = vec4(color, 1.0);
}
`;

// Grid/wireframe shader
const GRID_VERT = `
attribute vec3 aPosition;
attribute vec4 aColor;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec4 vColor;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  vColor = aColor;
}
`;

const GRID_FRAG = `
precision mediump float;
varying vec4 vColor;
void main() {
  gl_FragColor = vColor;
}
`;

// Star background shader
const STAR_VERT = `
attribute vec2 aPosition;
varying vec2 vUV;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vUV = aPosition * 0.5 + 0.5;
}
`;

const STAR_FRAG = `
precision mediump float;
varying vec2 vUV;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUV;
  vec3 col = vec3(0.02, 0.03, 0.07);

  // Nebula glow - multiple layers
  float n1 = hash(floor(uv * 2.0));
  float n2 = hash(floor(uv * 5.0 + 42.0));
  col += vec3(0.03, 0.04, 0.10) * smoothstep(0.2, 0.8, n1);
  col += vec3(0.05, 0.02, 0.08) * smoothstep(0.4, 0.9, n2) * 0.5;

  // Subtle nebula swirl
  float nebula = sin(uv.x * 3.0 + uv.y * 2.0 + uTime * 0.05) * 0.5 + 0.5;
  col += vec3(0.02, 0.03, 0.06) * nebula * 0.4;

  // Stars - more layers, more density
  for (float i = 0.0; i < 4.0; i++) {
    vec2 starUV = uv * (50.0 + i * 80.0);
    vec2 id = floor(starUV);
    vec2 f = fract(starUV) - 0.5;
    float r = hash(id + i * 100.0);
    if (r > 0.93) {
      float d = length(f);
      float brightness = smoothstep(0.06 + r * 0.02, 0.0, d);
      float twinkle = 0.6 + 0.4 * sin(uTime * (0.8 + r * 4.0) + r * 6.28);
      vec3 starColor = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.7), hash(id + 500.0));
      col += starColor * brightness * twinkle * (0.4 + i * 0.25);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vSrc));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(p));
  }
  return p;
}

export interface CubeInstance {
  x: number; y: number; z: number;
  r: number; g: number; b: number;
  scale?: number;
  alpha?: number;
}

// Cube geometry data (positions + normals for 6 faces)
function buildCubeGeometry(): { positions: number[]; normals: number[]; indices: number[] } {
  const S = 0.48; // slightly smaller than 0.5 to show gaps
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const faces: { n: Vec3; verts: Vec3[] }[] = [
    { n: [0, 0, 1], verts: [[-S, -S, S], [S, -S, S], [S, S, S], [-S, S, S]] },
    { n: [0, 0, -1], verts: [[-S, S, -S], [S, S, -S], [S, -S, -S], [-S, -S, -S]] },
    { n: [0, 1, 0], verts: [[-S, S, S], [S, S, S], [S, S, -S], [-S, S, -S]] },
    { n: [0, -1, 0], verts: [[-S, -S, -S], [S, -S, -S], [S, -S, S], [-S, -S, S]] },
    { n: [1, 0, 0], verts: [[S, -S, S], [S, -S, -S], [S, S, -S], [S, S, S]] },
    { n: [-1, 0, 0], verts: [[-S, -S, -S], [-S, -S, S], [-S, S, S], [-S, S, -S]] },
  ];

  let idx = 0;
  for (const face of faces) {
    for (const v of face.verts) {
      positions.push(v[0], v[1], v[2]);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    idx += 4;
  }

  return { positions, normals, indices };
}

// Build wireframe edges for a cube
function buildCubeEdges(): number[] {
  const S = 0.49;
  const corners: Vec3[] = [
    [-S, -S, -S], [S, -S, -S], [S, S, -S], [-S, S, -S],
    [-S, -S, S], [S, -S, S], [S, S, S], [-S, S, S],
  ];
  const edgeIndices = [
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7,
  ];
  const verts: number[] = [];
  for (const i of edgeIndices) {
    verts.push(corners[i][0], corners[i][1], corners[i][2]);
  }
  return verts;
}

export class Renderer {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;

  // Programs
  cubeProgram: WebGLProgram;
  gridProgram: WebGLProgram;
  starProgram: WebGLProgram;

  // Cube geometry buffers
  cubeVBO: WebGLBuffer;
  cubeNBO: WebGLBuffer;
  cubeIBO: WebGLBuffer;
  cubeIndexCount: number;

  // Cube edge buffers
  edgeVBO: WebGLBuffer;
  edgeVertCount: number;

  // Star quad
  starVBO: WebGLBuffer;

  // Grid buffers
  gridVBO: WebGLBuffer | null = null;
  gridCBO: WebGLBuffer | null = null;
  gridVertCount = 0;

  // Well wall buffers
  wallVBO: WebGLBuffer | null = null;
  wallCBO: WebGLBuffer | null = null;
  wallVertCount = 0;

  // Reusable temp buffers
  _colorBuf: WebGLBuffer | null = null;
  _cubeModel: Float32Array | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false })!;
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.03, 0.04, 0.08, 1.0);

    // Create programs
    this.cubeProgram = createProgram(gl, VERT_SRC, FRAG_SRC);
    this.gridProgram = createProgram(gl, GRID_VERT, GRID_FRAG);
    this.starProgram = createProgram(gl, STAR_VERT, STAR_FRAG);

    // Build cube geometry
    const cube = buildCubeGeometry();
    this.cubeVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.positions), gl.STATIC_DRAW);

    this.cubeNBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.normals), gl.STATIC_DRAW);

    this.cubeIBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube.indices), gl.STATIC_DRAW);
    this.cubeIndexCount = cube.indices.length;

    // Build edge geometry
    const edges = buildCubeEdges();
    this.edgeVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edges), gl.STATIC_DRAW);
    this.edgeVertCount = edges.length / 3;

    // Star quad
    this.starVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = this.canvas.clientWidth * dpr;
    const h = this.canvas.clientHeight * dpr;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  buildGrid(wellW: number, wellD: number) {
    const gl = this.gl;
    const verts: number[] = [];
    const colors: number[] = [];

    // Floor grid
    for (let x = 0; x <= wellW; x++) {
      verts.push(x, 0, 0, x, 0, wellD);
      colors.push(0.15, 0.4, 0.65, 0.6, 0.15, 0.4, 0.65, 0.35);
    }
    for (let z = 0; z <= wellD; z++) {
      verts.push(0, 0, z, wellW, 0, z);
      colors.push(0.15, 0.4, 0.65, 0.6, 0.15, 0.4, 0.65, 0.35);
    }

    this.gridVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    this.gridCBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridCBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    this.gridVertCount = verts.length / 3;
  }

  buildWalls(wellW: number, wellH: number, wellD: number) {
    const gl = this.gl;
    const verts: number[] = [];
    const colors: number[] = [];
    const a = 0.2;
    const c = [0.2, 0.45, 0.7];

    // Well boundary edges (bright lines at the 4 vertical edges + bottom edges)
    const ea = 0.7;
    const ec = [0.3, 0.6, 0.9];
    // Bottom rectangle
    verts.push(0, 0, 0, wellW, 0, 0); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea);
    verts.push(wellW, 0, 0, wellW, 0, wellD); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea);
    verts.push(wellW, 0, wellD, 0, 0, wellD); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea);
    verts.push(0, 0, wellD, 0, 0, 0); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea);
    // Vertical edges
    verts.push(0, 0, 0, 0, wellH, 0); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea * 0.3);
    verts.push(wellW, 0, 0, wellW, wellH, 0); colors.push(ec[0], ec[1], ec[2], ea, ec[0], ec[1], ec[2], ea * 0.3);
    verts.push(wellW, 0, wellD, wellW, wellH, wellD); colors.push(ec[0], ec[1], ec[2], ea * 0.5, ec[0], ec[1], ec[2], ea * 0.15);
    verts.push(0, 0, wellD, 0, wellH, wellD); colors.push(ec[0], ec[1], ec[2], ea * 0.5, ec[0], ec[1], ec[2], ea * 0.15);

    // Back wall grid lines
    for (let x = 0; x <= wellW; x++) {
      verts.push(x, 0, 0, x, wellH, 0);
      colors.push(c[0], c[1], c[2], a, c[0], c[1], c[2], a * 0.3);
    }
    for (let y = 0; y <= wellH; y++) {
      verts.push(0, y, 0, wellW, y, 0);
      colors.push(c[0], c[1], c[2], a, c[0], c[1], c[2], a);
    }

    // Left wall
    for (let z = 0; z <= wellD; z++) {
      verts.push(0, 0, z, 0, wellH, z);
      colors.push(c[0], c[1], c[2], a * 0.7, c[0], c[1], c[2], a * 0.2);
    }
    for (let y = 0; y <= wellH; y++) {
      verts.push(0, y, 0, 0, y, wellD);
      colors.push(c[0], c[1], c[2], a * 0.7, c[0], c[1], c[2], a * 0.7);
    }

    // Right wall
    for (let z = 0; z <= wellD; z++) {
      verts.push(wellW, 0, z, wellW, wellH, z);
      colors.push(c[0], c[1], c[2], a * 0.5, c[0], c[1], c[2], a * 0.15);
    }
    for (let y = 0; y <= wellH; y++) {
      verts.push(wellW, y, 0, wellW, y, wellD);
      colors.push(c[0], c[1], c[2], a * 0.5, c[0], c[1], c[2], a * 0.5);
    }

    this.wallVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    this.wallCBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallCBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    this.wallVertCount = verts.length / 3;
  }

  drawStars(time: number) {
    const gl = this.gl;
    gl.useProgram(this.starProgram);
    gl.disable(gl.DEPTH_TEST);

    const posLoc = gl.getAttribLocation(this.starProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starVBO);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(gl.getUniformLocation(this.starProgram, "uTime"), time);
    gl.uniform2f(gl.getUniformLocation(this.starProgram, "uResolution"), this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
  }

  drawGrid(proj: Mat4, view: Mat4, model: Mat4) {
    if (!this.gridVBO || !this.gridCBO) return;
    const gl = this.gl;
    gl.useProgram(this.gridProgram);

    const posLoc = gl.getAttribLocation(this.gridProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const colLoc = gl.getAttribLocation(this.gridProgram, "aColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridCBO);
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uView"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uModel"), false, model);

    gl.drawArrays(gl.LINES, 0, this.gridVertCount);
  }

  drawWalls(proj: Mat4, view: Mat4, model: Mat4) {
    if (!this.wallVBO || !this.wallCBO) return;
    const gl = this.gl;
    gl.useProgram(this.gridProgram);

    const posLoc = gl.getAttribLocation(this.gridProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallVBO);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const colLoc = gl.getAttribLocation(this.gridProgram, "aColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallCBO);
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uView"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uModel"), false, model);

    gl.drawArrays(gl.LINES, 0, this.wallVertCount);
  }

  drawCubes(proj: Mat4, view: Mat4, model: Mat4, cubes: CubeInstance[], cameraPos: Vec3, glow: number) {
    if (cubes.length === 0) return;
    const gl = this.gl;
    gl.useProgram(this.cubeProgram);

    // Set up cube geometry
    const posLoc = gl.getAttribLocation(this.cubeProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVBO);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const normLoc = gl.getAttribLocation(this.cubeProgram, "aNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNBO);
    gl.enableVertexAttribArray(normLoc);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIBO);

    // Set uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(this.cubeProgram, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.cubeProgram, "uView"), false, view);
    gl.uniform3f(gl.getUniformLocation(this.cubeProgram, "uLightDir"), 0.5, 0.8, 0.6);
    gl.uniform3f(gl.getUniformLocation(this.cubeProgram, "uCameraPos"), cameraPos[0], cameraPos[1], cameraPos[2]);
    gl.uniform1f(gl.getUniformLocation(this.cubeProgram, "uAmbient"), 0.25);
    gl.uniform1f(gl.getUniformLocation(this.cubeProgram, "uGlow"), glow);

    const colorLoc = gl.getAttribLocation(this.cubeProgram, "aColor");
    const modelLoc = gl.getUniformLocation(this.cubeProgram, "uModel");

    // Reusable color buffer
    if (this._colorBuf === null) {
      this._colorBuf = gl.createBuffer()!;
    }
    const colorData = new Float32Array(24 * 3);

    // Draw each cube instance
    for (const cube of cubes) {
      // Set per-cube color
      for (let i = 0; i < 24; i++) {
        colorData[i * 3] = cube.r;
        colorData[i * 3 + 1] = cube.g;
        colorData[i * 3 + 2] = cube.b;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

      // Build model matrix with translation
      const m = model;
      const tx = cube.x + 0.5, ty = cube.y + 0.5, tz = cube.z + 0.5;
      const s = cube.scale ?? 1.0;
      const cubeModel = this._cubeModel || (this._cubeModel = new Float32Array(16));
      cubeModel[0] = m[0] * s; cubeModel[1] = m[1] * s; cubeModel[2] = m[2] * s; cubeModel[3] = m[3] * s;
      cubeModel[4] = m[4] * s; cubeModel[5] = m[5] * s; cubeModel[6] = m[6] * s; cubeModel[7] = m[7] * s;
      cubeModel[8] = m[8] * s; cubeModel[9] = m[9] * s; cubeModel[10] = m[10] * s; cubeModel[11] = m[11] * s;
      cubeModel[12] = m[0] * tx + m[4] * ty + m[8] * tz + m[12];
      cubeModel[13] = m[1] * tx + m[5] * ty + m[9] * tz + m[13];
      cubeModel[14] = m[2] * tx + m[6] * ty + m[10] * tz + m[14];
      cubeModel[15] = m[3] * tx + m[7] * ty + m[11] * tz + m[15];

      gl.uniformMatrix4fv(modelLoc, false, cubeModel);
      gl.drawElements(gl.TRIANGLES, this.cubeIndexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  drawCubeEdges(proj: Mat4, view: Mat4, model: Mat4, cubes: CubeInstance[], edgeColor: [number, number, number, number]) {
    if (cubes.length === 0) return;
    const gl = this.gl;
    gl.useProgram(this.gridProgram);

    const posLoc = gl.getAttribLocation(this.gridProgram, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeVBO);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // Color as constant
    const colLoc = gl.getAttribLocation(this.gridProgram, "aColor");
    gl.disableVertexAttribArray(colLoc);
    gl.vertexAttrib4f(colLoc, edgeColor[0], edgeColor[1], edgeColor[2], edgeColor[3]);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.gridProgram, "uView"), false, view);

    const modelLoc = gl.getUniformLocation(this.gridProgram, "uModel");

    for (const cube of cubes) {
      const m = new Float32Array(model);
      const tx = cube.x + 0.5, ty = cube.y + 0.5, tz = cube.z + 0.5;
      const cubeModel = new Float32Array(16);
      for (let i = 0; i < 16; i++) cubeModel[i] = m[i];
      cubeModel[12] = m[0] * tx + m[4] * ty + m[8] * tz + m[12];
      cubeModel[13] = m[1] * tx + m[5] * ty + m[9] * tz + m[13];
      cubeModel[14] = m[2] * tx + m[6] * ty + m[10] * tz + m[14];
      cubeModel[15] = m[3] * tx + m[7] * ty + m[11] * tz + m[15];

      gl.uniformMatrix4fv(modelLoc, false, cubeModel);
      gl.drawArrays(gl.LINES, 0, this.edgeVertCount);
    }
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
}
