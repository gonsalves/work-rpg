import * as THREE from 'three';
import { PALETTE } from '../utils/Colors.js';
import { createTextSprite } from '../utils/Geometry.js';

export class CommonAreas {
  constructor() {
    this.group = new THREE.Group();
    this.lobbyCenter = { x: 0, z: 0 };
    this.breakRoomCenter = { x: 0, z: 0 };
  }

  buildLobby(x, z, width, depth) {
    this.lobbyCenter = { x: x + width / 2, z: z + depth / 2 };

    // Reception desk
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.4,
      metalness: 0.15
    });
    const deskGeo = new THREE.BoxGeometry(2, 1, 0.8);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(x + width / 2, 0.5, z + depth * 0.35);
    desk.castShadow = true;
    this.group.add(desk);

    // Label
    const label = createTextSprite('LOBBY', 36, PALETTE.MID_GREY);
    label.position.set(x + width / 2, 3.5, z + 1.5);
    this.group.add(label);
  }

  buildBreakRoom(x, z, width, depth) {
    this.breakRoomCenter = { x: x + width / 2, z: z + depth / 2 };

    // Round table
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.5,
      metalness: 0.05
    });
    const tableGeo = new THREE.CylinderGeometry(1, 1, 0.08, 16);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(x + width / 2, 0.72, z + depth / 2);
    table.castShadow = true;
    this.group.add(table);

    // Table leg
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8);
    const leg = new THREE.Mesh(legGeo, tableMat);
    leg.position.set(x + width / 2, 0.36, z + depth / 2);
    this.group.add(leg);

    // Plants
    const plantPositions = [
      [x + 1.5, z + 2],
      [x + width - 1.5, z + depth - 2]
    ];
    for (const [px, pz] of plantPositions) {
      this._buildPlant(px, pz);
    }

    // Label
    const label = createTextSprite('BREAK ROOM', 36, PALETTE.MID_GREY);
    label.position.set(x + width / 2, 3.5, z + 1.5);
    this.group.add(label);
  }

  _buildPlant(x, z) {
    const potMat = new THREE.MeshStandardMaterial({
      color: 0xd4a76a,
      roughness: 0.8
    });
    const potGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(x, 0.15, z);
    this.group.add(pot);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      roughness: 0.8,
      flatShading: true
    });
    const leafGeo = new THREE.SphereGeometry(0.35, 6, 5);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x, 0.6, z);
    leaf.castShadow = true;
    this.group.add(leaf);
  }

  getLobbyCenter() { return this.lobbyCenter; }
  getBreakRoomCenter() { return this.breakRoomCenter; }
  getGroup() { return this.group; }
}
