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

// Resource node animation timing
const DEPLETE_DURATION = 0.5;   // seconds to shrink away
const REGROW_DELAY = 60;        // seconds before regrowing starts (very slow)
const REGROW_DURATION = 15;     // seconds to scale back up

export class GameMap {
  constructor(gameGrid, textures = null) {
    this.grid = gameGrid;
    this.group = new THREE.Group();
    this._tileMeshes = new Map();
    this._resourceNodeGroups = new Map();
    this._structureGroups = new Map();
    this._nodeAnimState = new Map(); // taskId → { phase, timer, permanent }
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
    // Used at load time for tasks already at 100% — immediate permanent depletion
    const group = this._resourceNodeGroups.get(taskId);
    if (!group) return;
    group.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.set(THEME.resourceNodes.depleted.color);
        child.material.opacity = THEME.resourceNodes.depleted.opacity;
        child.material.transparent = true;
      }
    });
    group.scale.set(0, 0, 0);
    this._nodeAnimState.set(taskId, { phase: 'depleted', timer: 0, permanent: true });
  }

  /**
   * Trigger resource node depletion animation (shrink away on pickup).
   * @param {string} taskId
   * @param {boolean} permanent - if true, node never regrows (task 100%)
   */
  depleteNode(taskId, permanent = false) {
    const state = this._nodeAnimState.get(taskId);
    // Don't re-deplete if already depleting/depleted
    if (state && state.phase !== 'available') return;
    this._nodeAnimState.set(taskId, { phase: 'depleting', timer: 0, permanent });
  }

  /**
   * Returns true if the resource node is available for gathering.
   */
  isNodeAvailable(taskId) {
    const state = this._nodeAnimState.get(taskId);
    if (!state) return true; // no state = never depleted = available
    return state.phase === 'available';
  }

  /**
   * Restore node appearance after regrowth (reset materials to original colors).
   */
  _restoreNodeAppearance(taskId) {
    const group = this._resourceNodeGroups.get(taskId);
    if (!group) return;
    group.traverse(child => {
      if (child.isMesh && child.material) {
        if (child.userData.isResourceNode) {
          // Marker — restore original color
          child.material.color.set(THEME.resourceNodes.marker.color);
          child.material.opacity = 1;
          child.material.transparent = false;
        } else {
          // Pedestal
          child.material.color.set(THEME.resourceNodes.pedestal.color);
          child.material.opacity = 1;
          child.material.transparent = false;
        }
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
    for (const [taskId, group] of this._resourceNodeGroups) {
      if (!group.visible) continue;
      group.traverse(child => {
        if (child.isMesh && child.userData.isResourceNode) {
          child.rotation.y += dt * 0.5;
        }
      });
    }

    // Resource node depletion / regrowth animations
    for (const [taskId, state] of this._nodeAnimState) {
      const group = this._resourceNodeGroups.get(taskId);
      if (!group) continue;

      switch (state.phase) {
        case 'depleting': {
          state.timer += dt;
          const t = Math.min(1, state.timer / DEPLETE_DURATION);
          const s = 1 - t;
          group.scale.set(s, s, s);
          // Slight upward float during shrink
          group.position.y = t * 0.3;
          if (t >= 1) {
            state.phase = 'depleted';
            state.timer = 0;
            group.scale.set(0, 0, 0);
          }
          break;
        }
        case 'depleted': {
          if (state.permanent) break; // never regrow
          state.timer += dt;
          if (state.timer >= REGROW_DELAY) {
            state.phase = 'regrowing';
            state.timer = 0;
            group.scale.set(0.01, 0.01, 0.01);
            group.position.y = 0;
            this._restoreNodeAppearance(taskId);
          }
          break;
        }
        case 'regrowing': {
          state.timer += dt;
          const t = Math.min(1, state.timer / REGROW_DURATION);
          // Ease-out for gentle growth
          const s = 1 - Math.pow(1 - t, 2);
          group.scale.set(s, s, s);
          if (t >= 1) {
            state.phase = 'available';
            state.timer = 0;
            group.scale.set(1, 1, 1);
          }
          break;
        }
      }
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
