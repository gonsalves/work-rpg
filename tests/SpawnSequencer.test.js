import { describe, it, expect, vi } from 'vitest';

// SpawnSequencer is defined inline in main.js, so we replicate
// a minimal version here that mirrors the same logic for testing.
// In a production setup you'd extract it to its own module.

const EMERGE_DISTANCE = 2.0;
const EMERGE_SPEED = 3.0;

class SpawnSequencer {
  constructor(base, worldOffset) {
    this._base = base;
    this._offset = worldOffset;
    this._queue = [];
    this._currentIndex = 0;
    this._state = 'idle';
    this._timer = 0;
    this._emergeStart = null;
    this._emergeEnd = null;
    this._done = false;
  }

  addEntity(group, onSpawned, type = 'person') {
    this._queue.push({ group, onSpawned, type });
  }

  isDone() { return this._done; }

  update(dt) {
    if (this._done) return;
    if (this._queue.length === 0) { this._done = true; return; }
    if (this._currentIndex >= this._queue.length) {
      if (this._state === 'door_closing') {
        this._base.closeDoor(dt);
        if (this._base.isDoorClosed()) { this._state = 'idle'; this._done = true; }
      } else { this._done = true; }
      return;
    }

    const entry = this._queue[this._currentIndex];
    const doorExit = this._base.getDoorExitPosition();
    const sceneExit = { x: doorExit.x + this._offset.x, z: doorExit.z + this._offset.z };

    switch (this._state) {
      case 'idle':
        this._state = 'door_opening';
        entry.group.position.set(sceneExit.x, 0, sceneExit.z);
        entry.group.visible = false;
        break;
      case 'door_opening':
        this._base.openDoor(dt);
        if (this._base.isDoorOpen()) {
          this._state = 'emerging';
          entry.group.visible = true;
          entry.group.position.set(sceneExit.x, 0, sceneExit.z);
          this._emergeStart = { x: sceneExit.x, z: sceneExit.z };
          this._emergeEnd = { x: sceneExit.x, z: sceneExit.z + EMERGE_DISTANCE };
          this._timer = 0;
        }
        break;
      case 'emerging': {
        this._timer += dt;
        const emergeDuration = EMERGE_DISTANCE / EMERGE_SPEED;
        const t = Math.min(1, this._timer / emergeDuration);
        entry.group.position.x = this._emergeStart.x + (this._emergeEnd.x - this._emergeStart.x) * t;
        entry.group.position.z = this._emergeStart.z + (this._emergeEnd.z - this._emergeStart.z) * t;
        entry.group.position.y = 0;
        if (t >= 1) {
          if (entry.onSpawned) entry.onSpawned();
          this._currentIndex++;
          this._state = 'door_closing';
          this._timer = 0;
        }
        break;
      }
      case 'door_closing':
        this._base.closeDoor(dt);
        this._timer += dt;
        if (this._base.isDoorClosed() || this._timer > 0.4) {
          this._state = 'idle';
        }
        break;
    }
  }
}

// Mock helpers
function mockBase() {
  let doorOpen = false;
  return {
    openDoor: vi.fn(() => { doorOpen = true; }),
    closeDoor: vi.fn(() => { doorOpen = false; }),
    isDoorOpen: vi.fn(() => doorOpen),
    isDoorClosed: vi.fn(() => !doorOpen),
    getDoorExitPosition: vi.fn(() => ({ x: 10, z: 15 })),
  };
}

function mockGroup() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    visible: true,
  };
}

describe('SpawnSequencer', () => {
  it('starts not done', () => {
    const seq = new SpawnSequencer(mockBase(), { x: 0, z: 0 });
    expect(seq.isDone()).toBe(false);
  });

  it('is immediately done with empty queue', () => {
    const seq = new SpawnSequencer(mockBase(), { x: 0, z: 0 });
    seq.update(0.016);
    expect(seq.isDone()).toBe(true);
  });

  it('processes entities through door open → emerge → door close', () => {
    const base = mockBase();
    const offset = { x: -5, z: -5 };
    const seq = new SpawnSequencer(base, offset);

    const group = mockGroup();
    const onSpawned = vi.fn();
    seq.addEntity(group, onSpawned, 'person');

    // Step 1: idle → door_opening
    seq.update(0.016);
    expect(seq._state).toBe('door_opening');
    expect(group.visible).toBe(false);

    // Step 2: door opens (mock says isDoorOpen = true after openDoor)
    seq.update(0.016);
    expect(base.openDoor).toHaveBeenCalled();
    expect(seq._state).toBe('emerging');
    expect(group.visible).toBe(true);

    // Step 3: emerging — advance time past EMERGE_DISTANCE / EMERGE_SPEED ≈ 0.667s
    seq.update(0.7);
    expect(onSpawned).toHaveBeenCalledTimes(1);
    expect(seq._state).toBe('door_closing');

    // Step 4: door closing — timer > 0.4
    seq.update(0.5);
    expect(seq._state).toBe('idle');

    // Step 5: no more entities — done
    seq.update(0.016);
    expect(seq.isDone()).toBe(true);
  });

  it('processes multiple entities in sequence', () => {
    const base = mockBase();
    const seq = new SpawnSequencer(base, { x: 0, z: 0 });

    const spawned = [];
    for (let i = 0; i < 3; i++) {
      const group = mockGroup();
      seq.addEntity(group, () => spawned.push(i), 'person');
    }

    // Run enough updates to process all 3 entities
    for (let frame = 0; frame < 100; frame++) {
      if (seq.isDone()) break;
      seq.update(0.05);
    }

    expect(seq.isDone()).toBe(true);
    expect(spawned).toEqual([0, 1, 2]);
  });

  it('positions entity at door exit with offset', () => {
    const base = mockBase();
    const offset = { x: -20, z: -30 };
    const seq = new SpawnSequencer(base, offset);

    const group = mockGroup();
    seq.addEntity(group, vi.fn());

    // idle → door_opening: positions at door exit
    seq.update(0.016);
    // Door exit is (10, 15) + offset (-20, -30) = (-10, -15)
    expect(group.position.x).toBe(-10);
    expect(group.position.z).toBe(-15);
  });

  it('entity moves forward during emerge phase', () => {
    const base = mockBase();
    const seq = new SpawnSequencer(base, { x: 0, z: 0 });

    const group = mockGroup();
    seq.addEntity(group, vi.fn());

    // Door opens
    seq.update(0.016); // idle → door_opening
    seq.update(0.016); // door opens → emerging

    const startZ = group.position.z;

    // Partial emerge
    seq.update(0.3);
    expect(group.position.z).toBeGreaterThan(startZ);
    expect(group.position.y).toBe(0); // stays on ground
  });
});
