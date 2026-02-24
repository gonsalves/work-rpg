import * as THREE from 'three';
import { FogState } from './GameGrid.js';

export class FogOfWar {
  constructor(gameGrid) {
    this.grid = gameGrid;
    this.group = new THREE.Group();

    // DataTexture: 1 texel per tile, stores fog alpha
    this._texWidth = gameGrid.width;
    this._texHeight = gameGrid.height;
    this._texData = new Uint8Array(this._texWidth * this._texHeight * 4);
    this._targetAlpha = new Float32Array(this._texWidth * this._texHeight);
    this._currentAlpha = new Float32Array(this._texWidth * this._texHeight);

    // Initialize all tiles as fully fogged (black, opaque)
    for (let i = 0; i < this._texWidth * this._texHeight; i++) {
      this._texData[i * 4 + 0] = 0;   // R
      this._texData[i * 4 + 1] = 0;   // G
      this._texData[i * 4 + 2] = 0;   // B
      this._texData[i * 4 + 3] = 255; // A (fully opaque = fully fogged)
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
    // Position fog plane centered over the grid, slightly above terrain
    this._mesh.position.set(this.grid.width / 2, 0.6, this.grid.height / 2);
    this._mesh.renderOrder = 10; // render on top
    this.group.add(this._mesh);
  }

  /**
   * Reveal tiles in radius (permanent reveal — fog can't come back).
   */
  revealRadius(centerCol, centerRow, radius) {
    const revealed = this.grid.revealTilesInRadius(centerCol, centerRow, radius);
    for (const { col, row } of revealed) {
      this._setTargetAlpha(col, row, 0.25); // semi-transparent = revealed
    }
    // Also set center area as visible
    const centerTiles = this.grid.getTilesInRadius(centerCol, centerRow, Math.max(1, radius - 1));
    for (const { col, row } of centerTiles) {
      this._setTargetAlpha(col, row, 0.0); // fully transparent = visible
    }
    this._texture.needsUpdate = true;
  }

  /**
   * Update fog based on current unit positions (called each frame).
   * Sets tiles near units as 'visible' (transparent), others revert to 'revealed' (semi-transparent).
   */
  updateVisibility(unitPositions) {
    // Reset all revealed tiles to semi-transparent
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const tile = this.grid.getTile(col, row);
        if (tile.fogState === FogState.VISIBLE) {
          tile.fogState = FogState.REVEALED;
          this._setTargetAlpha(col, row, 0.25);
        }
      }
    }

    // Set tiles near units as visible
    for (const { col, row, sightRadius } of unitPositions) {
      const tiles = this.grid.getTilesInRadius(col, row, sightRadius);
      for (const { col: tc, row: tr, tile } of tiles) {
        if (tile.fogState === FogState.HIDDEN) {
          tile.fogState = FogState.REVEALED;
        }
        tile.fogState = FogState.VISIBLE;
        this._setTargetAlpha(tc, tr, 0.0);
      }
      // Outer ring of sight is semi-visible
      const outerTiles = this.grid.getTilesInRadius(col, row, sightRadius + 1);
      for (const { col: tc, row: tr, tile } of outerTiles) {
        if (tile.fogState === FogState.HIDDEN) {
          tile.fogState = FogState.REVEALED;
          this._setTargetAlpha(tc, tr, 0.25);
        }
      }
    }

    this._texture.needsUpdate = true;
  }

  _setTargetAlpha(col, row, alpha) {
    const idx = row * this._texWidth + col;
    // Only reduce alpha (never re-fog something already revealed)
    this._targetAlpha[idx] = Math.min(this._targetAlpha[idx], alpha);
  }

  /**
   * Smooth fog fade transitions.
   */
  update(dt) {
    let changed = false;
    const speed = 3.0; // fade speed

    for (let i = 0; i < this._currentAlpha.length; i++) {
      const target = this._targetAlpha[i];
      const current = this._currentAlpha[i];

      if (Math.abs(current - target) > 0.01) {
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

  getGroup() { return this.group; }
}
