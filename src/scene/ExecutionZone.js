import * as THREE from 'three';
import { PALETTE } from '../utils/Colors.js';

// Cardinal directions: desk faces this way (person looks this way, away from pod center)
const DIRECTIONS = [
  { name: 'north', dx: 0, dz: -1, angle: Math.PI },
  { name: 'south', dx: 0, dz: 1, angle: 0 },
  { name: 'east', dx: 1, dz: 0, angle: -Math.PI / 2 },
  { name: 'west', dx: -1, dz: 0, angle: Math.PI / 2 }
];

const ARM_LENGTH = 2.0;   // center to desk surface center
const HOME_DIST = 3.5;    // center to avatar home (behind chair)
const DIVIDER_H = 1.2;
const SPINE_LEN = 3.2;    // cross divider arm length (covers gap between desk backs)

export class ExecutionZone {
  constructor(width = 14, depth = 20) {
    this.width = width;
    this.depth = depth;
    this.group = new THREE.Group();
    this.deskPositions = []; // { x, z, index }

    // Two pods, vertically arranged
    this.pods = [
      { cx: width / 2, cz: 5.5 },
      { cx: width / 2, cz: 14.5 }
    ];

    this._buildPods();
  }

  _buildPods() {
    // Shared materials
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.4, metalness: 0.05 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.3 });
    const crtMat = new THREE.MeshStandardMaterial({ color: PALETTE.SEVERANCE_CRT, roughness: 0.5, metalness: 0.1 });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0a1628, roughness: 0.1, metalness: 0.1,
      emissive: 0x112244, emissiveIntensity: 0.4
    });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.1 });
    const matMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0 });
    const dividerMat = new THREE.MeshStandardMaterial({ color: PALETTE.SEVERANCE_DIVIDER, roughness: 0.6, metalness: 0.0 });

    const mats = { deskMat, legMat, crtMat, screenMat, chairMat, matMat };

    let index = 0;
    for (const pod of this.pods) {
      for (const dir of DIRECTIONS) {
        const deskX = pod.cx + dir.dx * ARM_LENGTH;
        const deskZ = pod.cz + dir.dz * ARM_LENGTH;

        this._buildDeskUnit(deskX, deskZ, dir.angle, mats);

        // Avatar home: behind the chair, facing away from center
        const homeX = pod.cx + dir.dx * HOME_DIST;
        const homeZ = pod.cz + dir.dz * HOME_DIST;
        this.deskPositions.push({ x: homeX, z: homeZ, index });
        index++;
      }

      // Cross dividers at pod center
      this._buildCrossDividers(pod.cx, pod.cz, dividerMat);
    }
  }

  _buildDeskUnit(x, z, angle, mats) {
    const unit = new THREE.Group();

    // All positions relative to origin; desk faces +Z (person at +Z looking at screen at -Z)
    // Desk surface
    const deskGeo = new THREE.BoxGeometry(1.6, 0.08, 0.8);
    const desk = new THREE.Mesh(deskGeo, mats.deskMat);
    desk.position.set(0, 0.72, 0);
    desk.castShadow = true;
    desk.receiveShadow = true;
    unit.add(desk);

    // Drawer unit (right side)
    const drawerGeo = new THREE.BoxGeometry(0.35, 0.45, 0.6);
    const drawer = new THREE.Mesh(drawerGeo, mats.deskMat);
    drawer.position.set(0.55, 0.49, 0);
    drawer.castShadow = true;
    unit.add(drawer);

    // Desk legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6);
    const legOffsets = [[-0.7, -0.35], [-0.7, 0.35], [0.3, -0.35], [0.3, 0.35]];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, mats.legMat);
      leg.position.set(lx, 0.36, lz);
      unit.add(leg);
    }

    // CRT monitor (behind desk, toward pod center)
    const crtGeo = new THREE.BoxGeometry(0.5, 0.42, 0.38);
    const crt = new THREE.Mesh(crtGeo, mats.crtMat);
    crt.position.set(-0.2, 1.0, -0.3);
    crt.castShadow = true;
    unit.add(crt);

    // Screen face
    const screenGeo = new THREE.PlaneGeometry(0.36, 0.3);
    const screen = new THREE.Mesh(screenGeo, mats.screenMat);
    screen.position.set(-0.2, 1.0, -0.3 + 0.191);
    unit.add(screen);

    // CRT base
    const baseGeo = new THREE.BoxGeometry(0.35, 0.05, 0.3);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xd5cfc0, roughness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(-0.2, 0.775, -0.3);
    unit.add(base);

    // Keyboard
    const kbGeo = new THREE.BoxGeometry(0.4, 0.02, 0.15);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.position.set(-0.1, 0.77, 0.2);
    unit.add(kb);

    // Chair (in front of desk, person sits here)
    // Seat
    const seatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.5);
    const seat = new THREE.Mesh(seatGeo, mats.chairMat);
    seat.position.set(0, 0.45, 1.0);
    unit.add(seat);

    // Chair back
    const backGeo = new THREE.BoxGeometry(0.5, 0.5, 0.06);
    const back = new THREE.Mesh(backGeo, mats.chairMat);
    back.position.set(0, 0.7, 1.22);
    unit.add(back);

    // Chair pedestal
    const pedGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    const ped = new THREE.Mesh(pedGeo, mats.chairMat);
    ped.position.set(0, 0.22, 1.0);
    unit.add(ped);

    // Chair base
    const chairBaseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8);
    const chairBase = new THREE.Mesh(chairBaseGeo, mats.chairMat);
    chairBase.position.set(0, 0.04, 1.0);
    unit.add(chairBase);

    // Chair mat
    const matGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const chairMat = new THREE.Mesh(matGeo, mats.matMat);
    chairMat.rotation.x = -Math.PI / 2;
    chairMat.position.set(0, 0.005, 1.0);
    chairMat.receiveShadow = true;
    unit.add(chairMat);

    // Rotate and position the entire unit
    unit.rotation.y = angle;
    unit.position.set(x, 0, z);
    this.group.add(unit);
  }

  _buildCrossDividers(cx, cz, dividerMat) {
    // N-S spine (runs along Z)
    const nsGeo = new THREE.BoxGeometry(0.08, DIVIDER_H, SPINE_LEN);
    const ns = new THREE.Mesh(nsGeo, dividerMat);
    ns.position.set(cx, DIVIDER_H / 2, cz);
    ns.castShadow = true;
    ns.receiveShadow = true;
    this.group.add(ns);

    // E-W spine (runs along X)
    const ewGeo = new THREE.BoxGeometry(SPINE_LEN, DIVIDER_H, 0.08);
    const ew = new THREE.Mesh(ewGeo, dividerMat);
    ew.position.set(cx, DIVIDER_H / 2, cz);
    ew.castShadow = true;
    ew.receiveShadow = true;
    this.group.add(ew);
  }

  getDeskPosition(index) {
    if (this.deskPositions.length === 0) return { x: 0, z: 0 };
    return this.deskPositions[index % this.deskPositions.length];
  }

  getObstacles() {
    const obstacles = [];

    for (const pod of this.pods) {
      // Each desk+chair unit as an obstacle
      for (const dir of DIRECTIONS) {
        const deskX = pod.cx + dir.dx * ARM_LENGTH;
        const deskZ = pod.cz + dir.dz * ARM_LENGTH;
        obstacles.push({ x: deskX, z: deskZ, hw: 1.0, hd: 1.0 });
      }

      // Cross divider obstacles
      // N-S spine
      obstacles.push({ x: pod.cx, z: pod.cz, hw: 0.15, hd: SPINE_LEN / 2 });
      // E-W spine
      obstacles.push({ x: pod.cx, z: pod.cz, hw: SPINE_LEN / 2, hd: 0.15 });
    }

    return obstacles;
  }

  getDeskCount() { return this.deskPositions.length; }
  getGroup() { return this.group; }
}
