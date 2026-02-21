import * as THREE from 'three';
import { PALETTE } from '../utils/Colors.js';

const CELL_SIZE = 2;
const WALL_HEIGHT = 1.5;
const WALL_THICKNESS = 0.12;

export class MazeBuilder {
  constructor(rows = 8, cols = 8) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
    this.group = new THREE.Group();
    this.walkableCells = []; // { row, col, depth, worldX, worldZ }

    // Entry on left side (center row), exit on right side (center row)
    this.entryCell = { row: Math.floor(rows / 2), col: 0 };
    this.exitCell = { row: Math.floor(rows / 2), col: cols - 1 };

    this._generate();
    this._buildGeometry();
    this._computeWalkableCells();
  }

  _generate() {
    // Initialize grid: each cell has 4 walls [top, right, bottom, left]
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = {
          walls: [true, true, true, true], // top, right, bottom, left
          visited: false
        };
      }
    }

    // Start carving from entry cell (left side, center row)
    this._carve(this.entryCell.row, this.entryCell.col);

    // Open entry on left wall
    this.grid[this.entryCell.row][this.entryCell.col].walls[3] = false;

    // Open exit on right wall
    this.grid[this.exitCell.row][this.exitCell.col].walls[1] = false;
  }

  _carve(row, col) {
    this.grid[row][col].visited = true;
    const directions = this._shuffle([
      [-1, 0, 0, 2], // up: remove top of current, bottom of neighbor
      [0, 1, 1, 3],  // right: remove right of current, left of neighbor
      [1, 0, 2, 0],  // down: remove bottom of current, top of neighbor
      [0, -1, 3, 1]  // left: remove left of current, right of neighbor
    ]);

    for (const [dr, dc, wallCur, wallNeigh] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this.grid[nr][nc].visited) {
        this.grid[row][col].walls[wallCur] = false;
        this.grid[nr][nc].walls[wallNeigh] = false;
        this._carve(nr, nc);
      }
    }
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _buildGeometry() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.DISCOVERY_TINT).lerp(new THREE.Color(0xffffff), 0.7),
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const wallGeo = new THREE.BoxGeometry(1, WALL_HEIGHT, WALL_THICKNESS);
    const wallGeoVert = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, 1);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const cx = c * CELL_SIZE;
        const cz = r * CELL_SIZE;

        // Top wall (horizontal)
        if (cell.walls[0]) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.scale.x = CELL_SIZE;
          wall.position.set(cx + CELL_SIZE / 2, WALL_HEIGHT / 2, cz);
          wall.receiveShadow = true;
          this.group.add(wall);
        }

        // Right wall (vertical)
        if (cell.walls[1]) {
          const wall = new THREE.Mesh(wallGeoVert, wallMat);
          wall.scale.z = CELL_SIZE;
          wall.position.set(cx + CELL_SIZE, WALL_HEIGHT / 2, cz + CELL_SIZE / 2);
          wall.receiveShadow = true;
          this.group.add(wall);
        }

        // Bottom wall (only for last row)
        if (r === this.rows - 1 && cell.walls[2]) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.scale.x = CELL_SIZE;
          wall.position.set(cx + CELL_SIZE / 2, WALL_HEIGHT / 2, cz + CELL_SIZE);
          wall.receiveShadow = true;
          this.group.add(wall);
        }

        // Left wall (only for first column)
        if (c === 0 && cell.walls[3]) {
          const wall = new THREE.Mesh(wallGeoVert, wallMat);
          wall.scale.z = CELL_SIZE;
          wall.position.set(cx, WALL_HEIGHT / 2, cz + CELL_SIZE / 2);
          wall.receiveShadow = true;
          this.group.add(wall);
        }
      }
    }

    // Blue tint overlay for discovery zone (renders over the global green carpet)
    const tintGeo = new THREE.PlaneGeometry(this.cols * CELL_SIZE, this.rows * CELL_SIZE);
    const tintMat = new THREE.MeshBasicMaterial({
      color: PALETTE.DISCOVERY_TINT,
      transparent: true,
      opacity: 0.10,
      depthWrite: false
    });
    const tint = new THREE.Mesh(tintGeo, tintMat);
    tint.rotation.x = -Math.PI / 2;
    tint.position.set(
      (this.cols * CELL_SIZE) / 2,
      0.02,
      (this.rows * CELL_SIZE) / 2
    );
    this.group.add(tint);
  }

  _computeWalkableCells() {
    // BFS from entry to compute depth of each cell
    const entrance = this.entryCell;
    const depthMap = Array.from({ length: this.rows }, () => new Array(this.cols).fill(-1));
    const queue = [{ row: entrance.row, col: entrance.col, depth: 0 }];
    depthMap[entrance.row][entrance.col] = 0;

    const dirs = [[-1, 0, 0], [0, 1, 1], [1, 0, 2], [0, -1, 3]];

    while (queue.length > 0) {
      const { row, col, depth } = queue.shift();
      for (const [dr, dc, wallIdx] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols
          && depthMap[nr][nc] === -1
          && !this.grid[row][col].walls[wallIdx]) {
          depthMap[nr][nc] = depth + 1;
          queue.push({ row: nr, col: nc, depth: depth + 1 });
        }
      }
    }

    const maxDepth = Math.max(...depthMap.flat().filter(d => d >= 0));

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (depthMap[r][c] >= 0) {
          this.walkableCells.push({
            row: r,
            col: c,
            depth: depthMap[r][c],
            normalizedDepth: maxDepth > 0 ? depthMap[r][c] / maxDepth : 0,
            worldX: this.group.position.x + c * CELL_SIZE + CELL_SIZE / 2,
            worldZ: this.group.position.z + r * CELL_SIZE + CELL_SIZE / 2
          });
        }
      }
    }
  }

  getCellAtDepth(normalizedDepth) {
    const target = Math.max(0, Math.min(1, normalizedDepth));
    let bestCell = this.walkableCells[0];
    let bestDist = Infinity;

    for (const cell of this.walkableCells) {
      const dist = Math.abs(cell.normalizedDepth - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = cell;
      }
    }
    return bestCell;
  }

  getNeighborCells(row, col) {
    const neighbors = [];
    const dirs = [[-1, 0, 0], [0, 1, 1], [1, 0, 2], [0, -1, 3]];

    for (const [dr, dc, wallIdx] of dirs) {
      if (!this.grid[row][col].walls[wallIdx]) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          neighbors.push(this.walkableCells.find(c => c.row === nr && c.col === nc));
        }
      }
    }
    return neighbors.filter(Boolean);
  }

  getEntryWorldPos() {
    const r = this.entryCell.row;
    const c = this.entryCell.col;
    return {
      x: this.group.position.x + c * CELL_SIZE + CELL_SIZE / 2,
      z: this.group.position.z + r * CELL_SIZE + CELL_SIZE / 2
    };
  }

  getExitWorldPos() {
    const r = this.exitCell.row;
    const c = this.exitCell.col;
    return {
      x: this.group.position.x + c * CELL_SIZE + CELL_SIZE / 2,
      z: this.group.position.z + r * CELL_SIZE + CELL_SIZE / 2
    };
  }

  getGroup() { return this.group; }
  getMazeWidth() { return this.cols * CELL_SIZE; }
  getMazeHeight() { return this.rows * CELL_SIZE; }
}
