import * as THREE from 'three';
import { EnergyBar } from './EnergyBar.js';
import { createTextSprite, createShadowDisc } from '../utils/Geometry.js';
import { lerp, clamp } from '../utils/Math.js';

export class Avatar {
  constructor(personData) {
    this.personId = personData.id;
    this.group = new THREE.Group();
    this.color = new THREE.Color(personData.color);

    // Movement state
    this.homePosition = new THREE.Vector3(0, 0, 0);
    this.wanderTarget = new THREE.Vector3(0, 0, 0);
    this.wanderTimer = Math.random() * 2;
    this.isRelocating = false;
    this.energy = 1.0;
    this.isInMaze = false;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.isDistressed = false;
    this.distressPhase = 0;
    this.facingAngle = 0;
    this._initialized = false;

    // Sitting state machine
    this.sittingState = 'idle'; // 'idle' | 'walking_to_chair' | 'sitting_down' | 'seated' | 'standing_up'
    this.sittingTransition = 0; // 0..1 progress for sit/stand transitions
    this.chairTarget = null;    // { x, z, facingAngle } world position of chair
    this.workDuration = 0;      // how long to work this session

    // Collision-aware wander target picker, set by AvatarManager per zone
    // Signature: () => { x, z } | null
    this._pickWanderTarget = null;

    // Per-step collision checker, set by AvatarManager
    // Signature: (x, z) => boolean (true = blocked)
    this._isBlocked = null;

    this._buildBody();

    this.energyBar = new EnergyBar();
    this.energyBar.getGroup().position.y = 2.1;
    this.group.add(this.energyBar.getGroup());

    this.nameSprite = createTextSprite(personData.name, 32, '#2C2C2C');
    this.nameSprite.position.y = 2.5;
    this.group.add(this.nameSprite);

    const shadow = createShadowDisc(0.4);
    this.group.add(shadow);

    this.group.userData.personId = personData.id;
    this.group.userData.isAvatar = true;
  }

  _buildBody() {
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      flatShading: true,
      roughness: 0.7,
      metalness: 0.05
    });
    this.bodyMat = mat;

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      flatShading: true,
      roughness: 0.7,
      metalness: 0
    });

    const headGeo = new THREE.SphereGeometry(0.25, 8, 6);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.45;
    this.head.castShadow = true;
    this.group.add(this.head);

    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, mat);
    this.torso.position.y = 0.92;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6);
    this.leftLeg = new THREE.Mesh(legGeo, mat.clone());
    this.leftLeg.material.color.copy(this.color).multiplyScalar(0.8);
    this.leftLeg.position.set(-0.12, 0.3, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, this.leftLeg.material);
    this.rightLeg.position.set(0.12, 0.3, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    const armGeo = new THREE.BoxGeometry(0.11, 0.5, 0.11);
    this.leftArm = new THREE.Mesh(armGeo, mat);
    this.leftArm.position.set(-0.38, 0.9, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mat);
    this.rightArm.position.set(0.38, 0.9, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);
  }

  setHomePosition(x, z) {
    const oldHome = this.homePosition.clone();
    this.homePosition.set(x, 0, z);

    if (!this._initialized) {
      this.group.position.set(x, 0, z);
      this.wanderTarget.set(x, 0, z);
      this._initialized = true;
    } else if (oldHome.distanceTo(this.homePosition) > 1) {
      this.isRelocating = true;
      this.wanderTarget.copy(this.homePosition);
    }
  }

  setEnergy(value) {
    this.energy = value;
    this.energyBar.setEnergy(value);
    this.isDistressed = this.isInMaze && value < 0.4;
  }

  setInMaze(inMaze) {
    this.isInMaze = inMaze;
  }

  // Set a function that returns valid wander targets for this avatar's zone
  setWanderProvider(fn) {
    this._pickWanderTarget = fn;
  }

  // Set a function that checks if a position is blocked (for per-step collision)
  setCollisionChecker(fn) {
    this._isBlocked = fn;
  }

  update(dt, camera) {
    if (this.sittingState !== 'idle') {
      this._updateSitting(dt);
      // Only play walk animation when walking to chair (not while sitting/standing)
      if (this.sittingState === 'walking_to_chair') {
        this._updateWalkAnimation(dt);
      }
    } else if (this.isRelocating) {
      this._moveToward(this.homePosition, 3, dt);
      if (this.group.position.distanceTo(this.homePosition) < 0.2) {
        this.isRelocating = false;
        this.wanderTimer = 0.5;
      }
      this._updateWalkAnimation(dt);
    } else {
      this._updateWander(dt);
      this._updateWalkAnimation(dt);
    }

    this._updateDistress(dt);
    this.energyBar.update(dt, camera);
  }

  _moveToward(target, speed, dt) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      const step = Math.min(speed * dt, dist);
      const nx = this.group.position.x + (dx / dist) * step;
      const nz = this.group.position.z + (dz / dist) * step;

      // Per-step collision check: if next position is blocked, pick a new target
      // Skip when walking to chair — avatar must pass through desk obstacle
      if (this._isBlocked && this.sittingState !== 'walking_to_chair' && this._isBlocked(nx, nz)) {
        this.wanderTimer = 0; // force picking a new target next frame
        this._faceDirection(dx, dz, dt);
        return;
      }

      this.group.position.x = nx;
      this.group.position.z = nz;
      this._faceDirection(dx, dz, dt);
    }
  }

  // --- Sitting behavior ---

  startSitting(chairTarget) {
    this.chairTarget = chairTarget; // { x, z, facingAngle }
    this.sittingState = 'walking_to_chair';
    this.workDuration = 8 + Math.random() * 7; // 8–15 seconds at the desk
    this.wanderTarget.set(chairTarget.x, 0, chairTarget.z);
  }

  startStanding() {
    this.sittingState = 'standing_up';
    this.sittingTransition = 1.0; // will lerp from 1 → 0
  }

  isSitting() {
    return this.sittingState !== 'idle';
  }

  _updateSitting(dt) {
    switch (this.sittingState) {
      case 'walking_to_chair': {
        const chairPos = new THREE.Vector3(this.chairTarget.x, 0, this.chairTarget.z);
        this._moveToward(chairPos, 1.8, dt);

        if (this.group.position.distanceTo(chairPos) < 0.15) {
          // Snap to chair and face the monitor
          this.group.position.x = this.chairTarget.x;
          this.group.position.z = this.chairTarget.z;
          this.facingAngle = this.chairTarget.facingAngle;
          this.group.rotation.y = this.facingAngle;

          this.sittingState = 'sitting_down';
          this.sittingTransition = 0;
        }
        break;
      }

      case 'sitting_down': {
        this.sittingTransition = Math.min(1, this.sittingTransition + dt * 2.0);
        this._applySittingPose(this.sittingTransition);

        if (this.sittingTransition >= 1) {
          this.sittingState = 'seated';
        }
        break;
      }

      case 'seated': {
        this._applySittingPose(1.0);
        this._updateTypingAnimation(dt);

        this.workDuration -= dt;
        if (this.workDuration <= 0) {
          this.startStanding();
        }
        break;
      }

      case 'standing_up': {
        this.sittingTransition = Math.max(0, this.sittingTransition - dt * 2.0);
        this._applySittingPose(this.sittingTransition);

        if (this.sittingTransition <= 0) {
          this.sittingState = 'idle';
          this.chairTarget = null;
          this.wanderTimer = 0.2 + Math.random() * 0.5;
        }
        break;
      }
    }
  }

  _applySittingPose(t) {
    // Smoothstep easing for natural transitions
    const s = t * t * (3 - 2 * t);

    // Standing → Seated pose interpolation
    // Torso: 0.92 → 0.775 (bottom aligns with chair seat at Y=0.45)
    this.torso.position.y = lerp(0.92, 0.775, s);
    // Head: 1.45 → 1.305 (maintains offset from torso)
    this.head.position.y = lerp(1.45, 1.305, s);

    // Legs: rotate forward ~75° to appear bent at the knees
    const legRotX = lerp(0, -1.3, s);
    this.leftLeg.rotation.x = legRotX;
    this.rightLeg.rotation.x = legRotX;
    this.leftLeg.position.y = lerp(0.3, 0.35, s);
    this.rightLeg.position.y = lerp(0.3, 0.35, s);

    // Arms: lower with torso, angle forward toward keyboard
    const armRotX = lerp(0, -0.6, s);
    this.leftArm.position.y = lerp(0.9, 0.65, s);
    this.rightArm.position.y = lerp(0.9, 0.65, s);
    this.leftArm.rotation.x = armRotX;
    this.rightArm.rotation.x = armRotX;
  }

  _updateTypingAnimation(dt) {
    this.walkPhase += dt * 3;

    // Subtle arm oscillation to simulate typing
    const typing = Math.sin(this.walkPhase * 2) * 0.08;
    this.leftArm.rotation.x = -0.6 + typing;
    this.rightArm.rotation.x = -0.6 - typing; // opposite phase

    // Very subtle head bob (looking at screen)
    const headBob = Math.sin(this.walkPhase * 0.5) * 0.008;
    this.head.position.y = 1.305 + headBob;
  }

  _updateWander(dt) {
    this.wanderTimer -= dt;

    if (this.wanderTimer <= 0) {
      // Use zone-aware wander provider if available, otherwise fallback
      if (this._pickWanderTarget) {
        const target = this._pickWanderTarget();
        if (target) {
          this.wanderTarget.set(target.x, 0, target.z);
        }
      } else {
        this._pickFallbackWanderTarget();
      }

      this.wanderTimer = this.isDistressed
        ? 3 + Math.random() * 4
        : 0.5 + Math.random() * 2;
    }

    const speed = this.isDistressed ? 0.4 : (1.0 + this.energy * 1.5);
    this._moveToward(this.wanderTarget, speed, dt);
  }

  _pickFallbackWanderTarget() {
    const wanderRadius = this.isDistressed ? 0.5 : 2.5;
    const angle = Math.random() * Math.PI * 2;
    const r = (0.4 + Math.random() * 0.6) * wanderRadius;
    this.wanderTarget.set(
      this.homePosition.x + Math.cos(angle) * r,
      0,
      this.homePosition.z + Math.sin(angle) * r
    );
  }

  _faceDirection(dx, dz, dt) {
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - this.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facingAngle += diff * Math.min(1, dt * 8);
    this.group.rotation.y = this.facingAngle;
  }

  _updateWalkAnimation(dt) {
    const dx = this.wanderTarget.x - this.group.position.x;
    const dz = this.wanderTarget.z - this.group.position.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);
    const isMoving = this.isRelocating || distToTarget > 0.15;

    if (isMoving) {
      const walkSpeed = this.isDistressed ? 3 : 6;
      this.walkPhase += dt * walkSpeed;

      const legSwing = Math.sin(this.walkPhase) * 0.3;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -legSwing * 0.6;
      this.rightArm.rotation.x = legSwing * 0.6;

      this.torso.position.y = 0.92 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.03;
      this.head.position.y = 1.45 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.02;
    } else {
      this.walkPhase += dt * 1.2;
      const bob = Math.sin(this.walkPhase) * 0.015;
      this.torso.position.y = 0.92 + bob;
      this.head.position.y = 1.45 + bob * 0.5;

      this.leftLeg.rotation.x = lerp(this.leftLeg.rotation.x, 0, dt * 5);
      this.rightLeg.rotation.x = lerp(this.rightLeg.rotation.x, 0, dt * 5);
      this.leftArm.rotation.x = lerp(this.leftArm.rotation.x, 0, dt * 5);
      this.rightArm.rotation.x = lerp(this.rightArm.rotation.x, 0, dt * 5);
    }
  }

  _updateDistress(dt) {
    if (this.isDistressed) {
      this.distressPhase += dt * 4;
      const pulse = (Math.sin(this.distressPhase) + 1) / 2;

      const distressColor = this.color.clone().lerp(new THREE.Color(0xE8422F), pulse * 0.5);
      this.bodyMat.color.copy(distressColor);
      this.bodyMat.emissive.set(0xE8422F);
      this.bodyMat.emissiveIntensity = pulse * 0.15;
      this.bodyMat.transparent = true;
      this.bodyMat.opacity = 0.8 + pulse * 0.2;
    } else {
      this.bodyMat.color.copy(this.color);
      this.bodyMat.emissive.set(0x000000);
      this.bodyMat.emissiveIntensity = 0;
      this.bodyMat.transparent = false;
      this.bodyMat.opacity = 1;
      this.distressPhase = 0;
    }
  }

  highlight() {
    this.bodyMat.emissive.set(0xffffff);
    this.bodyMat.emissiveIntensity = 0.15;
  }

  unhighlight() {
    if (!this.isDistressed) {
      this.bodyMat.emissive.set(0x000000);
      this.bodyMat.emissiveIntensity = 0;
    }
  }

  getPickables() {
    return [this.head, this.torso, this.leftLeg, this.rightLeg, this.leftArm, this.rightArm];
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    this.energyBar.dispose();
  }
}
