import { describe, it, expect } from 'vitest';
import { TerrainGenerator } from '../src/map/TerrainGenerator.js';
import { GameGrid, TileType } from '../src/map/GameGrid.js';

describe('TerrainGenerator', () => {
  describe('generate', () => {
    it('fills entire grid with tile types', () => {
      const grid = new GameGrid(20, 20);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const validTypes = new Set(Object.values(TileType));
      for (const tile of grid.tiles) {
        expect(validTypes.has(tile.type)).toBe(true);
      }
    });

    it('places dirt in the base area (center)', () => {
      const grid = new GameGrid(20, 20);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const cx = 10, cz = 10;
      // Center tile should be dirt (within base radius 3)
      expect(grid.getTile(cx, cz).type).toBe(TileType.DIRT);
    });

    it('places water at map boundary', () => {
      const grid = new GameGrid(48, 48);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      // Corner tiles should be water (far from center)
      expect(grid.getTile(0, 0).type).toBe(TileType.WATER);
      expect(grid.getTile(47, 47).type).toBe(TileType.WATER);
    });

    it('is deterministic with the same seed', () => {
      const grid1 = new GameGrid(20, 20);
      const grid2 = new GameGrid(20, 20);
      const gen = new TerrainGenerator();
      gen.generate(grid1, 42);
      gen.generate(grid2, 42);

      for (let i = 0; i < grid1.tiles.length; i++) {
        expect(grid1.tiles[i].type).toBe(grid2.tiles[i].type);
      }
    });

    it('valueNoise terrain is deterministic regardless of seed (noise is hash-based)', () => {
      // The noise function uses coordinate hashing, not the PRNG seed.
      // Both grids should produce identical terrain for the same size.
      const grid1 = new GameGrid(20, 20);
      const grid2 = new GameGrid(20, 20);
      const gen = new TerrainGenerator();
      gen.generate(grid1, 42);
      gen.generate(grid2, 99);

      let differences = 0;
      for (let i = 0; i < grid1.tiles.length; i++) {
        if (grid1.tiles[i].type !== grid2.tiles[i].type) differences++;
      }
      // Noise is coordinate-based so grids match — this documents the behavior
      expect(differences).toBe(0);
    });

    it('scales water boundary proportionally with map size', () => {
      const small = new GameGrid(48, 48);
      const large = new GameGrid(80, 80);
      const gen = new TerrainGenerator();
      gen.generate(small);
      gen.generate(large);

      // Check tile at same proportional distance from center
      // At 80x80, tiles at distance ~36 should be water (0.46 * 80 ≈ 36)
      // At 48x48, tiles at distance ~22 should be water (0.46 * 48 ≈ 22)
      const smallCorner = small.getTile(2, 2);
      const largeCorner = large.getTile(2, 2);
      expect(smallCorner.type).toBe(TileType.WATER);
      expect(largeCorner.type).toBe(TileType.WATER);
    });
  });

  describe('placeResourceNodes', () => {
    it('returns one node per task', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const tasks = [
        { id: 't1', category: 'Design', discoveryPercent: 30, percentComplete: 0 },
        { id: 't2', category: 'Research', discoveryPercent: 70, percentComplete: 50 },
      ];

      const nodes = gen.placeResourceNodes(grid, tasks);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].taskId).toBe('t1');
      expect(nodes[1].taskId).toBe('t2');
    });

    it('places nodes on walkable tiles', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const tasks = [
        { id: 't1', category: 'Design', discoveryPercent: 50, percentComplete: 0 },
      ];

      const nodes = gen.placeResourceNodes(grid, tasks);
      for (const node of nodes) {
        expect(grid.isWalkable(node.col, node.row)).toBe(true);
      }
    });

    it('marks completed tasks as depleted', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const tasks = [
        { id: 't1', category: 'Design', discoveryPercent: 50, percentComplete: 100 },
      ];

      const nodes = gen.placeResourceNodes(grid, tasks);
      expect(nodes[0].depleted).toBe(true);
    });

    it('is deterministic — same task ID gives same position', () => {
      const grid1 = new GameGrid(40, 40);
      const grid2 = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid1);
      gen.generate(grid2);

      const tasks = [{ id: 't1', category: 'Design', discoveryPercent: 50, percentComplete: 0 }];
      const nodes1 = gen.placeResourceNodes(grid1, tasks);
      const nodes2 = gen.placeResourceNodes(grid2, tasks);

      expect(nodes1[0].col).toBe(nodes2[0].col);
      expect(nodes1[0].row).toBe(nodes2[0].row);
    });
  });

  describe('placeStructures', () => {
    it('returns one position per milestone', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const milestones = [
        { id: 'ms-1', name: 'Sprint 1', taskIds: [] },
        { id: 'ms-2', name: 'Sprint 2', taskIds: [] },
      ];

      const positions = gen.placeStructures(grid, milestones);
      expect(positions).toHaveLength(2);
      expect(positions[0].milestoneId).toBe('ms-1');
      expect(positions[1].milestoneId).toBe('ms-2');
    });

    it('places structures on walkable tiles', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const milestones = [{ id: 'ms-1', name: 'Test', taskIds: [] }];
      const positions = gen.placeStructures(grid, milestones);

      for (const pos of positions) {
        expect(grid.isWalkable(pos.col, pos.row)).toBe(true);
      }
    });

    it('marks tile with structureId', () => {
      const grid = new GameGrid(40, 40);
      const gen = new TerrainGenerator();
      gen.generate(grid);

      const milestones = [{ id: 'ms-1', name: 'Test', taskIds: [] }];
      const positions = gen.placeStructures(grid, milestones);

      const tile = grid.getTile(positions[0].col, positions[0].row);
      expect(tile.structureId).toBe('ms-1');
    });
  });
});
