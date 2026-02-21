import * as THREE from 'three';
import { PALETTE } from '../utils/Colors.js';

// Each pod has 4 desks in the quadrants formed by tall cross-shaped partitions.
// Desks face INWARD toward the partition walls. Chairs face outward (open space).
// Quadrants: NE (+x, -z), NW (-x, -z), SE (+x, +z), SW (-x, +z)
const QUADRANTS = [
  { name: 'NE', sx: 1, sz: -1, angle: -Math.PI / 2 },  // desk faces -X (toward N-S partition)
  { name: 'NW', sx: -1, sz: -1, angle: Math.PI / 2 },   // desk faces +X (toward N-S partition)
  { name: 'SE', sx: 1, sz: 1, angle: -Math.PI / 2 },    // desk faces -X (toward N-S partition)
  { name: 'SW', sx: -1, sz: 1, angle: Math.PI / 2 }     // desk faces +X (toward N-S partition)
];

const PARTITION_H = 1.6;    // tall partitions — taller than desks (desk top is 0.72)
const PARTITION_ARM = 3.0;  // how far each arm of the cross extends from center
const DESK_OFFSET = 1.2;    // desk center distance from partition wall (into the quadrant)
const DESK_Z_OFFSET = 1.0;  // desk offset along the partition (away from center)
const HOME_DIST = 2.5;      // avatar home distance from desk (behind chair, toward open space)

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
      // Build the prominent cross-shaped partitions FIRST
      this._buildCrossPartitions(pod.cx, pod.cz, dividerMat);

      // Place desks in each of the 4 quadrants
      for (const q of QUADRANTS) {
        // Desk is offset from center into the quadrant:
        // - perpendicular to the N-S partition wall (X direction)
        // - along the E-W partition wall (Z direction, away from center)
        const deskX = pod.cx + q.sx * DESK_OFFSET;
        const deskZ = pod.cz + q.sz * DESK_Z_OFFSET;

        this._buildDeskUnit(deskX, deskZ, q.angle, mats);

        // Avatar home: behind the chair (away from partition, toward open space)
        const homeX = pod.cx + q.sx * (DESK_OFFSET + HOME_DIST);
        const homeZ = pod.cz + q.sz * DESK_Z_OFFSET;
        this.deskPositions.push({ x: homeX, z: homeZ, index });
        index++;
      }
    }
  }

  _buildDeskUnit(x, z, angle, mats) {
    const unit = new THREE.Group();

    // All positions relative to origin; desk faces +Z direction
    // In this layout, the desk faces the partition wall.
    // The person sits at +Z (looking at screen at -Z toward the partition).
    // Chair is at +Z (behind the person, toward open space).

    // Desk surface
    const deskGeo = new THREE.BoxGeometry(1.4, 0.06, 0.7);
    const desk = new THREE.Mesh(deskGeo, mats.deskMat);
    desk.position.set(0, 0.72, 0);
    desk.castShadow = true;
    desk.receiveShadow = true;
    unit.add(desk);

    // Desk legs (thin metal)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6);
    const legOffsets = [[-0.6, -0.3], [-0.6, 0.3], [0.6, -0.3], [0.6, 0.3]];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, mats.legMat);
      leg.position.set(lx, 0.36, lz);
      unit.add(leg);
    }

    // CRT monitor (on desk, toward the partition wall = -Z side)
    const crtGeo = new THREE.BoxGeometry(0.45, 0.38, 0.35);
    const crt = new THREE.Mesh(crtGeo, mats.crtMat);
    crt.position.set(0, 0.97, -0.1);
    crt.castShadow = true;
    unit.add(crt);

    // Screen face (faces +Z toward the person)
    const screenGeo = new THREE.PlaneGeometry(0.32, 0.26);
    const screen = new THREE.Mesh(screenGeo, mats.screenMat);
    screen.position.set(0, 0.97, -0.1 + 0.176);
    unit.add(screen);

    // CRT base
    const baseGeo = new THREE.BoxGeometry(0.3, 0.04, 0.25);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xd5cfc0, roughness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.775, -0.1);
    unit.add(base);

    // Keyboard (in front of monitor, where person types)
    const kbGeo = new THREE.BoxGeometry(0.35, 0.015, 0.12);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.position.set(0, 0.77, 0.2);
    unit.add(kb);

    // Chair (behind the person, toward open space = +Z)
    // Seat
    const seatGeo = new THREE.BoxGeometry(0.45, 0.05, 0.45);
    const seat = new THREE.Mesh(seatGeo, mats.chairMat);
    seat.position.set(0, 0.45, 0.9);
    unit.add(seat);

    // Chair back (faces partition, person leans back toward open space)
    const backGeo = new THREE.BoxGeometry(0.45, 0.45, 0.05);
    const back = new THREE.Mesh(backGeo, mats.chairMat);
    back.position.set(0, 0.68, 1.1);
    unit.add(back);

    // Chair pedestal
    const pedGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 6);
    const ped = new THREE.Mesh(pedGeo, mats.chairMat);
    ped.position.set(0, 0.22, 0.9);
    unit.add(ped);

    // Chair base (star base)
    const chairBaseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 8);
    const chairBase = new THREE.Mesh(chairBaseGeo, mats.chairMat);
    chairBase.position.set(0, 0.04, 0.9);
    unit.add(chairBase);

    // Chair mat
    const matGeo = new THREE.PlaneGeometry(0.7, 0.7);
    const chairMat = new THREE.Mesh(matGeo, mats.matMat);
    chairMat.rotation.x = -Math.PI / 2;
    chairMat.position.set(0, 0.005, 0.9);
    chairMat.receiveShadow = true;
    unit.add(chairMat);

    // Rotate and position the entire unit
    unit.rotation.y = angle;
    unit.position.set(x, 0, z);
    this.group.add(unit);
  }

  _buildCrossPartitions(cx, cz, dividerMat) {
    // The cross-shaped partition is the DOMINANT visual element.
    // Two perpendicular walls meeting at the pod center, each arm extends PARTITION_ARM out.

    // N-S partition (runs along Z axis)
    const nsGeo = new THREE.BoxGeometry(0.08, PARTITION_H, PARTITION_ARM * 2);
    const ns = new THREE.Mesh(nsGeo, dividerMat);
    ns.position.set(cx, PARTITION_H / 2, cz);
    ns.castShadow = true;
    ns.receiveShadow = true;
    this.group.add(ns);

    // E-W partition (runs along X axis)
    const ewGeo = new THREE.BoxGeometry(PARTITION_ARM * 2, PARTITION_H, 0.08);
    const ew = new THREE.Mesh(ewGeo, dividerMat);
    ew.position.set(cx, PARTITION_H / 2, cz);
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
      for (const q of QUADRANTS) {
        const deskX = pod.cx + q.sx * DESK_OFFSET;
        const deskZ = pod.cz + q.sz * DESK_Z_OFFSET;
        obstacles.push({ x: deskX, z: deskZ, hw: 0.9, hd: 0.9 });
      }

      // Cross partition obstacles — the long arms
      // N-S partition
      obstacles.push({ x: pod.cx, z: pod.cz, hw: 0.15, hd: PARTITION_ARM });
      // E-W partition
      obstacles.push({ x: pod.cx, z: pod.cz, hw: PARTITION_ARM, hd: 0.15 });
    }

    return obstacles;
  }

  getDeskCount() { return this.deskPositions.length; }
  getGroup() { return this.group; }
}
