import * as THREE from 'three';
import { TileType } from './GameGrid.js';

const TILE_COLORS = {
  [TileType.GRASS]: 0x4a7c3f,
  [TileType.DIRT]: 0x8b7355,
  [TileType.STONE]: 0x808080,
  [TileType.WATER]: 0x3d6b8e,
  [TileType.FOREST]: 0x2d5a2d,
};

export class GameMap {
  constructor(gameGrid, textures = null) {
    this.grid = gameGrid;
    this.group = new THREE.Group();
    this._tileMeshes = new Map(); // "col,row" -> mesh
    this._resourceNodeGroups = new Map(); // taskId -> THREE.Group
    this._structureGroups = new Map(); // milestoneId -> THREE.Group
    this._textures = textures;
    this._waterMaterial = null;

    this._buildTerrain();
  }

  _buildTerrain() {
    // Use InstancedMesh per tile type for performance
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    tileGeo.rotateX(-Math.PI / 2);

    // Group tiles by type
    const byType = {};
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const tile = this.grid.getTile(col, row);
        if (!byType[tile.type]) byType[tile.type] = [];
        byType[tile.type].push({ col, row });
      }
    }

    for (const [type, tiles] of Object.entries(byType)) {
      const texture = this._textures ? this._textures[type] : null;
      const mat = new THREE.MeshStandardMaterial({
        color: texture ? 0xffffff : (TILE_COLORS[type] || 0x888888),
        map: texture || null,
        roughness: 0.9,
        metalness: 0,
      });
      if (type === TileType.WATER) this._waterMaterial = mat;

      const instanced = new THREE.InstancedMesh(tileGeo, mat, tiles.length);
      instanced.receiveShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < tiles.length; i++) {
        const { col, row } = tiles[i];
        const world = this.grid.tileToWorld(col, row);
        // Water tiles are slightly lower
        const y = type === TileType.WATER ? -0.05 : 0;
        dummy.position.set(world.x, y, world.z);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.group.add(instanced);
    }

    // Small forest trees as placeholder (simple cone + cylinder)
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const tile = this.grid.getTile(col, row);
        if (tile.type === TileType.FOREST) {
          this._addTree(col, row);
        }
      }
    }
  }

  _addTree(col, row) {
    const world = this.grid.tileToWorld(col, row);
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(world.x, 0.2, world.z);

    const crownGeo = new THREE.ConeGeometry(0.3, 0.5, 6);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2d6b2d, roughness: 0.8, flatShading: true });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(world.x, 0.6, world.z);
    crown.castShadow = true;

    this.group.add(trunk);
    this.group.add(crown);
  }

  addResourceNode(taskId, col, row, color) {
    const world = this.grid.tileToWorld(col, row);
    const nodeGroup = new THREE.Group();

    // Glowing crystal placeholder
    const crystalGeo = new THREE.OctahedronGeometry(0.3, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.4,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(world.x, 0.4, world.z);
    crystal.castShadow = true;
    crystal.userData.taskId = taskId;
    crystal.userData.isResourceNode = true;
    nodeGroup.add(crystal);

    // Small base disc
    const discGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 8);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(world.x, 0.01, world.z);
    nodeGroup.add(disc);

    nodeGroup.visible = false; // Hidden until fog is revealed
    this.group.add(nodeGroup);
    this._resourceNodeGroups.set(taskId, nodeGroup);
    return nodeGroup;
  }

  setResourceNodeVisible(taskId, visible) {
    const group = this._resourceNodeGroups.get(taskId);
    if (group) group.visible = visible;
  }

  setResourceNodeDepleted(taskId) {
    const group = this._resourceNodeGroups.get(taskId);
    if (!group) return;
    group.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.set(0x555555);
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
        child.material.opacity = 0.5;
        child.material.transparent = true;
      }
    });
  }

  addStructure(milestoneId, col, row) {
    const world = this.grid.tileToWorld(col, row);
    const structGroup = new THREE.Group();

    // Wireframe foundation
    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xc4a882,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireBox = new THREE.Mesh(boxGeo, wireMat);
    wireBox.position.set(world.x, 0.45, world.z);
    wireBox.userData.milestoneId = milestoneId;
    wireBox.userData.isStructure = true;
    structGroup.add(wireBox);

    // Solid fill (starts invisible, fills as progress increases)
    const solidMat = new THREE.MeshStandardMaterial({
      color: 0xc4a882,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
    });
    const solidBox = new THREE.Mesh(boxGeo, solidMat);
    solidBox.position.set(world.x, 0.45, world.z);
    solidBox.castShadow = true;
    structGroup.add(solidBox);

    structGroup.userData._wire = wireBox;
    structGroup.userData._solid = solidBox;

    this.group.add(structGroup);
    this._structureGroups.set(milestoneId, structGroup);
    return structGroup;
  }

  setStructureProgress(milestoneId, progress) {
    const group = this._structureGroups.get(milestoneId);
    if (!group) return;
    const solid = group.userData._solid;
    const wire = group.userData._wire;

    // Solid fills in as progress goes up
    solid.material.opacity = progress * 0.9;
    solid.scale.y = Math.max(0.01, progress);
    solid.position.y = 0.45 * Math.max(0.01, progress);

    // Wireframe fades as solid fills
    wire.material.opacity = 0.4 * (1 - progress);

    if (progress >= 1) {
      // Complete: add color tint
      solid.material.color.set(0xd4af37);
      solid.material.emissive = new THREE.Color(0xd4af37);
      solid.material.emissiveIntensity = 0.15;
    }
  }

  getResourceNodePickables() {
    const pickables = [];
    for (const group of this._resourceNodeGroups.values()) {
      if (!group.visible) continue;
      group.traverse(child => {
        if (child.isMesh && child.userData.isResourceNode) {
          pickables.push(child);
        }
      });
    }
    return pickables;
  }

  getStructurePickables() {
    const pickables = [];
    for (const group of this._structureGroups.values()) {
      group.traverse(child => {
        if (child.isMesh && child.userData.isStructure) {
          pickables.push(child);
        }
      });
    }
    return pickables;
  }

  update(dt) {
    // Gently scroll water texture for a flowing effect
    if (this._waterMaterial && this._waterMaterial.map) {
      this._waterMaterial.map.offset.x += dt * 0.02;
      this._waterMaterial.map.offset.y += dt * 0.01;
    }
  }

  getGroup() { return this.group; }

  getBounds() {
    return {
      minX: 0,
      maxX: this.grid.width,
      minZ: 0,
      maxZ: this.grid.height,
      centerX: this.grid.width / 2,
      centerZ: this.grid.height / 2,
    };
  }

  centerOffset() {
    return { x: -this.grid.width / 2, z: -this.grid.height / 2 };
  }
}
