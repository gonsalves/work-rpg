import * as THREE from 'three';
import { PALETTE } from '../utils/Colors.js';

export class SceneManager {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

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
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this._setupLights();
    this._buildGroundPlane();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    // Soft ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Main directional light (warm, from upper-right)
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    dirLight.position.set(20, 30, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Subtle fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.3);
    fillLight.position.set(-15, 20, -10);
    this.scene.add(fillLight);
  }

  _buildGroundPlane() {
    // Circular green carpet — the primary floor for the entire office
    const geo = new THREE.CircleGeometry(28, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.SEVERANCE_CARPET),
      roughness: 0.95,
      metalness: 0
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _onResize() {
    // Only resize the renderer; CameraControls handles the camera frustum each frame
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
