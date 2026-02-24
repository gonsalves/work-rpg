import * as THREE from 'three';
import { lerp, clamp } from '../utils/Math.js';
import { THEME } from '../utils/Theme.js';

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
      color: THEME.energyBar.background.color,
      transparent: true,
      opacity: THEME.energyBar.background.opacity,
    });
    this.bg = new THREE.Mesh(bgGeo, bgMat);
    this.group.add(this.bg);

    // Fill bar
    const fillGeo = new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH);
    this.fillMat = new THREE.MeshBasicMaterial({
      color: THEME.energyBar.fill.color,
      transparent: true,
      opacity: THEME.energyBar.fill.opacity,
    });
    this.fill = new THREE.Mesh(fillGeo, this.fillMat);
    this.fill.scale.x = 1;
    this.fill.position.x = 0;
    this.group.add(this.fill);

    this.group.renderOrder = 999;
  }

  setEnergy(value) {
    this.targetValue = clamp(value, 0, 1);
  }

  update(dt, camera) {
    this.currentValue = lerp(this.currentValue, this.targetValue, 1 - Math.pow(0.01, dt));

    const v = Math.max(0.001, this.currentValue);
    this.fill.scale.x = v;
    this.fill.position.x = -(BAR_WIDTH * (1 - v)) / 2;

    this.fillMat.color.copy(energyColor(this.currentValue));

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
  const G = THEME.energyBar.gradient;
  color.set(G.depletedColor).lerp(new THREE.Color(G.fullColor), value);
  return color;
}
