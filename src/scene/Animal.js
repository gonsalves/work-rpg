import * as THREE from 'three';
import { createShadowDisc } from '../utils/Geometry.js';

/**
 * Tiny maquette-style animal figurines — cats, dogs, and penguins.
 * All built from simple geometric primitives in the architectural model style.
 */

const ANIMAL_COLORS = {
  cat: {
    body: 0xEDE6DD,    // warm cream
    ears: 0xE0C8BC,    // soft pink-ish
  },
  dog: {
    body: 0xDDD8D0,    // cool grey-cream
    ears: 0xC8C0B8,    // darker warm grey
  },
  penguin: {
    body: 0x555555,    // dark grey (back)
    belly: 0xF5F5F5,   // white belly
    beak: 0xE8A030,    // orange beak
    feet: 0xE8A030,    // orange feet
  },
};

const MAT_OPTS = { flatShading: true, roughness: 0.9, metalness: 0 };

export class Animal {
  constructor(type) {
    this.type = type; // 'cat' | 'dog' | 'penguin'
    this.group = new THREE.Group();
    this.walkPhase = Math.random() * Math.PI * 2;
    this.facingAngle = Math.random() * Math.PI * 2;
    this._parts = {};

    this._buildModel(type);

    // Tiny shadow
    const shadow = createShadowDisc(0.18);
    this.group.add(shadow);

    this.group.rotation.y = this.facingAngle;
  }

  _buildModel(type) {
    switch (type) {
      case 'cat': this._buildCat(); break;
      case 'dog': this._buildDog(); break;
      case 'penguin': this._buildPenguin(); break;
    }
  }

  _buildCat() {
    const C = ANIMAL_COLORS.cat;
    const mat = new THREE.MeshStandardMaterial({ color: C.body, ...MAT_OPTS });
    const earMat = new THREE.MeshStandardMaterial({ color: C.ears, ...MAT_OPTS });

    // Body — elongated box
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), mat);
    body.position.y = 0.14;
    body.castShadow = true;
    this.group.add(body);
    this._parts.body = body;

    // Head — sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat);
    head.position.set(0, 0.2, 0.16);
    head.castShadow = true;
    this.group.add(head);
    this._parts.head = head;

    // Ears — two tiny cones
    const earGeo = new THREE.ConeGeometry(0.03, 0.07, 4);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.04, 0.28, 0.16);
    this.group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.04, 0.28, 0.16);
    this.group.add(rightEar);

    // Tail — thin curved cylinder sticking up
    const tailGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.22, 4);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.22, -0.16);
    tail.rotation.x = -0.5;
    this.group.add(tail);
    this._parts.tail = tail;

    // Legs — four tiny stubs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 4);
    const positions = [[-0.05, 0.05, 0.08], [0.05, 0.05, 0.08], [-0.05, 0.05, -0.08], [0.05, 0.05, -0.08]];
    this._parts.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(x, y, z);
      this.group.add(leg);
      this._parts.legs.push(leg);
    }
  }

  _buildDog() {
    const C = ANIMAL_COLORS.dog;
    const mat = new THREE.MeshStandardMaterial({ color: C.body, ...MAT_OPTS });
    const earMat = new THREE.MeshStandardMaterial({ color: C.ears, ...MAT_OPTS });

    // Body — slightly larger box
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.32), mat);
    body.position.y = 0.16;
    body.castShadow = true;
    this.group.add(body);
    this._parts.body = body;

    // Head — boxy
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), mat);
    head.position.set(0, 0.22, 0.2);
    head.castShadow = true;
    this.group.add(head);
    this._parts.head = head;

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), mat);
    snout.position.set(0, 0.19, 0.3);
    this.group.add(snout);

    // Floppy ears
    const earGeo = new THREE.BoxGeometry(0.05, 0.08, 0.04);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.08, 0.22, 0.2);
    leftEar.rotation.z = 0.3;
    this.group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.08, 0.22, 0.2);
    rightEar.rotation.z = -0.3;
    this.group.add(rightEar);

    // Tail — short, angled up
    const tailGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.16, 4);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.24, -0.18);
    tail.rotation.x = -0.7;
    this.group.add(tail);
    this._parts.tail = tail;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 4);
    const positions = [[-0.06, 0.06, 0.1], [0.06, 0.06, 0.1], [-0.06, 0.06, -0.1], [0.06, 0.06, -0.1]];
    this._parts.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(x, y, z);
      this.group.add(leg);
      this._parts.legs.push(leg);
    }
  }

  _buildPenguin() {
    const C = ANIMAL_COLORS.penguin;
    const bodyMat = new THREE.MeshStandardMaterial({ color: C.body, ...MAT_OPTS });
    const bellyMat = new THREE.MeshStandardMaterial({ color: C.belly, ...MAT_OPTS });
    const accentMat = new THREE.MeshStandardMaterial({ color: C.beak, ...MAT_OPTS });

    // Body — tapered cylinder (egg-ish)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.28, 8), bodyMat);
    body.position.y = 0.18;
    body.castShadow = true;
    this.group.add(body);
    this._parts.body = body;

    // Belly — slightly protruding sphere on front
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bellyMat);
    belly.position.set(0, 0.16, 0.05);
    belly.scale.set(1, 1.2, 0.6);
    this.group.add(belly);

    // Head — sphere on top
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bodyMat);
    head.position.set(0, 0.36, 0);
    head.castShadow = true;
    this.group.add(head);
    this._parts.head = head;

    // Beak — tiny cone
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), accentMat);
    beak.position.set(0, 0.34, 0.08);
    beak.rotation.x = Math.PI / 2;
    this.group.add(beak);

    // Wings — two flat boxes on sides
    const wingGeo = new THREE.BoxGeometry(0.03, 0.16, 0.08);
    const leftWing = new THREE.Mesh(wingGeo, bodyMat);
    leftWing.position.set(-0.1, 0.2, 0);
    leftWing.rotation.z = 0.15;
    this.group.add(leftWing);
    this._parts.leftWing = leftWing;

    const rightWing = new THREE.Mesh(wingGeo, bodyMat);
    rightWing.position.set(0.1, 0.2, 0);
    rightWing.rotation.z = -0.15;
    this.group.add(rightWing);
    this._parts.rightWing = rightWing;

    // Feet — two tiny orange boxes
    const footGeo = new THREE.BoxGeometry(0.04, 0.02, 0.06);
    const leftFoot = new THREE.Mesh(footGeo, accentMat);
    leftFoot.position.set(-0.04, 0.01, 0.03);
    this.group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, accentMat);
    rightFoot.position.set(0.04, 0.01, 0.03);
    this.group.add(rightFoot);

    this._parts.legs = []; // penguins waddle differently
  }

  // --- Animation ---

  update(dt, isMoving) {
    if (isMoving) {
      this.walkPhase += dt * (this.type === 'penguin' ? 8 : 6);

      if (this.type === 'penguin') {
        // Penguin waddle — rock side to side
        this._parts.body.rotation.z = Math.sin(this.walkPhase) * 0.15;
        this._parts.head.rotation.z = Math.sin(this.walkPhase) * 0.08;
        if (this._parts.leftWing) {
          this._parts.leftWing.rotation.z = 0.15 + Math.sin(this.walkPhase * 0.5) * 0.2;
          this._parts.rightWing.rotation.z = -0.15 - Math.sin(this.walkPhase * 0.5) * 0.2;
        }
      } else {
        // Cat / Dog — leg walk cycle + tail wag
        const swing = Math.sin(this.walkPhase) * 0.35;
        const legs = this._parts.legs;
        if (legs.length === 4) {
          legs[0].rotation.x = swing;   // front-left
          legs[1].rotation.x = -swing;  // front-right
          legs[2].rotation.x = -swing;  // back-left
          legs[3].rotation.x = swing;   // back-right
        }
        this._parts.body.position.y += Math.abs(Math.sin(this.walkPhase * 2)) * 0.005;

        if (this._parts.tail) {
          this._parts.tail.rotation.z = Math.sin(this.walkPhase * 1.5) * 0.3;
        }
      }
    } else {
      // Idle — gentle breathing / subtle movement
      this.walkPhase += dt * 1.5;
      const bob = Math.sin(this.walkPhase) * 0.005;
      this._parts.body.position.y = (this.type === 'penguin' ? 0.18 : (this.type === 'cat' ? 0.14 : 0.16)) + bob;

      if (this._parts.tail && this.type === 'dog') {
        // Dogs wag tail even when idle
        this._parts.tail.rotation.z = Math.sin(this.walkPhase * 2) * 0.4;
      }
    }
  }

  faceDirection(dx, dz, dt) {
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - this.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facingAngle += diff * Math.min(1, dt * 6);
    this.group.rotation.y = this.facingAngle;
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
