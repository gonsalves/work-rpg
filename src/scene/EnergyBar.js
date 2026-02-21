import * as THREE from 'three';
import { lerp, clamp } from '../utils/Math.js';

const BAR_WIDTH = 1.0;
const BAR_HEIGHT = 0.12;
const BAR_DEPTH = 0.06;

export class EnergyBar {
  constructor() {
    this.group = new THREE.Group();
    this.currentValue = 1.0;
    this.targetValue = 1.0;

    // Background bar
    const bgGeo = new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.25
    });
    this.bg = new THREE.Mesh(bgGeo, bgMat);
    this.group.add(this.bg);

    // Fill bar
    const fillGeo = new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH);
    this.fillMat = new THREE.MeshBasicMaterial({
      color: 0x4caf50,
      transparent: true,
      opacity: 0.9
    });
    this.fill = new THREE.Mesh(fillGeo, this.fillMat);
    this.fill.scale.x = 1;
    this.fill.position.x = 0; // will be adjusted in update
    this.group.add(this.fill);

    // Make it billboard (always face camera) - handled in update
    this.group.renderOrder = 999;
  }

  setEnergy(value) {
    this.targetValue = clamp(value, 0, 1);
  }

  update(dt, camera) {
    // Smooth interpolation
    this.currentValue = lerp(this.currentValue, this.targetValue, 1 - Math.pow(0.01, dt));

    // Update fill scale and position
    const v = Math.max(0.001, this.currentValue);
    this.fill.scale.x = v;
    this.fill.position.x = -(BAR_WIDTH * (1 - v)) / 2;

    // Update color
    this.fillMat.color.copy(energyColor(this.currentValue));

    // Billboard: face the camera
    if (camera) {
      this.group.quaternion.copy(camera.quaternion);
    }
  }

  getGroup() { return this.group; }

  dispose() {
    this.bg.geometry.dispose();
    this.bg.material.dispose();
    this.fill.geometry.dispose();
    this.fillMat.dispose();
  }
}

function energyColor(value) {
  const color = new THREE.Color();
  if (value > 0.5) {
    const t = (value - 0.5) * 2;
    color.set(0xFFC107).lerp(new THREE.Color(0x4CAF50), t);
  } else {
    const t = value * 2;
    color.set(0xE8422F).lerp(new THREE.Color(0xFFC107), t);
  }
  return color;
}
