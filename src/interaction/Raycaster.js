import * as THREE from 'three';

export class Raycaster {
  constructor(camera, renderer, avatarManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.avatarManager = avatarManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._clickCallbacks = [];
    this._hoverCallbacks = [];
    this._hoveredId = null;

    const canvas = renderer.domElement;
    canvas.addEventListener('click', (e) => this._onClick(e));
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
  }

  _getNDC(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _raycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const pickables = this.avatarManager.getPickableObjects();
    return this.raycaster.intersectObjects(pickables, false);
  }

  _onClick(e) {
    // Ignore if clicking on UI overlay
    if (e.target !== this.renderer.domElement) return;

    this._getNDC(e);
    const hits = this._raycast();

    if (hits.length > 0) {
      const personId = hits[0].object.userData.personId;
      if (personId) {
        for (const cb of this._clickCallbacks) cb(personId);
      }
    }
  }

  _onMouseMove(e) {
    if (e.target !== this.renderer.domElement) return;

    this._getNDC(e);
    const hits = this._raycast();

    if (hits.length > 0) {
      const personId = hits[0].object.userData.personId;
      if (personId !== this._hoveredId) {
        // Unhighlight previous
        if (this._hoveredId) {
          const prev = this.avatarManager.getAvatars().get(this._hoveredId);
          if (prev) prev.unhighlight();
        }
        // Highlight new
        this._hoveredId = personId;
        const avatar = this.avatarManager.getAvatars().get(personId);
        if (avatar) avatar.highlight();

        this.renderer.domElement.style.cursor = 'pointer';

        // Project avatar position to screen
        if (avatar) {
          const screenPos = this._worldToScreen(avatar.group.position);
          for (const cb of this._hoverCallbacks) cb(personId, screenPos);
        }
      }
    } else {
      if (this._hoveredId) {
        const prev = this.avatarManager.getAvatars().get(this._hoveredId);
        if (prev) prev.unhighlight();
        this._hoveredId = null;
        this.renderer.domElement.style.cursor = 'default';
        for (const cb of this._hoverCallbacks) cb(null, { x: 0, y: 0 });
      }
    }
  }

  _worldToScreen(position) {
    const vec = position.clone();
    vec.y += 2; // offset above avatar
    vec.project(this.camera);
    return {
      x: (vec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vec.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  onAvatarClick(cb) { this._clickCallbacks.push(cb); }
  onAvatarHover(cb) { this._hoverCallbacks.push(cb); }
}
