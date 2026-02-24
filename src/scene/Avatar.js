import * as THREE from 'three';
import { EnergyBar } from './EnergyBar.js';
import { createTextSprite, createShadowDisc } from '../utils/Geometry.js';
import { lerp } from '../utils/Math.js';
import { THEME } from '../utils/Theme.js';

export class Avatar {
  constructor(personData) {
    this.personId = personData.id;
    this.group = new THREE.Group();
    this.color = new THREE.Color(personData.color);

    // Movement state
    this.homePosition = new THREE.Vector3(0, 0, 0);
    this.wanderTarget = new THREE.Vector3(0, 0, 0);
    this.energy = 1.0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.facingAngle = 0;
    this._initialized = false;
    this._carrying = false;
    this._gatherPhase = 0;
    this._buildPhase = 0;

    this._buildBody();

    this.energyBar = new EnergyBar();
    this.energyBar.getGroup().position.y = 2.1;
    this.group.add(this.energyBar.getGroup());

    // Name label
    const ns = THEME.avatar.nameSprite;
    this.nameSprite = createTextSprite(personData.name, ns.fontSize, ns.textColor, ns.bgColor);
    this.nameSprite.position.y = 2.5;
    this.group.add(this.nameSprite);

    const shadow = createShadowDisc(0.4);
    this.group.add(shadow);

    this.group.userData.personId = personData.id;
    this.group.userData.isAvatar = true;
  }

  _buildBody() {
    const A = THEME.avatar;

    // Matte clay material
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      flatShading: true,
      roughness: A.body.roughness,
      metalness: A.body.metalness,
    });
    this.bodyMat = mat;

    // Skin
    const skinMat = new THREE.MeshStandardMaterial({
      color: A.skin.color,
      flatShading: true,
      roughness: A.skin.roughness,
      metalness: A.skin.metalness,
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
    this.leftLeg.material.color.copy(this.color).multiplyScalar(A.legDarken);
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

    // Carried resource cube
    const carryGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const carryMat = new THREE.MeshStandardMaterial({
      color: A.carryCube.color,
      emissive: A.carryCube.emissiveColor,
      emissiveIntensity: A.carryCube.emissiveIntensity,
      roughness: A.carryCube.roughness,
    });
    this._carryMesh = new THREE.Mesh(carryGeo, carryMat);
    this._carryMesh.position.set(0, 1.2, 0.3);
    this._carryMesh.visible = false;
    this.group.add(this._carryMesh);
  }

  setHomePosition(x, z) {
    this.homePosition.set(x, 0, z);
    if (!this._initialized) {
      this.group.position.set(x, 0, z);
      this.wanderTarget.set(x, 0, z);
      this._initialized = true;
    }
  }

  setEnergy(value) {
    this.energy = value;
    this.energyBar.setEnergy(value);
  }

  setCarrying(carrying) {
    this._carrying = carrying;
    this._carryMesh.visible = carrying;
  }

  // --- Animations ---

  playGatherAnimation(dt) {
    this._gatherPhase += dt * 4;
    const swing = Math.sin(this._gatherPhase) * 0.8;
    this.rightArm.rotation.x = -0.3 + swing;
    this.leftArm.rotation.x = -0.3;
    this.torso.position.y = 0.92 + Math.abs(Math.sin(this._gatherPhase * 0.5)) * 0.03;
  }

  playBuildAnimation(dt) {
    this._buildPhase += dt * 3;
    const swing = Math.sin(this._buildPhase) * 0.6;
    this.rightArm.rotation.x = -0.5 + swing;
    this.leftArm.rotation.x = -0.5 - swing * 0.3;
    this.torso.position.y = 0.92 + Math.abs(Math.sin(this._buildPhase)) * 0.02;
  }

  // --- Core update ---

  update(dt, camera) {
    this._updateWalkAnimation(dt);
    this.energyBar.update(dt, camera);
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
    const isMoving = distToTarget > 0.15;

    if (isMoving) {
      this.walkPhase += dt * 6;
      const legSwing = Math.sin(this.walkPhase) * 0.3;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -legSwing * 0.6;
      this.rightArm.rotation.x = legSwing * 0.6;
      this.torso.position.y = 0.92 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.03;
      this.head.position.y = 1.45 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.02;

      if (this._carrying) {
        this._carryMesh.position.y = 1.2 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.05;
      }
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

  highlight() {
    this.bodyMat.emissive.set(THEME.avatar.highlight.emissiveColor);
    this.bodyMat.emissiveIntensity = THEME.avatar.highlight.emissiveIntensity;
  }

  unhighlight() {
    this.bodyMat.emissive.set(THEME.avatar.unhighlight.emissiveColor);
    this.bodyMat.emissiveIntensity = THEME.avatar.unhighlight.emissiveIntensity;
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
