import * as THREE from 'three';
import { THEME } from './Theme.js';

export function createTextSprite(text, fontSize = 48, color = '#2C2C2C', bgColor = null) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const scale = 3; // render at 3x for crisp text
  ctx.font = `bold ${fontSize * scale}px system-ui, -apple-system, sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const padding = 12 * scale;

  canvas.width = textWidth + padding * 2;
  canvas.height = (fontSize * scale) * 1.4 + padding * 2;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    const r = 6 * scale;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, r);
    ctx.fill();
  }

  ctx.font = `bold ${fontSize * scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);

  const spriteScale = canvas.width / canvas.height;
  const height = 0.5;
  sprite.scale.set(height * spriteScale, height, 1);

  return sprite;
}

export function createShadowDisc(radius = 0.5) {
  const geo = new THREE.CircleGeometry(radius, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: THEME.shadowDisc.color,
    transparent: true,
    opacity: THEME.shadowDisc.opacity,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  return mesh;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
