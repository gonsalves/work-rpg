import { SceneManager } from './scene/SceneManager.js';
import { Office } from './scene/Office.js';
import { CameraControls } from './scene/CameraControls.js';
import { Store } from './data/Store.js';
import { AvatarManager } from './scene/AvatarManager.js';
import { Raycaster } from './interaction/Raycaster.js';
import { Tooltip } from './interaction/Tooltip.js';
import { Toolbar } from './ui/Toolbar.js';
import { EditorPanel } from './ui/EditorPanel.js';
import { DetailPanel } from './ui/DetailPanel.js';

// Bootstrap
const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');

// Prevent context menu on canvas
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Scene
const sceneManager = new SceneManager(canvas);
const scene = sceneManager.getScene();
const camera = sceneManager.getCamera();
const renderer = sceneManager.getRenderer();

// Office
const office = new Office();
const offset = office.centerOffset();
office.getGroup().position.set(offset.x, 0, offset.z);

// Recalculate walkable cells after centering
for (const cell of office.getMaze().walkableCells) {
  cell.worldX += offset.x;
  cell.worldZ += offset.z;
}

scene.add(office.getGroup());

// Camera controls
const bounds = office.getBounds();
// Adjust bounds for the offset
const adjustedBounds = {
  minX: bounds.minX + offset.x,
  maxX: bounds.maxX + offset.x,
  minZ: bounds.minZ + offset.z,
  maxZ: bounds.maxZ + offset.z,
  centerX: bounds.centerX + offset.x,
  centerZ: bounds.centerZ + offset.z
};
const cameraControls = new CameraControls(camera, renderer, adjustedBounds);

// Data store
const store = new Store();

// Avatar manager
const avatarManager = new AvatarManager(scene, office, store, offset);
avatarManager.setCamera(camera);

// Interaction
const raycaster = new Raycaster(camera, renderer, avatarManager);
const tooltip = new Tooltip(uiRoot);

// UI
const detailPanel = new DetailPanel(uiRoot, store);
const toolbar = new Toolbar(uiRoot);
const editorPanel = new EditorPanel(uiRoot, store);

// Wire events
toolbar.onToggleEditor(() => {
  editorPanel.toggle();
});

raycaster.onAvatarClick((personId) => {
  detailPanel.open(personId);
});

raycaster.onAvatarHover((personId, screenPos) => {
  if (personId) {
    const person = store.getPerson(personId);
    if (person) {
      tooltip.show(person.name, screenPos.x, screenPos.y);
    }
  } else {
    tooltip.hide();
  }
});

store.on('change', () => {
  avatarManager.refresh();
  detailPanel.refresh();
});

// Render loop
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1); // cap delta to avoid jumps
  lastTime = now;

  cameraControls.update(dt);
  avatarManager.update(dt);
  sceneManager.render();
}

requestAnimationFrame(animate);
