import * as THREE from 'three';
import { THEME } from '../utils/Theme.js';

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

    // Door animation state
    this._doorPivot = null;
    this._doorTargetAngle = 0;     // 0 = closed
    this._doorCurrentAngle = 0;
    this._doorSpeed = 3.0;         // radians/sec

    this._buildTownCenter();
  }

  _buildTownCenter() {
    const B = THEME.base;

    // Raised platform — slightly bigger
    const platformGeo = new THREE.CylinderGeometry(this.radius * 0.8, this.radius * 0.9, 0.12, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: B.platform.color,
      roughness: B.platform.roughness,
      metalness: B.platform.metalness,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(this.worldX, 0.06, this.worldZ);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Central structure — clean matte walls (scaled up ~40%)
    const hallMat = new THREE.MeshStandardMaterial({
      color: B.walls.color,
      roughness: B.walls.roughness,
      metalness: B.walls.metalness,
    });

    // Walls — 1.7 x 1.1 x 1.7 (was 1.2 x 0.8 x 1.2)
    const wallGeo = new THREE.BoxGeometry(1.7, 1.1, 1.7);
    const walls = new THREE.Mesh(wallGeo, hallMat);
    walls.position.set(this.worldX, 0.67, this.worldZ);
    walls.castShadow = true;
    this.group.add(walls);

    // Roof — radius 1.4, height 0.8 (was 1.0, 0.6)
    const roofGeo = new THREE.ConeGeometry(1.4, 0.8, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: B.roof.color,
      roughness: B.roof.roughness,
      metalness: B.roof.metalness,
      flatShading: true,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(this.worldX, 1.62, this.worldZ);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);

    // Flag pole — taller
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4);
    const poleMat = new THREE.MeshStandardMaterial({
      color: B.pole.color,
      roughness: B.pole.roughness,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(this.worldX + 0.7, 1.8, this.worldZ + 0.7);
    this.group.add(pole);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(0.45, 0.28);
    const flagMat = new THREE.MeshStandardMaterial({
      color: B.flag.color,
      side: THREE.DoubleSide,
      roughness: B.flag.roughness,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(this.worldX + 0.95, 2.35, this.worldZ + 0.7);
    this.group.add(flag);

    // --- Door ---
    this._buildDoor(hallMat);
  }

  _buildDoor(wallMat) {
    const doorWidth = 0.5;
    const doorHeight = 0.85;
    const doorDepth = 0.06;
    const halfWallDepth = 1.7 / 2; // half of wall Z dimension

    // Door pivot — positioned at left edge of door opening on front face
    this._doorPivot = new THREE.Group();
    this._doorPivot.position.set(
      this.worldX - doorWidth / 2,
      0.12 + doorHeight / 2,      // base of walls + half door height
      this.worldZ + halfWallDepth  // front face of building
    );

    // Door mesh — offset so it swings from the left edge
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
    const doorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallMat.color).multiplyScalar(0.85),
      roughness: 0.75,
      metalness: 0,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(doorWidth / 2, 0, 0); // offset so pivot is at left edge
    doorMesh.castShadow = true;
    this._doorPivot.add(doorMesh);

    this.group.add(this._doorPivot);
  }

  // --- Door Animation API ---

  openDoor(dt) {
    this._doorTargetAngle = -Math.PI * 0.45; // swing inward ~80 degrees
    this._updateDoor(dt);
  }

  closeDoor(dt) {
    this._doorTargetAngle = 0;
    this._updateDoor(dt);
  }

  _updateDoor(dt) {
    if (!this._doorPivot) return;
    const diff = this._doorTargetAngle - this._doorCurrentAngle;
    if (Math.abs(diff) < 0.01) {
      this._doorCurrentAngle = this._doorTargetAngle;
    } else {
      this._doorCurrentAngle += Math.sign(diff) * Math.min(Math.abs(diff), this._doorSpeed * dt);
    }
    this._doorPivot.rotation.y = this._doorCurrentAngle;
  }

  isDoorOpen() {
    return Math.abs(this._doorCurrentAngle - (-Math.PI * 0.45)) < 0.05;
  }

  isDoorClosed() {
    return Math.abs(this._doorCurrentAngle) < 0.05;
  }

  /**
   * Returns grid-world coords just outside the front door.
   */
  getDoorExitPosition() {
    const halfWallDepth = 1.7 / 2;
    return {
      x: this.worldX,
      z: this.worldZ + halfWallDepth + 0.6,
    };
  }

  getDepositPosition() {
    return { x: this.worldX, z: this.worldZ + this.radius * 0.5 };
  }

  getSpawnPosition(index, total) {
    const angle = Math.PI * 0.3 + (index / Math.max(1, total)) * Math.PI * 0.4;
    const r = this.radius + 1;
    return {
      x: this.worldX + Math.cos(angle) * r,
      z: this.worldZ + Math.sin(angle) * r,
    };
  }

  getGroup() { return this.group; }
}
