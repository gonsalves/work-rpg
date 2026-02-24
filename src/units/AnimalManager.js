import { Animal } from '../scene/Animal.js';

/**
 * Spawns and manages wandering animals (cats, dogs, penguins)
 * that roam the map purely for visual charm.
 */

const ANIMAL_TYPES = ['cat', 'dog', 'penguin'];
const WANDER_SPEED = 1.2;      // tiles/sec — leisurely stroll
const PAUSE_MIN = 3;           // seconds
const PAUSE_MAX = 8;           // seconds
const WANDER_RADIUS = 6;       // max tiles from current position
const SPAWN_MIN_RADIUS = 4;    // min distance from map center to spawn
const SPAWN_MAX_RADIUS = 18;   // max distance from map center to spawn

export class AnimalManager {
  /**
   * @param {THREE.Scene} scene
   * @param {GameGrid} grid
   * @param {{x:number, z:number}} worldOffset
   */
  constructor(scene, grid, worldOffset) {
    this.scene = scene;
    this.grid = grid;
    this._offset = worldOffset;
    this._animals = []; // { animal: Animal, state: 'walking'|'idle', path, pathIndex, pauseTimer }
  }

  /**
   * Spawn a random assortment of animals.
   * @param {number} count — total animals to spawn (default 5-8)
   */
  spawn(count) {
    if (count == null) {
      count = 5 + Math.floor(Math.random() * 4); // 5-8
    }

    const cx = this.grid.width / 2;
    const cz = this.grid.height / 2;

    for (let i = 0; i < count; i++) {
      const type = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const animal = new Animal(type);

      // Find a random walkable spawn position
      const pos = this._randomWalkablePosition(cx, cz, SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS);
      if (!pos) continue;

      const world = this.grid.tileToWorld(pos.col, pos.row);
      const sx = world.x + this._offset.x;
      const sz = world.z + this._offset.z;
      animal.group.position.set(sx, 0, sz);

      this.scene.add(animal.group);

      this._animals.push({
        animal,
        state: 'idle',
        path: null,
        pathIndex: 0,
        pauseTimer: 1 + Math.random() * 3, // stagger initial pauses
        col: pos.col,
        row: pos.row,
      });
    }
  }

  /**
   * Update all animals each frame.
   */
  update(dt) {
    for (const entry of this._animals) {
      switch (entry.state) {
        case 'idle':
          this._handleIdle(entry, dt);
          break;
        case 'walking':
          this._handleWalking(entry, dt);
          break;
      }

      const isMoving = entry.state === 'walking';
      entry.animal.update(dt, isMoving);
    }
  }

  _handleIdle(entry, dt) {
    entry.pauseTimer -= dt;
    if (entry.pauseTimer <= 0) {
      // Pick a new wander target
      const target = this._randomWalkablePosition(entry.col, entry.row, 2, WANDER_RADIUS);
      if (target) {
        const path = this.grid.findPath(entry.col, entry.row, target.col, target.row);
        if (path && path.length > 1) {
          entry.path = path;
          entry.pathIndex = 0;
          entry.state = 'walking';
          return;
        }
      }
      // Couldn't find a path — try again soon
      entry.pauseTimer = 1 + Math.random() * 2;
    }
  }

  _handleWalking(entry, dt) {
    if (!entry.path || entry.pathIndex >= entry.path.length) {
      // Arrived — pause
      entry.state = 'idle';
      entry.pauseTimer = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN);
      entry.path = null;
      return;
    }

    const step = entry.path[entry.pathIndex];
    const targetWorld = this.grid.tileToWorld(step.col, step.row);
    const tx = targetWorld.x + this._offset.x;
    const tz = targetWorld.z + this._offset.z;

    const pos = entry.animal.group.position;
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
      entry.col = step.col;
      entry.row = step.row;
      entry.pathIndex++;
    } else {
      const move = Math.min(WANDER_SPEED * dt, dist);
      pos.x += (dx / dist) * move;
      pos.z += (dz / dist) * move;
      entry.animal.faceDirection(dx, dz, dt);
    }
  }

  /**
   * Find a random walkable tile within a radius ring.
   */
  _randomWalkablePosition(cx, cz, minR, maxR) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const col = Math.round(cx + Math.cos(angle) * r);
      const row = Math.round(cz + Math.sin(angle) * r);
      if (this.grid.inBounds(col, row) && this.grid.isWalkable(col, row)) {
        return { col, row };
      }
    }
    return null;
  }
}
