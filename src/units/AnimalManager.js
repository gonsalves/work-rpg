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
const SEPARATION_RADIUS = 0.8;
const SEPARATION_STRENGTH = 1.5;

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
    this._animals = []; // { animal: Animal, state: 'walking'|'idle', path, pathIndex, pauseTimer, spawned }
    this._doorExitPositions = []; // set by setDoorExitPositions
  }

  /**
   * Set the base gate exit positions (grid-world coords) for spawn placement.
   * @param {Array<{x:number, z:number}>} positions
   */
  setDoorExitPositions(positions) {
    this._doorExitPositions = positions;
  }

  /**
   * Spawn a random assortment of animals.
   * All start hidden at the door exit position (spawn sequencer reveals them).
   * @param {number} count — total animals to spawn (default 5-8)
   */
  spawn(count) {
    if (count == null) {
      count = 5 + Math.floor(Math.random() * 4); // 5-8
    }

    for (let i = 0; i < count; i++) {
      const type = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const animal = new Animal(type);

      // Start at a gate exit position (cycle through gates), hidden
      if (this._doorExitPositions.length > 0) {
        const exitPos = this._doorExitPositions[i % this._doorExitPositions.length];
        const sx = exitPos.x + this._offset.x;
        const sz = exitPos.z + this._offset.z;
        animal.group.position.set(sx, 0, sz);
      }

      animal.group.visible = false;
      this.scene.add(animal.group);

      // Pick a random wander target position for after spawning
      const cx = this.grid.width / 2;
      const cz = this.grid.height / 2;
      const wanderHome = this._randomWalkablePosition(cx, cz, SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS);

      this._animals.push({
        animal,
        state: 'idle',
        path: null,
        pathIndex: 0,
        pauseTimer: 999, // paused until spawned
        col: wanderHome ? wanderHome.col : Math.floor(cx),
        row: wanderHome ? wanderHome.row : Math.floor(cz),
        spawned: false,
        wanderHome, // remember target area for post-spawn
      });
    }
  }

  /**
   * Mark an animal as having completed the spawn sequence.
   * Makes it start wandering.
   */
  markSpawned(index) {
    const entry = this._animals[index];
    if (!entry) return;
    entry.spawned = true;
    entry.pauseTimer = 0.5 + Math.random() * 1; // brief pause then wander
  }

  /**
   * Get list of animal groups for spawn sequencing.
   */
  getAnimalList() {
    return this._animals.map((entry, index) => ({
      index,
      animal: entry.animal,
      group: entry.animal.group,
    }));
  }

  /**
   * Update all animals each frame.
   * @param {number} dt
   * @param {Array<{x:number, z:number}>} [unitPositions] — scene positions of people units
   */
  update(dt, unitPositions) {
    this._unitPositions = unitPositions || [];

    for (let i = 0; i < this._animals.length; i++) {
      const entry = this._animals[i];
      // Skip unspawned animals
      if (!entry.spawned) continue;

      switch (entry.state) {
        case 'idle':
          this._handleIdle(entry, dt);
          break;
        case 'walking':
          this._handleWalking(entry, dt, i);
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

  _handleWalking(entry, dt, animalIdx) {
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
      let moveX = (dx / dist) * move;
      let moveZ = (dz / dist) * move;

      // Separation from other animals
      let sepX = 0;
      let sepZ = 0;
      for (let i = 0; i < this._animals.length; i++) {
        if (i === animalIdx || !this._animals[i].spawned) continue;
        const otherPos = this._animals[i].animal.group.position;
        const ox = pos.x - otherPos.x;
        const oz = pos.z - otherPos.z;
        const oDist = Math.sqrt(ox * ox + oz * oz);
        if (oDist < SEPARATION_RADIUS && oDist > 0.01) {
          const factor = (1 - oDist / SEPARATION_RADIUS) * SEPARATION_STRENGTH * dt;
          sepX += (ox / oDist) * factor;
          sepZ += (oz / oDist) * factor;
        }
      }
      // Separation from people units
      for (const unitPos of this._unitPositions) {
        const ox = pos.x - unitPos.x;
        const oz = pos.z - unitPos.z;
        const oDist = Math.sqrt(ox * ox + oz * oz);
        if (oDist < SEPARATION_RADIUS && oDist > 0.01) {
          const factor = (1 - oDist / SEPARATION_RADIUS) * SEPARATION_STRENGTH * dt;
          sepX += (ox / oDist) * factor;
          sepZ += (oz / oDist) * factor;
        }
      }
      moveX += sepX;
      moveZ += sepZ;

      pos.x += moveX;
      pos.z += moveZ;
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
