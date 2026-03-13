// Minimal 3D math library for WebGL
export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

export function createMat4(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

export function perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const m = new Float32Array(16);
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

export function lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const m = new Float32Array(16);
  let fx = center[0] - eye[0], fy = center[1] - eye[1], fz = center[2] - eye[2];
  let len = Math.sqrt(fx * fx + fy * fy + fz * fz);
  fx /= len; fy /= len; fz /= len;
  let sx = fy * up[2] - fz * up[1], sy = fz * up[0] - fx * up[2], sz = fx * up[1] - fy * up[0];
  len = Math.sqrt(sx * sx + sy * sy + sz * sz);
  sx /= len; sy /= len; sz /= len;
  const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
  m[0] = sx; m[1] = ux; m[2] = -fx; m[3] = 0;
  m[4] = sy; m[5] = uy; m[6] = -fy; m[7] = 0;
  m[8] = sz; m[9] = uz; m[10] = -fz; m[11] = 0;
  m[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
  m[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  m[14] = -(-fx * eye[0] + -fy * eye[1] + -fz * eye[2]);
  m[15] = 1;
  return m;
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
  }
  return out;
}

export function translate(m: Mat4, v: Vec3): Mat4 {
  const out = new Float32Array(m);
  out[12] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
  out[13] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
  out[14] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
  out[15] = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];
  return out;
}

export function scale(m: Mat4, v: Vec3): Mat4 {
  const out = new Float32Array(m);
  out[0] *= v[0]; out[1] *= v[0]; out[2] *= v[0]; out[3] *= v[0];
  out[4] *= v[1]; out[5] *= v[1]; out[6] *= v[1]; out[7] *= v[1];
  out[8] *= v[2]; out[9] *= v[2]; out[10] *= v[2]; out[11] *= v[2];
  return out;
}

export function rotateX(m: Mat4, angle: number): Mat4 {
  const s = Math.sin(angle), c = Math.cos(angle);
  const out = new Float32Array(m);
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  out[4] = a10 * c + a20 * s; out[5] = a11 * c + a21 * s; out[6] = a12 * c + a22 * s; out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s; out[9] = a21 * c - a11 * s; out[10] = a22 * c - a12 * s; out[11] = a23 * c - a13 * s;
  return out;
}

export function rotateY(m: Mat4, angle: number): Mat4 {
  const s = Math.sin(angle), c = Math.cos(angle);
  const out = new Float32Array(m);
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  out[0] = a00 * c - a20 * s; out[1] = a01 * c - a21 * s; out[2] = a02 * c - a22 * s; out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c; out[9] = a01 * s + a21 * c; out[10] = a02 * s + a22 * c; out[11] = a03 * s + a23 * c;
  return out;
}

export function rotateZ(m: Mat4, angle: number): Mat4 {
  const s = Math.sin(angle), c = Math.cos(angle);
  const out = new Float32Array(m);
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  out[0] = a00 * c + a10 * s; out[1] = a01 * c + a11 * s; out[2] = a02 * c + a12 * s; out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s; out[5] = a11 * c - a01 * s; out[6] = a12 * c - a02 * s; out[7] = a13 * c - a03 * s;
  return out;
}
