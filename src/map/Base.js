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

    this._buildTownCenter();
  }

  _buildTownCenter() {
    const B = THEME.base;

    // Raised platform
    const platformGeo = new THREE.CylinderGeometry(this.radius * 0.7, this.radius * 0.8, 0.12, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: B.platform.color,
      roughness: B.platform.roughness,
      metalness: B.platform.metalness,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(this.worldX, 0.06, this.worldZ);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Central structure — clean matte walls
    const hallMat = new THREE.MeshStandardMaterial({
      color: B.walls.color,
      roughness: B.walls.roughness,
      metalness: B.walls.metalness,
    });

    // Walls
    const wallGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
    const walls = new THREE.Mesh(wallGeo, hallMat);
    walls.position.set(this.worldX, 0.52, this.worldZ);
    walls.castShadow = true;
    this.group.add(walls);

    // Roof
    const roofGeo = new THREE.ConeGeometry(1.0, 0.6, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: B.roof.color,
      roughness: B.roof.roughness,
      metalness: B.roof.metalness,
      flatShading: true,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(this.worldX, 1.22, this.worldZ);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);

    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4);
    const poleMat = new THREE.MeshStandardMaterial({
      color: B.pole.color,
      roughness: B.pole.roughness,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(this.worldX + 0.5, 1.4, this.worldZ + 0.5);
    this.group.add(pole);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(0.4, 0.25);
    const flagMat = new THREE.MeshStandardMaterial({
      color: B.flag.color,
      side: THREE.DoubleSide,
      roughness: B.flag.roughness,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(this.worldX + 0.72, 1.85, this.worldZ + 0.5);
    this.group.add(flag);
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
