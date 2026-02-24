import * as THREE from 'three';

/**
 * Generates monochrome procedural terrain textures on Canvas2D.
 * Produces tileable 256x256 textures for each terrain type with
 * very subtle noise — matching the architectural maquette aesthetic.
 */

const SIZE = 256;

// -- Noise helpers (same hash as TerrainGenerator) --

function hash(a, b) {
  const h = ((a * 374761393 + b * 668265263 + 1234567) & 0x7fffffff);
  return (h % 1000) / 1000;
}

function noise(x, y, scale) {
  const sx = Math.floor(x / scale);
  const sy = Math.floor(y / scale);
  const fx = (x / scale) - sx;
  const fy = (y / scale) - sy;
  const smooth = t => t * t * (3 - 2 * t);
  const sfx = smooth(fx);
  const sfy = smooth(fy);
  const v00 = hash(sx, sy);
  const v10 = hash(sx + 1, sy);
  const v01 = hash(sx, sy + 1);
  const v11 = hash(sx + 1, sy + 1);
  return (v00 * (1 - sfx) + v10 * sfx) * (1 - sfy)
       + (v01 * (1 - sfx) + v11 * sfx) * sfy;
}

function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -- Canvas helpers --

function createCanvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function clamp(v, lo = 0, hi = 255) {
  return v < lo ? lo : v > hi ? hi : v;
}

// -- Texture generators (monochrome / architectural maquette style) --

/**
 * GRASS — base #E8E4DC (232, 228, 220)
 * Very subtle warm ivory noise. Near-flat matte surface.
 */
function generateGrass() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E8E4DC';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 40) - 0.5) * 10;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n);
      d[i + 1] = clamp(d[i + 1] + n);
      d[i + 2] = clamp(d[i + 2] + n);
    }
  }
  ctx.putImageData(img, 0, 0);
  return makeTexture(canvas);
}

/**
 * DIRT — base #D8D2C8 (216, 210, 200)
 * Slightly darker cream with faint crack lines suggesting flagstones.
 */
function generateDirt() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#D8D2C8';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 30) - 0.5) * 8;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n);
      d[i + 1] = clamp(d[i + 1] + n * 0.9);
      d[i + 2] = clamp(d[i + 2] + n * 0.8);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Faint crack lines
  const rand = seededRandom(202);
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const angle = rand() * Math.PI;
    const len = 10 + rand() * 20;
    ctx.strokeStyle = 'rgba(180, 170, 158, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  return makeTexture(canvas);
}

/**
 * STONE — base #CCC8C0 (204, 200, 192)
 * Voronoi cell pattern with very subtle crack lines.
 */
function generateStone() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#CCC8C0';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const rand = seededRandom(303);
  const numSeeds = 16;
  const seeds = [];
  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: rand() * SIZE,
      y: rand() * SIZE,
      shade: 195 + Math.floor(rand() * 12),
    });
  }

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let d1 = Infinity, d2 = Infinity;
      let nearestShade = 200;

      for (const seed of seeds) {
        let dx = Math.abs(px - seed.x);
        let dy = Math.abs(py - seed.y);
        if (dx > SIZE / 2) dx = SIZE - dx;
        if (dy > SIZE / 2) dy = SIZE - dy;
        const dist = dx * dx + dy * dy;

        if (dist < d1) {
          d2 = d1;
          d1 = dist;
          nearestShade = seed.shade;
        } else if (dist < d2) {
          d2 = dist;
        }
      }

      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const i = (py * SIZE + px) * 4;

      if (edge < 2.5) {
        // Subtle crack line
        const v = nearestShade - 10;
        d[i] = v; d[i + 1] = v; d[i + 2] = v - 2;
      } else {
        const n = (noise(px, py, 15) - 0.5) * 4;
        const v = clamp(nearestShade + n);
        d[i] = v; d[i + 1] = v; d[i + 2] = v - 2;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return makeTexture(canvas);
}

/**
 * WATER — base #1A1A1A (26, 26, 26)
 * Near-black void with minimal noise.
 */
function generateWater() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 50) - 0.5) * 6;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n * 0.3);
      d[i + 1] = clamp(d[i + 1] + n * 0.3);
      d[i + 2] = clamp(d[i + 2] + n * 0.4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return makeTexture(canvas);
}

/**
 * FOREST — base #C5CCBF (197, 204, 191)
 * Slight sage tint, subtle noise.
 */
function generateForest() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#C5CCBF';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 35) - 0.5) * 8;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n * 0.6);
      d[i + 1] = clamp(d[i + 1] + n * 0.8);
      d[i + 2] = clamp(d[i + 2] + n * 0.5);
    }
  }
  ctx.putImageData(img, 0, 0);
  return makeTexture(canvas);
}

// -- Public API --

export function generateTerrainTextures() {
  return {
    grass:  generateGrass(),
    dirt:   generateDirt(),
    stone:  generateStone(),
    water:  generateWater(),
    forest: generateForest(),
  };
}
