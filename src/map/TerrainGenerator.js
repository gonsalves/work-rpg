import { TileType } from './GameGrid.js';
import { CONFIG } from '../utils/Config.js';

/**
 * Simple seeded PRNG (mulberry32) for deterministic terrain.
 */
function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple value noise for organic-looking terrain.
 */
function valueNoise(x, z, scale, rand) {
  const sx = Math.floor(x / scale);
  const sz = Math.floor(z / scale);
  const fx = (x / scale) - sx;
  const fz = (z / scale) - sz;

  // Hash corners
  const hash = (a, b) => {
    const h = ((a * 374761393 + b * 668265263 + 1234567) & 0x7fffffff);
    return (h % 1000) / 1000;
  };

  const v00 = hash(sx, sz);
  const v10 = hash(sx + 1, sz);
  const v01 = hash(sx, sz + 1);
  const v11 = hash(sx + 1, sz + 1);

  // Bilinear interpolation
  const smooth = t => t * t * (3 - 2 * t);
  const sfx = smooth(fx);
  const sfz = smooth(fz);

  return (v00 * (1 - sfx) + v10 * sfx) * (1 - sfz)
       + (v01 * (1 - sfx) + v11 * sfx) * sfz;
}

export class TerrainGenerator {
  generate(grid, seed = 42) {
    const rand = seededRandom(seed);
    const cx = grid.width / 2;
    const cz = grid.height / 2;
    const baseRadius = CONFIG.BASE_RADIUS;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const dx = col - cx;
        const dz = row - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Base area: cleared dirt
        if (dist < baseRadius) {
          grid.setTile(col, row, { type: TileType.DIRT, elevation: 0 });
          continue;
        }

        // Near base: mostly grass with some dirt paths
        const noise1 = valueNoise(col, row, 6, rand);
        const noise2 = valueNoise(col + 100, row + 100, 3, rand);
        const combined = noise1 * 0.6 + noise2 * 0.4;

        let type;
        if (dist < baseRadius + 2) {
          type = combined > 0.6 ? TileType.GRASS : TileType.DIRT;
        } else if (combined < 0.15 && dist > 8) {
          // Sparse water ponds in outer regions
          type = TileType.WATER;
        } else if (combined > 0.75 && dist > 6) {
          type = TileType.FOREST;
        } else if (combined > 0.55 && dist > 10) {
          type = TileType.STONE;
        } else {
          type = TileType.GRASS;
        }

        // Hexagonal map boundary: Catan-style hex edges with organic noise
        const hexRadius = Math.min(grid.width, grid.height) * 0.48;
        const hexDist = this._hexDistance(dx, dz, hexRadius);

        // Organic coastline noise (two octaves blended)
        const coastNoise1 = valueNoise(col * 0.3, row * 0.3, 4, null);
        const coastNoise2 = valueNoise(col * 0.7 + 50, row * 0.7 + 50, 3, null);
        const edgeVariation = ((coastNoise1 + coastNoise2 * 0.5) / 1.5 - 0.5) * 0.18;

        const edgeDist = hexDist + edgeVariation;
        if (edgeDist > 1.12) {
          type = TileType.VOID;  // Beyond map outline — not rendered
        } else if (edgeDist > 1.0) {
          type = TileType.WATER; // Thin coastal water strip
        } else if (edgeDist > 0.90) {
          type = TileType.DIRT;  // Sandy shore band
        }

        grid.setTile(col, row, { type, elevation: 0 });
      }
    }
  }

  /**
   * Place resource nodes on the grid for each task.
   * Positions are deterministic based on task ID.
   * Higher discovery % tasks are placed farther from center.
   */
  placeResourceNodes(grid, tasks) {
    const cx = grid.width / 2;
    const cz = grid.height / 2;
    const nodes = [];

    for (const task of tasks) {
      // Hash task ID to get a deterministic seed
      let hash = 0;
      for (let i = 0; i < task.id.length; i++) {
        hash = ((hash << 5) - hash + task.id.charCodeAt(i)) | 0;
      }
      const rand = seededRandom(Math.abs(hash));

      // Place farther from center if more discovery-heavy
      const discoveryWeight = task.discoveryPercent / 100;
      const minRadius = (CONFIG.BASE_RADIUS + 3) + discoveryWeight * 4;
      const maxRadius = (CONFIG.BASE_RADIUS + 6) + discoveryWeight * 8;
      const radius = minRadius + rand() * (maxRadius - minRadius);
      const angle = rand() * Math.PI * 2;

      let col = Math.round(cx + Math.cos(angle) * radius);
      let row = Math.round(cz + Math.sin(angle) * radius);

      // Clamp to grid and ensure walkable
      col = Math.max(1, Math.min(grid.width - 2, col));
      row = Math.max(1, Math.min(grid.height - 2, row));

      // If tile is water, nudge to nearest walkable
      if (!grid.isWalkable(col, row)) {
        const found = this._findNearestWalkable(grid, col, row);
        if (found) {
          col = found.col;
          row = found.row;
        }
      }

      grid.setTile(col, row, { resourceNodeId: task.id, type: TileType.GRASS });

      nodes.push({
        col,
        row,
        resourceType: task.category || 'Unknown',
        taskId: task.id,
        depleted: task.percentComplete >= 100,
      });
    }

    return nodes;
  }

  /**
   * Place structures (milestones) scattered across the map.
   * Positions are deterministic based on milestone ID hash.
   */
  placeStructures(grid, milestones) {
    const cx = grid.width / 2;
    const cz = grid.height / 2;
    const positions = [];

    for (const milestone of milestones) {
      // Hash milestone ID for deterministic placement
      let hash = 0;
      for (let i = 0; i < milestone.id.length; i++) {
        hash = ((hash << 5) - hash + milestone.id.charCodeAt(i)) | 0;
      }
      const rand = seededRandom(Math.abs(hash) + 9999); // offset to avoid overlap with resource seeds

      // Place at radii outside base, within walkable area
      const minRadius = CONFIG.BASE_RADIUS + 6;
      const maxRadius = CONFIG.BASE_RADIUS + 14;
      const radius = minRadius + rand() * (maxRadius - minRadius);
      const angle = rand() * Math.PI * 2;

      let col = Math.round(cx + Math.cos(angle) * radius);
      let row = Math.round(cz + Math.sin(angle) * radius);

      // Clamp to grid and ensure walkable
      col = Math.max(2, Math.min(grid.width - 3, col));
      row = Math.max(2, Math.min(grid.height - 3, row));

      if (!grid.isWalkable(col, row)) {
        const found = this._findNearestWalkable(grid, col, row);
        if (found) {
          col = found.col;
          row = found.row;
        }
      }

      grid.setTile(col, row, { structureId: milestone.id, type: TileType.DIRT });
      positions.push({ col, row, milestoneId: milestone.id });
    }

    return positions;
  }

  _findNearestWalkable(grid, col, row) {
    for (let r = 1; r < 5; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          const nc = col + dc;
          const nr = row + dr;
          if (grid.isWalkable(nc, nr)) return { col: nc, row: nr };
        }
      }
    }
    return null;
  }

  /**
   * Normalized hexagonal distance from center (flat-top hex).
   * Flat edges face north/south, vertices point east/west.
   * Returns 0 at center, 1.0 at hex boundary, >1.0 outside.
   * @param {number} dx - horizontal offset from center
   * @param {number} dz - vertical offset from center
   * @param {number} radius - hex circumradius (center to vertex distance)
   */
  _hexDistance(dx, dz, radius) {
    const nx = dx / radius;
    const nz = dz / radius;
    // Three constraint axes for flat-top hex:
    // a: north/south flat edges (closest to center at R*√3/2)
    // b,c: angled edges at ±60°
    const a = Math.abs(nz) * 1.1547;            // 2/√3 ≈ 1.1547
    const b = Math.abs(nx + nz * 0.57735);      // 1/√3 ≈ 0.57735
    const c = Math.abs(nx - nz * 0.57735);
    return Math.max(a, b, c);
  }
}
