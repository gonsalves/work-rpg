import * as THREE from 'three';

/**
 * Generates procedural terrain textures on Canvas2D.
 * Produces tileable 256×256 textures for each terrain type using
 * the same value-noise approach as TerrainGenerator.
 */

const SIZE = 256;

// ── Noise helpers (same hash as TerrainGenerator) ────────────────────

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

/** Seeded PRNG (mulberry32) — same as TerrainGenerator */
function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Canvas helpers ───────────────────────────────────────────────────

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

// ── Texture generators ──────────────────────────────────────────────

/**
 * GRASS — base 0x4a7c3f (74, 124, 63)
 * Two noise octaves for patchy variation + short blade marks.
 */
function generateGrass() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a7c3f';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Pixel-level noise variation
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n1 = (noise(x, y, 40) - 0.5) * 30;      // broad patches
      const n2 = (noise(x + 500, y + 500, 12) - 0.5) * 16; // finer detail
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n1 * 0.5 + n2 * 0.4);  // R (less change)
      d[i + 1] = clamp(d[i + 1] + n1 + n2);               // G (most change)
      d[i + 2] = clamp(d[i + 2] + n1 * 0.3 + n2 * 0.3);  // B (least)
    }
  }
  ctx.putImageData(img, 0, 0);

  // Grass blade marks
  const rand = seededRandom(101);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 250; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const angle = rand() * Math.PI;
    const len = 3 + rand() * 5;
    ctx.strokeStyle = `rgba(80, 150, 65, ${0.2 + rand() * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  return makeTexture(canvas);
}

/**
 * DIRT — base 0x8b7355 (139, 115, 85)
 * Earthy noise + pebble dots + thin scratches.
 */
function generateDirt() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 30) - 0.5) * 24;
      const n2 = (noise(x + 200, y + 200, 8) - 0.5) * 10;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n + n2);
      d[i + 1] = clamp(d[i + 1] + n * 0.8 + n2 * 0.8);
      d[i + 2] = clamp(d[i + 2] + n * 0.6 + n2 * 0.6);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Pebbles
  const rand = seededRandom(202);
  for (let i = 0; i < 60; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 1.5 + rand() * 2;
    const shade = 100 + Math.floor(rand() * 60);
    ctx.fillStyle = `rgba(${shade}, ${shade - 15}, ${shade - 30}, 0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const angle = rand() * Math.PI;
    const len = 8 + rand() * 15;
    ctx.strokeStyle = 'rgba(100, 80, 60, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  return makeTexture(canvas);
}

/**
 * STONE — base 0x808080 (128, 128, 128)
 * Voronoi cell pattern creating a cracked flagstone look.
 */
function generateStone() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Generate Voronoi seed points
  const rand = seededRandom(303);
  const numSeeds = 16;
  const seeds = [];
  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: rand() * SIZE,
      y: rand() * SIZE,
      shade: 118 + Math.floor(rand() * 20), // slight variation per cell
    });
  }

  // For each pixel, find nearest and second-nearest seed (toroidal for tiling)
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let d1 = Infinity, d2 = Infinity;
      let nearestShade = 128;

      for (const seed of seeds) {
        // Toroidal distance for seamless tiling
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
        // Crack line — darker
        const v = nearestShade - 35;
        d[i] = v; d[i + 1] = v; d[i + 2] = v;
      } else {
        // Cell interior with subtle noise
        const n = (noise(px, py, 15) - 0.5) * 8;
        const v = clamp(nearestShade + n);
        d[i] = v; d[i + 1] = v; d[i + 2] = v;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  return makeTexture(canvas);
}

/**
 * WATER — base 0x3d6b8e (61, 107, 142)
 * Soft noise + sinusoidal wave bands.
 */
function generateWater() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d6b8e';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle depth variation
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = (noise(x, y, 50) - 0.5) * 10;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n * 0.3);
      d[i + 1] = clamp(d[i + 1] + n * 0.6);
      d[i + 2] = clamp(d[i + 2] + n);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Wave bands
  ctx.lineWidth = 2.5;
  const waveCount = 5;
  for (let w = 0; w < waveCount; w++) {
    const baseY = (SIZE / (waveCount + 1)) * (w + 1);
    ctx.strokeStyle = `rgba(90, 160, 200, 0.2)`;
    ctx.beginPath();
    for (let x = 0; x <= SIZE; x++) {
      const y = baseY + Math.sin(x * 0.04 + w * 1.5) * 4
                      + Math.sin(x * 0.09 + w * 3.0) * 2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // A few lighter caustic highlights
  const rand = seededRandom(404);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 20; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 5 + rand() * 12;
    ctx.fillStyle = '#80c0e0';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return makeTexture(canvas);
}

/**
 * FOREST — base 0x2d5a2d (45, 90, 45)
 * Dark undergrowth with canopy shadow spots.
 */
function generateForest() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2d5a2d';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Noise — darker and more muted than grass
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n1 = (noise(x, y, 35) - 0.5) * 18;
      const n2 = (noise(x + 300, y + 300, 10) - 0.5) * 10;
      const i = (y * SIZE + x) * 4;
      d[i]     = clamp(d[i]     + n1 * 0.3 + n2 * 0.3);
      d[i + 1] = clamp(d[i + 1] + n1 * 0.7 + n2 * 0.6);
      d[i + 2] = clamp(d[i + 2] + n1 * 0.2 + n2 * 0.2);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Shadow spots — simulating canopy overhead
  const rand = seededRandom(505);
  for (let i = 0; i < 10; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 12 + rand() * 18;
    ctx.fillStyle = `rgba(20, 45, 20, ${0.12 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A few tiny leaf-like marks
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const len = 2 + rand() * 3;
    const angle = rand() * Math.PI * 2;
    ctx.strokeStyle = `rgba(55, 110, 50, ${0.2 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  return makeTexture(canvas);
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Generate all terrain textures. Returns a plain object keyed by TileType string.
 * Call once during boot(). Synchronous — no network requests.
 */
export function generateTerrainTextures() {
  return {
    grass:  generateGrass(),
    dirt:   generateDirt(),
    stone:  generateStone(),
    water:  generateWater(),
    forest: generateForest(),
  };
}
