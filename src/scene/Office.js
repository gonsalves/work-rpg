import * as THREE from 'three';
import { MazeBuilder } from './MazeBuilder.js';
import { ExecutionZone } from './ExecutionZone.js';
import { CommonAreas } from './CommonAreas.js';
import { PALETTE } from '../utils/Colors.js';
import { createTextSprite } from '../utils/Geometry.js';

/*
  Office Layout — Left-to-right journey flow:

  Z=0  +--------+--------------+--------------+----------+
       |        |              |              |          |
       | LOBBY  |  DISCOVERY   |  EXECUTION   |  BREAK   |
       | 8×20   |  MAZE        |  ZONE        |  ROOM    |
       |        |  16×16 in    |  14×20       |  10×20   |
       |        |  16×20 slot  |  (Severance  |          |
       |        |  entry←lobby |   cubicles)  |          |
       |        |  exit→exec   |              |          |
       |        |              |              |          |
  Z=20 +--------+--------------+--------------+----------+
       X=0     X=8           X=24           X=38      X=48
*/

export class Office {
  constructor() {
    this.group = new THREE.Group();

    // Zone dimensions (left to right)
    this.lobbyWidth = 8;
    this.lobbyDepth = 20;

    this.mazeRows = 8;
    this.mazeCols = 8;

    this.executionWidth = 14;
    this.executionDepth = 20;

    this.breakRoomWidth = 10;
    this.breakRoomDepth = 20;

    // Build zones
    this.maze = new MazeBuilder(this.mazeRows, this.mazeCols);
    this.execution = new ExecutionZone(this.executionWidth, this.executionDepth);
    this.common = new CommonAreas();

    this._positionZones();
    this._buildZoneLabels();
  }

  _positionZones() {
    const mazeWorldWidth = this.mazeCols * 2;  // 16
    const mazeWorldDepth = this.mazeRows * 2;  // 16
    const mazeZOffset = (this.lobbyDepth - mazeWorldDepth) / 2; // 2

    // Lobby at far left
    this.common.buildLobby(0, 0, this.lobbyWidth, this.lobbyDepth);

    // Maze to the right of lobby, vertically centered
    this.maze.getGroup().position.set(this.lobbyWidth, 0, mazeZOffset);

    // Recalculate maze walkable cell world positions after positioning
    for (const cell of this.maze.walkableCells) {
      cell.worldX = this.maze.getGroup().position.x + cell.col * 2 + 1;
      cell.worldZ = this.maze.getGroup().position.z + cell.row * 2 + 1;
    }

    // Execution zone to the right of maze
    const execX = this.lobbyWidth + mazeWorldWidth; // 24
    this.execution.getGroup().position.set(execX, 0, 0);

    // Break room at far right
    const breakX = execX + this.executionWidth; // 38
    this.common.buildBreakRoom(breakX, 0, this.breakRoomWidth, this.breakRoomDepth);

    // Add all to main group
    this.group.add(this.maze.getGroup());
    this.group.add(this.execution.getGroup());
    this.group.add(this.common.getGroup());
  }

  _buildZoneLabels() {
    const mazeWorldWidth = this.mazeCols * 2;
    const execX = this.lobbyWidth + mazeWorldWidth;

    const labels = [
      { text: 'DISCOVERY', x: this.lobbyWidth + mazeWorldWidth / 2, z: 1.5, color: PALETTE.BLUE },
      { text: 'EXECUTION', x: execX + this.executionWidth / 2, z: 1.5, color: PALETTE.ORANGE },
    ];

    for (const { text, x, z, color } of labels) {
      const sprite = createTextSprite(text, 42, color);
      sprite.position.set(x, 3.5, z);
      this.group.add(sprite);
    }
  }

  _totalWidth() {
    return this.lobbyWidth + this.mazeCols * 2 + this.executionWidth + this.breakRoomWidth;
  }

  centerOffset() {
    const totalWidth = this._totalWidth();
    const totalDepth = this.lobbyDepth;
    return { x: -totalWidth / 2, z: -totalDepth / 2 };
  }

  getMaze() { return this.maze; }
  getExecution() { return this.execution; }
  getCommon() { return this.common; }
  getGroup() { return this.group; }

  getBounds() {
    const totalWidth = this._totalWidth();
    const totalDepth = this.lobbyDepth;
    return {
      minX: this.group.position.x,
      maxX: this.group.position.x + totalWidth,
      minZ: this.group.position.z,
      maxZ: this.group.position.z + totalDepth,
      centerX: this.group.position.x + totalWidth / 2,
      centerZ: this.group.position.z + totalDepth / 2
    };
  }
}
