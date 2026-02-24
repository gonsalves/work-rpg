import * as THREE from 'three';
import { FogState } from './GameGrid.js';

export class FogOfWar {
  constructor(gameGrid) {
    this.grid = gameGrid;
    this.group = new THREE.Group();

    const total = gameGrid.width * gameGrid.height;
    this._texWidth = gameGrid.width;
    this._texHeight = gameGrid.height;
    this._texData = new Uint8Array(total * 4);

    // Permanent reveal floor: once a tile is explored, its floor drops
    // from 1.0 to REVEALED_ALPHA and never rises back.
    this._revealFloor = new Float32Array(total);

    // Target alpha: set each frame based on unit proximity.
    // Can freely move between 0.0 (visible) and revealFloor.
    this._targetAlpha = new Float32Array(total);

    // Current alpha: smoothly interpolates toward targetAlpha.
    this._currentAlpha = new Float32Array(total);

    // Initialize all tiles as fully fogged (black, opaque)
    for (let i = 0; i < total; i++) {
      this._texData[i * 4 + 0] = 0;   // R
      this._texData[i * 4 + 1] = 0;   // G
      this._texData[i * 4 + 2] = 0;   // B
      this._texData[i * 4 + 3] = 255; // A (fully opaque)
      this._revealFloor[i] = 1.0;
      this._targetAlpha[i] = 1.0;
      this._currentAlpha[i] = 1.0;
    }

    this._texture = new THREE.DataTexture(
      this._texData,
      this._texWidth,
      this._texHeight,
      THREE.RGBAFormat
    );
    this._texture.minFilter = THREE.LinearFilter;
    this._texture.magFilter = THREE.LinearFilter;
    this._texture.flipY = true; // match grid row 0 → low Z after plane rotateX
    this._texture.needsUpdate = true;

    this._buildFogMesh();
  }

  _buildFogMesh() {
    const geo = new THREE.PlaneGeometry(this.grid.width, this.grid.height);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: this._texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.position.set(this.grid.width / 2, 0.6, this.grid.height / 2);
    this._mesh.renderOrder = 10;
    this.group.add(this._mesh);
  }

  /**
   * Permanently reveal tiles in a radius (e.g. around starting base).
   */
  revealRadius(centerCol, centerRow, radius) {
    const revealed = this.grid.revealTilesInRadius(centerCol, centerRow, radius);
    for (const { col, row } of revealed) {
      this._setRevealFloor(col, row, 0.55);
    }
    // Center area starts fully visible
    const centerTiles = this.grid.getTilesInRadius(
      centerCol, centerRow, Math.max(1, radius - 1)
    );
    for (const { col, row } of centerTiles) {
      this._setRevealFloor(col, row, 0.0);
    }
    this._texture.needsUpdate = true;
  }

  /**
   * Called each frame with current unit positions.
   * Tiles near units → fully transparent (0.0).
   * Previously explored tiles without a nearby unit → translucent (revealFloor).
   * Never-explored tiles → fully opaque (1.0).
   */
  updateVisibility(unitPositions) {
    // Phase 1: Reset every tile's target to its reveal floor.
    //   hidden → 1.0, revealed → 0.25, permanently visible → 0.0
    const total = this._texWidth * this._texHeight;
    for (let i = 0; i < total; i++) {
      this._targetAlpha[i] = this._revealFloor[i];
    }
    // Also reset grid fogState for revealed tiles
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const tile = this.grid.getTile(col, row);
        if (tile.fogState === FogState.VISIBLE) {
          tile.fogState = FogState.REVEALED;
        }
      }
    }

    // Phase 2: Tiles near units → fully transparent.
    for (const { col, row, sightRadius } of unitPositions) {
      // Inner sight circle: fully visible
      const tiles = this.grid.getTilesInRadius(col, row, sightRadius);
      for (const { col: tc, row: tr, tile } of tiles) {
        if (tile.fogState === FogState.HIDDEN) {
          tile.fogState = FogState.REVEALED;
        }
        tile.fogState = FogState.VISIBLE;

        const idx = tr * this._texWidth + tc;
        this._targetAlpha[idx] = 0.0;
        // Also permanently lower the reveal floor
        this._revealFloor[idx] = Math.min(this._revealFloor[idx], 0.55);
      }

      // Outer ring: reveal but semi-transparent
      const outerTiles = this.grid.getTilesInRadius(col, row, sightRadius + 1);
      for (const { col: tc, row: tr, tile } of outerTiles) {
        if (tile.fogState === FogState.HIDDEN) {
          tile.fogState = FogState.REVEALED;
          const idx = tr * this._texWidth + tc;
          this._revealFloor[idx] = Math.min(this._revealFloor[idx], 0.55);
        }
      }
    }

    this._texture.needsUpdate = true;
  }

  /**
   * Lower the permanent reveal floor for a tile (only goes down, never up).
   */
  _setRevealFloor(col, row, alpha) {
    const idx = row * this._texWidth + col;
    this._revealFloor[idx] = Math.min(this._revealFloor[idx], alpha);
    this._targetAlpha[idx] = Math.min(this._targetAlpha[idx], alpha);
  }

  /**
   * Smooth fog fade transitions — handles both fading in (reveal) and
   * fading back out (unit walks away → translucent).
   */
  update(dt) {
    let changed = false;
    const fadeInSpeed = 2.0;   // fog clears (slightly slower for cinematic reveal)
    const fadeOutSpeed = 0.8;  // fog returns gently

    for (let i = 0; i < this._currentAlpha.length; i++) {
      const target = this._targetAlpha[i];
      const current = this._currentAlpha[i];
      const diff = Math.abs(current - target);

      if (diff > 0.005) {
        const speed = target > current ? fadeOutSpeed : fadeInSpeed;
        const newAlpha = current + (target - current) * Math.min(1, speed * dt);
        this._currentAlpha[i] = newAlpha;
        this._texData[i * 4 + 3] = Math.round(newAlpha * 255);
        changed = true;
      }
    }

    if (changed) {
      this._texture.needsUpdate = true;
    }
  }

  isRevealed(col, row) {
    const tile = this.grid.getTile(col, row);
    return tile && tile.fogState !== FogState.HIDDEN;
  }

  /**
   * Returns the percentage of walkable tiles that have been revealed (0–1).
   */
  getExplorationPercent() {
    let total = 0;
    let revealed = 0;
    for (let i = 0; i < this.grid.tiles.length; i++) {
      const tile = this.grid.tiles[i];
      if (tile.type !== 'water') {
        total++;
        if (tile.fogState !== FogState.HIDDEN) revealed++;
      }
    }
    return total > 0 ? revealed / total : 1;
  }

  getGroup() { return this.group; }
}
