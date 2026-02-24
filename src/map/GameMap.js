import * as THREE from 'three';
import { TileType } from './GameGrid.js';
import { THEME } from '../utils/Theme.js';

const TILE_COLORS = {
  [TileType.GRASS]:  THEME.terrain.tiles.grass,
  [TileType.DIRT]:   THEME.terrain.tiles.dirt,
  [TileType.STONE]:  THEME.terrain.tiles.stone,
  [TileType.WATER]:  THEME.terrain.tiles.water,
  [TileType.FOREST]: THEME.terrain.tiles.forest,
};

export class GameMap {
  constructor(gameGrid, textures = null) {
    this.grid = gameGrid;
    this.group = new THREE.Group();
    this._tileMeshes = new Map();
    this._resourceNodeGroups = new Map();
    this._structureGroups = new Map();
    this._textures = textures;
    this._waterMaterial = null;
    this._time = 0;

    this._buildTerrain();
  }

  _buildTerrain() {
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    tileGeo.rotateX(-Math.PI / 2);

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
        color: texture ? 0xffffff : (TILE_COLORS[type] || THEME.terrain.fallbackColor),
        map: texture || null,
        roughness: THEME.terrain.material.roughness,
        metalness: THEME.terrain.material.metalness,
      });
      if (type === TileType.WATER) this._waterMaterial = mat;

      const instanced = new THREE.InstancedMesh(tileGeo, mat, tiles.length);
      instanced.receiveShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < tiles.length; i++) {
        const { col, row } = tiles[i];
        const world = this.grid.tileToWorld(col, row);
        const y = type === TileType.WATER ? -0.08 : 0;
        dummy.position.set(world.x, y, world.z);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.group.add(instanced);
    }

    // Architectural maquette trees (sphere on stick)
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

    // Thin dowel trunk
    const trunkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: THEME.trees.trunk.color,
      roughness: THEME.trees.trunk.roughness,
      metalness: THEME.trees.trunk.metalness,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(world.x, 0.25, world.z);
    trunk.castShadow = true;

    // Sphere crown — like foam ball on architectural model
    const crownGeo = new THREE.SphereGeometry(0.22, 12, 8);
    const crownMat = new THREE.MeshStandardMaterial({
      color: THEME.trees.crown.color,
      roughness: THEME.trees.crown.roughness,
      metalness: THEME.trees.crown.metalness,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(world.x, 0.6, world.z);
    crown.castShadow = true;

    this.group.add(trunk);
    this.group.add(crown);
  }

  addResourceNode(taskId, col, row, color) {
    const world = this.grid.tileToWorld(col, row);
    const nodeGroup = new THREE.Group();

    // Abstract geometric marker — icosahedron on pedestal
    const markerGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const markerMat = new THREE.MeshStandardMaterial({
      color: THEME.resourceNodes.marker.color,
      roughness: THEME.resourceNodes.marker.roughness,
      metalness: THEME.resourceNodes.marker.metalness,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(world.x, 0.35, world.z);
    marker.castShadow = true;
    marker.userData.taskId = taskId;
    marker.userData.isResourceNode = true;
    nodeGroup.add(marker);

    // Small pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 6);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: THEME.resourceNodes.pedestal.color,
      roughness: THEME.resourceNodes.pedestal.roughness,
      metalness: THEME.resourceNodes.pedestal.metalness,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(world.x, 0.075, world.z);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    nodeGroup.add(pedestal);

    nodeGroup.visible = false;
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
        child.material.color.set(THEME.resourceNodes.depleted.color);
        child.material.opacity = THEME.resourceNodes.depleted.opacity;
        child.material.transparent = true;
      }
    });
  }

  addStructure(milestoneId, col, row) {
    const world = this.grid.tileToWorld(col, row);
    const structGroup = new THREE.Group();

    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const wireMat = new THREE.MeshStandardMaterial({
      color: THEME.structures.wireframe.color,
      wireframe: true,
      transparent: true,
      opacity: THEME.structures.wireframe.opacity,
    });
    const wireBox = new THREE.Mesh(boxGeo, wireMat);
    wireBox.position.set(world.x, 0.45, world.z);
    wireBox.userData.milestoneId = milestoneId;
    wireBox.userData.isStructure = true;
    structGroup.add(wireBox);

    const solidMat = new THREE.MeshStandardMaterial({
      color: THEME.structures.solid.color,
      roughness: THEME.structures.solid.roughness,
      metalness: THEME.structures.solid.metalness,
      transparent: true,
      opacity: 0,
    });
    const solidBox = new THREE.Mesh(boxGeo, solidMat);
    solidBox.position.set(world.x, 0.45, world.z);
    solidBox.castShadow = true;
    solidBox.receiveShadow = true;
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

    solid.material.opacity = progress * 0.9;
    solid.scale.y = Math.max(0.01, progress);
    solid.position.y = 0.45 * Math.max(0.01, progress);

    wire.material.opacity = THEME.structures.wireframe.opacity * (1 - progress);

    if (progress >= 1) {
      solid.material.color.set(THEME.structures.complete.color);
      solid.material.emissive = new THREE.Color(THEME.structures.complete.emissiveColor);
      solid.material.emissiveIntensity = THEME.structures.complete.emissiveIntensity;
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
    this._time += dt;

    // Slow rotation on resource node markers for visibility
    for (const group of this._resourceNodeGroups.values()) {
      if (!group.visible) continue;
      group.traverse(child => {
        if (child.isMesh && child.userData.isResourceNode) {
          child.rotation.y += dt * 0.5;
        }
      });
    }

    // Gently scroll water texture
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
