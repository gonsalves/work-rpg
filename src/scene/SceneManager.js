import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

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
    this.renderer.toneMappingExposure = 0.9;

    this._setupLights();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    // Higher ambient for matte clay look
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Main directional — pure white, raised higher for steeper shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 40, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    // Very subtle fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
    fillLight.position.set(-15, 20, -10);
    this.scene.add(fillLight);

    // Hemisphere: soft warm sky / cool ground
    const hemi = new THREE.HemisphereLight(0xF5F0E8, 0xD0D5DD, 0.2);
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
