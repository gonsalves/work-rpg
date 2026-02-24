import * as THREE from 'three';
import { THEME, THEME_NIGHT } from '../utils/Theme.js';

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
    this._cacheDayNightColors();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    const L = THEME.lighting;

    // Even studio fill
    this._ambient = new THREE.AmbientLight(L.ambient.color, L.ambient.intensity);
    this.scene.add(this._ambient);

    // Soft directional — modeling light
    this._directional = new THREE.DirectionalLight(L.directional.color, L.directional.intensity);
    this._directional.position.set(...L.directional.position);
    this._directional.castShadow = true;
    this._directional.shadow.mapSize.width = L.directional.shadow.mapSize;
    this._directional.shadow.mapSize.height = L.directional.shadow.mapSize;
    this._directional.shadow.camera.near = L.directional.shadow.near;
    this._directional.shadow.camera.far = L.directional.shadow.far;
    this._directional.shadow.camera.left = -L.directional.shadow.extent;
    this._directional.shadow.camera.right = L.directional.shadow.extent;
    this._directional.shadow.camera.top = L.directional.shadow.extent;
    this._directional.shadow.camera.bottom = -L.directional.shadow.extent;
    this._directional.shadow.bias = L.directional.shadow.bias;
    this._directional.shadow.normalBias = L.directional.shadow.normalBias;
    this.scene.add(this._directional);

    // Fill from opposite side
    this._fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
    this._fill.position.set(...L.fill.position);
    this.scene.add(this._fill);

    // Hemisphere: even sky / ground
    this._hemi = new THREE.HemisphereLight(
      L.hemisphere.skyColor, L.hemisphere.groundColor, L.hemisphere.intensity
    );
    this.scene.add(this._hemi);
  }

  /** Pre-compute Color objects for efficient lerping. */
  _cacheDayNightColors() {
    const D = THEME.lighting;
    const N = THEME_NIGHT.lighting;

    this._dayBg    = new THREE.Color(THEME.scene.background);
    this._nightBg  = new THREE.Color(THEME_NIGHT.scene.background);
    this._dayExposure  = THEME.scene.toneMappingExposure;
    this._nightExposure = THEME_NIGHT.scene.toneMappingExposure;

    this._dayAmbientColor  = new THREE.Color(D.ambient.color);
    this._nightAmbientColor = new THREE.Color(N.ambient.color);

    this._dayDirColor   = new THREE.Color(D.directional.color);
    this._nightDirColor  = new THREE.Color(N.directional.color);
    this._dayDirPos   = new THREE.Vector3(...D.directional.position);
    this._nightDirPos  = new THREE.Vector3(...N.directional.position);

    this._dayFillColor  = new THREE.Color(D.fill.color);
    this._nightFillColor = new THREE.Color(N.fill.color);

    this._dayHemiSky    = new THREE.Color(D.hemisphere.skyColor);
    this._nightHemiSky   = new THREE.Color(N.hemisphere.skyColor);
    this._dayHemiGround  = new THREE.Color(D.hemisphere.groundColor);
    this._nightHemiGround = new THREE.Color(N.hemisphere.groundColor);

    // Temp colors for lerping (avoid allocations in hot path)
    this._tmpColor = new THREE.Color();
    this._tmpColor2 = new THREE.Color();
  }

  /**
   * Smoothly transition all lighting between day (t=0) and night (t=1).
   */
  setTimeOfDay(t) {
    const D = THEME.lighting;
    const N = THEME_NIGHT.lighting;

    // Background
    this.scene.background.copy(this._dayBg).lerp(this._nightBg, t);

    // Exposure
    this.renderer.toneMappingExposure =
      this._dayExposure + (this._nightExposure - this._dayExposure) * t;

    // Ambient
    this._ambient.color.copy(this._dayAmbientColor).lerp(this._nightAmbientColor, t);
    this._ambient.intensity = D.ambient.intensity + (N.ambient.intensity - D.ambient.intensity) * t;

    // Directional (sun → moon position shift)
    this._directional.color.copy(this._dayDirColor).lerp(this._nightDirColor, t);
    this._directional.intensity = D.directional.intensity + (N.directional.intensity - D.directional.intensity) * t;
    this._directional.position.copy(this._dayDirPos).lerp(this._nightDirPos, t);

    // Fill
    this._fill.color.copy(this._dayFillColor).lerp(this._nightFillColor, t);
    this._fill.intensity = D.fill.intensity + (N.fill.intensity - D.fill.intensity) * t;

    // Hemisphere
    this._hemi.color.copy(this._dayHemiSky).lerp(this._nightHemiSky, t);
    this._hemi.groundColor.copy(this._dayHemiGround).lerp(this._nightHemiGround, t);
    this._hemi.intensity = D.hemisphere.intensity + (N.hemisphere.intensity - D.hemisphere.intensity) * t;
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
