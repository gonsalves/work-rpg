import * as THREE from 'three';
import { THEME } from '../utils/Theme.js';

// Gate directions: N (+z), E (+x), S (-z), W (-x)
const GATE_DIRS = [
  { dx: 0, dz: 1 },   // North (front, +z)
  { dx: 1, dz: 0 },   // East (+x)
  { dx: 0, dz: -1 },  // South (-z)
  { dx: -1, dz: 0 },  // West (-x)
];
const NUM_GATES = 4;

export class Base {
  constructor(gameGrid, centerCol, centerRow, radius) {
    this.grid = gameGrid;
    this.centerCol = centerCol;
    this.centerRow = centerRow;
    this.radius = radius;
    this.group = new THREE.Group();

    const world = gameGrid.tileToWorld(centerCol, centerRow);
    this.worldX = world.x;
    this.worldZ = world.z;

    // Per-gate animation state
    this._gates = [];
    for (let i = 0; i < NUM_GATES; i++) {
      this._gates.push({
        pivot: null,
        targetAngle: 0,
        currentAngle: 0,
        speed: 3.0,
      });
    }

    this._buildCastle();
  }

  _buildCastle() {
    const B = THEME.base;
    const R = this.radius;
    const cx = this.worldX;
    const cz = this.worldZ;

    // ─── Platform ───────────────────────────────────────────────
    const platformGeo = new THREE.CylinderGeometry(R * 0.85, R * 0.95, 0.12, 6);
    const platformMat = new THREE.MeshStandardMaterial({
      color: B.platform.color,
      roughness: B.platform.roughness,
      metalness: B.platform.metalness,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(cx, 0.06, cz);
    platform.receiveShadow = true;
    this.group.add(platform);

    // ─── Outer Walls (4 segments with gaps for gates) ───────────
    const wallHeight = 1.8;
    const wallThickness = 0.3;
    const halfWall = R * 0.7;  // half length of each wall segment
    const wallOffset = R * 0.7; // distance from center to wall line
    const gateWidth = 0.9;      // gap for gate opening
    const segLen = halfWall - gateWidth / 2; // each half-segment beside gate

    const wallMat = new THREE.MeshStandardMaterial({
      color: B.walls.color,
      roughness: B.walls.roughness,
      metalness: B.walls.metalness,
    });

    // Build wall segments for each side (two segments per side, gap in middle)
    const wallPairs = [
      // North wall (z+): runs along X axis at z = cz + wallOffset
      { axis: 'x', fixedAxis: 'z', fixedVal: cz + wallOffset, center: cx },
      // East wall (x+): runs along Z axis at x = cx + wallOffset
      { axis: 'z', fixedAxis: 'x', fixedVal: cx + wallOffset, center: cz },
      // South wall (z-): runs along X axis at z = cz - wallOffset
      { axis: 'x', fixedAxis: 'z', fixedVal: cz - wallOffset, center: cx },
      // West wall (x-): runs along Z axis at x = cx - wallOffset
      { axis: 'z', fixedAxis: 'x', fixedVal: cx - wallOffset, center: cz },
    ];

    for (const wp of wallPairs) {
      for (const side of [-1, 1]) {
        const segGeo = new THREE.BoxGeometry(
          wp.axis === 'x' ? segLen : wallThickness,
          wallHeight,
          wp.axis === 'z' ? segLen : wallThickness
        );
        const seg = new THREE.Mesh(segGeo, wallMat);
        const offset = (gateWidth / 2 + segLen / 2) * side;
        if (wp.axis === 'x') {
          seg.position.set(wp.center + offset, wallHeight / 2 + 0.12, wp.fixedVal);
        } else {
          seg.position.set(wp.fixedVal, wallHeight / 2 + 0.12, wp.center + offset);
        }
        seg.castShadow = true;
        seg.receiveShadow = true;
        this.group.add(seg);
      }
    }

    // ─── Battlements (merlons along wall tops) ──────────────────
    const merlonGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2);
    const merlonMat = new THREE.MeshStandardMaterial({
      color: B.battlement.color,
      roughness: B.battlement.roughness,
      metalness: B.battlement.metalness,
    });
    const merlonSpacing = 0.6;
    const merlonY = wallHeight + 0.12 + 0.15;

    for (const wp of wallPairs) {
      // Place merlons along each wall segment
      for (const side of [-1, 1]) {
        const segCenter = (gateWidth / 2 + segLen / 2) * side;
        const numMerlons = Math.floor(segLen / merlonSpacing);
        for (let m = 0; m < numMerlons; m++) {
          const mOff = (m - (numMerlons - 1) / 2) * merlonSpacing;
          const merlon = new THREE.Mesh(merlonGeo, merlonMat);
          if (wp.axis === 'x') {
            merlon.position.set(wp.center + segCenter + mOff, merlonY, wp.fixedVal);
          } else {
            merlon.position.set(wp.fixedVal, merlonY, wp.center + segCenter + mOff);
          }
          merlon.castShadow = true;
          this.group.add(merlon);
        }
      }
    }

    // ─── Corner Towers ──────────────────────────────────────────
    const towerRadius = 0.45;
    const towerHeight = wallHeight + 0.6;
    const towerGeo = new THREE.CylinderGeometry(towerRadius, towerRadius * 1.1, towerHeight, 8);
    const towerMat = new THREE.MeshStandardMaterial({
      color: B.tower.color,
      roughness: B.tower.roughness,
      metalness: B.tower.metalness,
    });

    const capHeight = 0.5;
    const capGeo = new THREE.ConeGeometry(towerRadius * 1.3, capHeight, 8);
    const capMat = new THREE.MeshStandardMaterial({
      color: B.roof.color,
      roughness: B.roof.roughness,
      metalness: B.roof.metalness,
      flatShading: true,
    });

    const corners = [
      { x: cx + wallOffset, z: cz + wallOffset },
      { x: cx + wallOffset, z: cz - wallOffset },
      { x: cx - wallOffset, z: cz + wallOffset },
      { x: cx - wallOffset, z: cz - wallOffset },
    ];

    for (const c of corners) {
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(c.x, towerHeight / 2 + 0.12, c.z);
      tower.castShadow = true;
      this.group.add(tower);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(c.x, towerHeight + 0.12 + capHeight / 2, c.z);
      cap.castShadow = true;
      this.group.add(cap);
    }

    // ─── Central Keep ───────────────────────────────────────────
    const keepSize = 2.0;
    const keepHeight = 2.2;
    const keepGeo = new THREE.BoxGeometry(keepSize, keepHeight, keepSize);
    const keepMat = new THREE.MeshStandardMaterial({
      color: B.keep.color,
      roughness: B.keep.roughness,
      metalness: B.keep.metalness,
    });
    const keep = new THREE.Mesh(keepGeo, keepMat);
    keep.position.set(cx, keepHeight / 2 + 0.12, cz);
    keep.castShadow = true;
    this.group.add(keep);

    // Keep roof (pyramid)
    const keepRoofGeo = new THREE.ConeGeometry(keepSize * 0.85, 1.0, 4);
    const keepRoofMat = new THREE.MeshStandardMaterial({
      color: B.roof.color,
      roughness: B.roof.roughness,
      metalness: B.roof.metalness,
      flatShading: true,
    });
    const keepRoof = new THREE.Mesh(keepRoofGeo, keepRoofMat);
    keepRoof.position.set(cx, keepHeight + 0.12 + 0.5, cz);
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.castShadow = true;
    this.group.add(keepRoof);

    // ─── Flag on keep ───────────────────────────────────────────
    const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4);
    const poleMat = new THREE.MeshStandardMaterial({
      color: B.pole.color,
      roughness: B.pole.roughness,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(cx, keepHeight + 0.12 + 1.0 + 0.9, cz);
    this.group.add(pole);

    const flagGeo = new THREE.PlaneGeometry(0.55, 0.35);
    const flagMat = new THREE.MeshStandardMaterial({
      color: B.flag.color,
      side: THREE.DoubleSide,
      roughness: B.flag.roughness,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(cx + 0.28, keepHeight + 0.12 + 1.0 + 1.6, cz);
    this.group.add(flag);

    // ─── Gates (4 doors: N, E, S, W) ────────────────────────────
    this._buildGates(wallOffset);
  }

  _buildGates(wallOffset) {
    const B = THEME.base;
    const cx = this.worldX;
    const cz = this.worldZ;
    const doorWidth = 0.7;
    const doorHeight = 1.2;
    const doorDepth = 0.08;

    const gateMat = new THREE.MeshStandardMaterial({
      color: B.gate.color,
      roughness: B.gate.roughness,
      metalness: B.gate.metalness,
    });
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);

    for (let i = 0; i < NUM_GATES; i++) {
      const dir = GATE_DIRS[i];
      const pivot = new THREE.Group();

      // Position pivot at the gate opening
      // For N/S gates: pivot on the wall line, facing outward
      // For E/W gates: pivot on the wall line, facing outward
      const gx = cx + dir.dx * wallOffset;
      const gz = cz + dir.dz * wallOffset;
      pivot.position.set(gx, 0.12 + doorHeight / 2, gz);

      // Door mesh — offset so it swings from one edge
      const doorMesh = new THREE.Mesh(doorGeo, gateMat);

      // Position door so it aligns with the wall opening
      if (dir.dz !== 0) {
        // N/S gates: door lies in XY plane, swings around Y
        doorMesh.position.set(doorWidth / 2, 0, 0);
        pivot.position.x = gx - doorWidth / 2;
      } else {
        // E/W gates: door lies in ZY plane, swings around Y
        doorMesh.rotation.y = Math.PI / 2;
        doorMesh.position.set(0, 0, doorWidth / 2);
        pivot.position.z = gz - doorWidth / 2;
      }

      doorMesh.castShadow = true;
      pivot.add(doorMesh);
      this.group.add(pivot);
      this._gates[i].pivot = pivot;
    }
  }

  // ─── Multi-Gate Animation API ─────────────────────────────────

  openGate(dt, gateIndex) {
    const gate = this._gates[gateIndex];
    if (!gate) return;
    gate.targetAngle = -Math.PI * 0.45;
    this._updateGate(dt, gateIndex);
  }

  closeGate(dt, gateIndex) {
    const gate = this._gates[gateIndex];
    if (!gate) return;
    gate.targetAngle = 0;
    this._updateGate(dt, gateIndex);
  }

  _updateGate(dt, gateIndex) {
    const gate = this._gates[gateIndex];
    if (!gate || !gate.pivot) return;
    const diff = gate.targetAngle - gate.currentAngle;
    if (Math.abs(diff) < 0.01) {
      gate.currentAngle = gate.targetAngle;
    } else {
      gate.currentAngle += Math.sign(diff) * Math.min(Math.abs(diff), gate.speed * dt);
    }
    gate.pivot.rotation.y = gate.currentAngle;
  }

  isGateOpen(gateIndex) {
    const gate = this._gates[gateIndex];
    if (!gate) return false;
    return Math.abs(gate.currentAngle - (-Math.PI * 0.45)) < 0.05;
  }

  isGateClosed(gateIndex) {
    const gate = this._gates[gateIndex];
    if (!gate) return true;
    return Math.abs(gate.currentAngle) < 0.05;
  }

  getGateCount() {
    return NUM_GATES;
  }

  // ─── Backward-compatible single-door API (delegates to gate 0) ─

  openDoor(dt) { this.openGate(dt, 0); }
  closeDoor(dt) { this.closeGate(dt, 0); }
  isDoorOpen() { return this.isGateOpen(0); }
  isDoorClosed() { return this.isGateClosed(0); }

  /**
   * Returns grid-world coords just outside the front (north) gate.
   * Kept for backward compatibility.
   */
  getDoorExitPosition() {
    return this.getDoorExitPositions()[0];
  }

  /**
   * Returns exit positions for all 4 gates.
   * @returns {Array<{x:number, z:number, gateIndex:number}>}
   */
  getDoorExitPositions() {
    const wallOffset = this.radius * 0.7;
    const exitDist = 0.8; // how far outside the wall the exit point is
    return GATE_DIRS.map((dir, i) => ({
      x: this.worldX + dir.dx * (wallOffset + exitDist),
      z: this.worldZ + dir.dz * (wallOffset + exitDist),
      gateIndex: i,
    }));
  }

  getDepositPosition() {
    return { x: this.worldX, z: this.worldZ + this.radius * 0.5 };
  }

  /**
   * Distribute spawn positions around the full 360 arc outside the castle.
   */
  getSpawnPosition(index, total) {
    const angle = (index / Math.max(1, total)) * Math.PI * 2;
    const r = this.radius + 1;
    return {
      x: this.worldX + Math.cos(angle) * r,
      z: this.worldZ + Math.sin(angle) * r,
    };
  }

  getGroup() { return this.group; }
}
