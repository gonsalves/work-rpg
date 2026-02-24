import * as THREE from 'three';
import { THEME } from '../utils/Theme.js';

export class SceneManager {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEME.scene.background);

    // Isometric orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 20;
    this.frustum = frustum;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 200
    );

    // Classic isometric angle
    const dist = 50;
    this.camera.position.set(dist, dist, dist);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = THEME.scene.toneMappingExposure;

    this._setupLights();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    const L = THEME.lighting;

    // Even studio fill
    const ambient = new THREE.AmbientLight(L.ambient.color, L.ambient.intensity);
    this.scene.add(ambient);

    // Soft directional — modeling light
    const dirLight = new THREE.DirectionalLight(L.directional.color, L.directional.intensity);
    dirLight.position.set(...L.directional.position);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = L.directional.shadow.mapSize;
    dirLight.shadow.mapSize.height = L.directional.shadow.mapSize;
    dirLight.shadow.camera.near = L.directional.shadow.near;
    dirLight.shadow.camera.far = L.directional.shadow.far;
    dirLight.shadow.camera.left = -L.directional.shadow.extent;
    dirLight.shadow.camera.right = L.directional.shadow.extent;
    dirLight.shadow.camera.top = L.directional.shadow.extent;
    dirLight.shadow.camera.bottom = -L.directional.shadow.extent;
    dirLight.shadow.bias = L.directional.shadow.bias;
    dirLight.shadow.normalBias = L.directional.shadow.normalBias;
    this.scene.add(dirLight);

    // Fill from opposite side
    const fillLight = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
    fillLight.position.set(...L.fill.position);
    this.scene.add(fillLight);

    // Hemisphere: even sky / ground
    const hemi = new THREE.HemisphereLight(
      L.hemisphere.skyColor, L.hemisphere.groundColor, L.hemisphere.intensity
    );
    this.scene.add(hemi);
  }

  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
