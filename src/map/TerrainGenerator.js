import { TileType } from './GameGrid.js';

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
    const baseRadius = 3;

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

        // Circular map boundary: water beyond radius 22
        if (dist > 22) {
          type = TileType.WATER;
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
      const minRadius = 6 + discoveryWeight * 4;
      const maxRadius = 12 + discoveryWeight * 8;
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
   * Place structures (milestones) in a semicircle around the base.
   */
  placeStructures(grid, milestones) {
    const cx = grid.width / 2;
    const cz = grid.height / 2;
    const structureRadius = 5;
    const positions = [];

    for (let i = 0; i < milestones.length; i++) {
      const angle = (Math.PI * 0.3) + (i / Math.max(1, milestones.length - 1)) * (Math.PI * 1.4);
      const col = Math.round(cx + Math.cos(angle) * structureRadius);
      const row = Math.round(cz + Math.sin(angle) * structureRadius);

      grid.setTile(col, row, { structureId: milestones[i].id, type: TileType.DIRT });

      positions.push({ col, row, milestoneId: milestones[i].id });
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
}
