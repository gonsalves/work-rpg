import { describe, it, expect } from 'vitest';
import { GameGrid, TileType, FogState } from '../src/map/GameGrid.js';

describe('GameGrid', () => {
  describe('construction', () => {
    it('creates a grid with correct dimensions', () => {
      const grid = new GameGrid(10, 8);
      expect(grid.width).toBe(10);
      expect(grid.height).toBe(8);
      expect(grid.tiles).toHaveLength(80);
    });

    it('initializes all tiles as GRASS with HIDDEN fog', () => {
      const grid = new GameGrid(4, 4);
      for (const tile of grid.tiles) {
        expect(tile.type).toBe(TileType.GRASS);
        expect(tile.fogState).toBe(FogState.HIDDEN);
        expect(tile.elevation).toBe(0);
        expect(tile.resourceNodeId).toBeNull();
        expect(tile.structureId).toBeNull();
      }
    });
  });

  describe('inBounds', () => {
    const grid = new GameGrid(10, 10);

    it('returns true for valid coordinates', () => {
      expect(grid.inBounds(0, 0)).toBe(true);
      expect(grid.inBounds(9, 9)).toBe(true);
      expect(grid.inBounds(5, 5)).toBe(true);
    });

    it('returns false for out-of-bounds coordinates', () => {
      expect(grid.inBounds(-1, 0)).toBe(false);
      expect(grid.inBounds(0, -1)).toBe(false);
      expect(grid.inBounds(10, 0)).toBe(false);
      expect(grid.inBounds(0, 10)).toBe(false);
    });
  });

  describe('getTile / setTile', () => {
    it('gets and sets tile data', () => {
      const grid = new GameGrid(10, 10);
      grid.setTile(3, 4, { type: TileType.WATER });
      const tile = grid.getTile(3, 4);
      expect(tile.type).toBe(TileType.WATER);
    });

    it('returns null for out-of-bounds', () => {
      const grid = new GameGrid(5, 5);
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(5, 5)).toBeNull();
    });

    it('setTile ignores out-of-bounds silently', () => {
      const grid = new GameGrid(5, 5);
      grid.setTile(-1, 0, { type: TileType.WATER }); // should not throw
    });
  });

  describe('coordinate conversion', () => {
    const grid = new GameGrid(10, 10);

    it('tileToWorld returns tile center', () => {
      expect(grid.tileToWorld(0, 0)).toEqual({ x: 0.5, z: 0.5 });
      expect(grid.tileToWorld(3, 7)).toEqual({ x: 3.5, z: 7.5 });
    });

    it('worldToTile floors coordinates', () => {
      expect(grid.worldToTile(0.5, 0.5)).toEqual({ col: 0, row: 0 });
      expect(grid.worldToTile(3.9, 7.1)).toEqual({ col: 3, row: 7 });
    });

    it('tileToWorld and worldToTile are inverse at tile centers', () => {
      const world = grid.tileToWorld(5, 3);
      const tile = grid.worldToTile(world.x, world.z);
      expect(tile).toEqual({ col: 5, row: 3 });
    });
  });

  describe('isWalkable', () => {
    it('grass is walkable', () => {
      const grid = new GameGrid(5, 5);
      expect(grid.isWalkable(0, 0)).toBe(true);
    });

    it('water is not walkable', () => {
      const grid = new GameGrid(5, 5);
      grid.setTile(2, 2, { type: TileType.WATER });
      expect(grid.isWalkable(2, 2)).toBe(false);
    });

    it('dirt, stone are walkable; forest is not', () => {
      const grid = new GameGrid(5, 5);
      grid.setTile(0, 0, { type: TileType.FOREST });
      grid.setTile(1, 0, { type: TileType.DIRT });
      grid.setTile(2, 0, { type: TileType.STONE });
      expect(grid.isWalkable(0, 0)).toBe(false);
      expect(grid.isWalkable(1, 0)).toBe(true);
      expect(grid.isWalkable(2, 0)).toBe(true);
    });

    it('out-of-bounds is not walkable', () => {
      const grid = new GameGrid(5, 5);
      expect(grid.isWalkable(-1, 0)).toBe(false);
      expect(grid.isWalkable(5, 5)).toBe(false);
    });
  });

  describe('getNeighbors', () => {
    it('returns 4 neighbors for interior tile', () => {
      const grid = new GameGrid(10, 10);
      const neighbors = grid.getNeighbors(5, 5);
      expect(neighbors).toHaveLength(4);
      expect(neighbors).toContainEqual({ col: 5, row: 4 });
      expect(neighbors).toContainEqual({ col: 5, row: 6 });
      expect(neighbors).toContainEqual({ col: 4, row: 5 });
      expect(neighbors).toContainEqual({ col: 6, row: 5 });
    });

    it('returns 2 neighbors for corner tile', () => {
      const grid = new GameGrid(10, 10);
      const neighbors = grid.getNeighbors(0, 0);
      expect(neighbors).toHaveLength(2);
    });

    it('returns 3 neighbors for edge tile', () => {
      const grid = new GameGrid(10, 10);
      const neighbors = grid.getNeighbors(5, 0);
      expect(neighbors).toHaveLength(3);
    });
  });

  describe('getTilesInRadius', () => {
    it('returns tiles within circular radius', () => {
      const grid = new GameGrid(20, 20);
      const tiles = grid.getTilesInRadius(10, 10, 2);
      expect(tiles.length).toBeGreaterThan(0);

      // All returned tiles should be within radius
      for (const { col, row } of tiles) {
        const dx = col - 10;
        const dr = row - 10;
        expect(dx * dx + dr * dr).toBeLessThanOrEqual(4);
      }
    });

    it('returns single tile for radius 0', () => {
      const grid = new GameGrid(10, 10);
      const tiles = grid.getTilesInRadius(5, 5, 0);
      expect(tiles).toHaveLength(1);
      expect(tiles[0].col).toBe(5);
      expect(tiles[0].row).toBe(5);
    });
  });

  describe('fog operations', () => {
    it('revealTilesInRadius reveals hidden tiles', () => {
      const grid = new GameGrid(20, 20);
      const revealed = grid.revealTilesInRadius(10, 10, 3);
      expect(revealed.length).toBeGreaterThan(0);

      for (const { col, row } of revealed) {
        expect(grid.getTile(col, row).fogState).toBe(FogState.REVEALED);
      }
    });

    it('revealTilesInRadius skips already revealed tiles', () => {
      const grid = new GameGrid(20, 20);
      const first = grid.revealTilesInRadius(10, 10, 2);
      const second = grid.revealTilesInRadius(10, 10, 2);
      expect(second).toHaveLength(0); // all already revealed
    });

    it('setVisible and setRevealed change fog state', () => {
      const grid = new GameGrid(10, 10);
      grid.getTile(5, 5).fogState = FogState.REVEALED;

      grid.setVisible(5, 5);
      expect(grid.getTile(5, 5).fogState).toBe(FogState.VISIBLE);

      grid.setRevealed(5, 5);
      expect(grid.getTile(5, 5).fogState).toBe(FogState.REVEALED);
    });

    it('setRevealed only downgrades from VISIBLE', () => {
      const grid = new GameGrid(10, 10);
      // HIDDEN -> setRevealed should do nothing
      grid.setRevealed(5, 5);
      expect(grid.getTile(5, 5).fogState).toBe(FogState.HIDDEN);
    });
  });

  describe('A* pathfinding', () => {
    it('finds a straight path on open grid', () => {
      const grid = new GameGrid(10, 10);
      const path = grid.findPath(0, 0, 3, 0);
      expect(path).not.toBeNull();
      expect(path[0]).toEqual({ col: 0, row: 0 });
      expect(path[path.length - 1]).toEqual({ col: 3, row: 0 });
      // Path length should be 4 (start + 3 steps)
      expect(path).toHaveLength(4);
    });

    it('finds path around obstacles', () => {
      const grid = new GameGrid(10, 10);
      // Create a wall of water at col=5
      for (let r = 0; r < 8; r++) {
        grid.setTile(5, r, { type: TileType.WATER });
      }
      // Leave a gap at row 8
      const path = grid.findPath(3, 5, 7, 5);
      expect(path).not.toBeNull();
      expect(path[path.length - 1]).toEqual({ col: 7, row: 5 });

      // Path should not cross any water
      for (const step of path) {
        expect(grid.getTile(step.col, step.row).type).not.toBe(TileType.WATER);
      }
    });

    it('returns null when destination is water', () => {
      const grid = new GameGrid(10, 10);
      grid.setTile(5, 5, { type: TileType.WATER });
      const path = grid.findPath(0, 0, 5, 5);
      expect(path).toBeNull();
    });

    it('returns null when no path exists', () => {
      const grid = new GameGrid(10, 10);
      // Surround destination with water
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          grid.setTile(5 + dc, 5 + dr, { type: TileType.WATER });
        }
      }
      // Also block the 4-directional neighbors specifically
      grid.setTile(4, 5, { type: TileType.WATER });
      grid.setTile(6, 5, { type: TileType.WATER });
      grid.setTile(5, 4, { type: TileType.WATER });
      grid.setTile(5, 6, { type: TileType.WATER });
      const path = grid.findPath(0, 0, 5, 5);
      expect(path).toBeNull();
    });

    it('returns single-node path when start equals goal', () => {
      const grid = new GameGrid(10, 10);
      const path = grid.findPath(5, 5, 5, 5);
      expect(path).toEqual([{ col: 5, row: 5 }]);
    });

    it('path steps are adjacent (4-directional)', () => {
      const grid = new GameGrid(10, 10);
      const path = grid.findPath(0, 0, 5, 5);
      expect(path).not.toBeNull();
      for (let i = 1; i < path.length; i++) {
        const dc = Math.abs(path[i].col - path[i - 1].col);
        const dr = Math.abs(path[i].row - path[i - 1].row);
        expect(dc + dr).toBe(1); // exactly one step in one direction
      }
    });
  });
});
