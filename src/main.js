import { SceneManager } from './scene/SceneManager.js';
import { CameraControls } from './scene/CameraControls.js';
import { Store } from './data/Store.js';
import { SeedAdapter } from './data/SeedAdapter.js';
import { GoogleSheetsAdapter } from './data/GoogleSheetsAdapter.js';
import { GameGrid } from './map/GameGrid.js';
import { TerrainGenerator } from './map/TerrainGenerator.js';
import { GameMap } from './map/GameMap.js';
import { FogOfWar } from './map/FogOfWar.js';
import { Base } from './map/Base.js';
import { UnitManager } from './units/UnitManager.js';
import { AnimalManager } from './units/AnimalManager.js';
import { Raycaster } from './interaction/Raycaster.js';
import { Tooltip } from './interaction/Tooltip.js';
import { Toolbar } from './ui/Toolbar.js';
import { EditorPanel } from './ui/EditorPanel.js';
import { DetailPanel } from './ui/DetailPanel.js';
import { CONFIG } from './utils/Config.js';
import { resourceColorForCategory } from './utils/Colors.js';
import { computeStructureProgress } from './data/ResourceCalculator.js';
import { generateTerrainTextures } from './map/TextureGenerator.js';

async function boot() {
  const canvas = document.getElementById('scene');
  const uiRoot = document.getElementById('ui-root');
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Scene ---
  const sceneManager = new SceneManager(canvas);
  const scene = sceneManager.getScene();
  const camera = sceneManager.getCamera();
  const renderer = sceneManager.getRenderer();

  // --- Data ---
  const adapter = CONFIG.DATA_SOURCE === 'google-sheets'
    ? new GoogleSheetsAdapter()
    : new SeedAdapter();
  const store = new Store(adapter);
  await store.syncFromAdapter();

  // --- Grid + Terrain ---
  const mapSize = CONFIG.MAP_SIZE;
  const grid = new GameGrid(mapSize, mapSize);
  const terrainGen = new TerrainGenerator();
  terrainGen.generate(grid);

  // Place resource nodes from tasks
  const tasks = store.getTasks();
  const resourceNodePositions = terrainGen.placeResourceNodes(grid, tasks);

  // Place structures from milestones
  const milestones = store.getMilestones();
  const structurePositions = terrainGen.placeStructures(grid, milestones);

  // --- Terrain textures ---
  const terrainTextures = generateTerrainTextures();

  // --- Map renderer ---
  const gameMap = new GameMap(grid, terrainTextures);
  const offset = gameMap.centerOffset();
  gameMap.getGroup().position.set(offset.x, 0, offset.z);
  scene.add(gameMap.getGroup());

  // Add resource node visuals
  for (const node of resourceNodePositions) {
    const color = resourceColorForCategory(node.resourceType);
    gameMap.addResourceNode(node.taskId, node.col, node.row, color);
    if (node.depleted) gameMap.setResourceNodeDepleted(node.taskId);
  }

  // Add structure visuals
  for (const sp of structurePositions) {
    const ms = store.getMilestone(sp.milestoneId);
    gameMap.addStructure(sp.milestoneId, sp.col, sp.row);
    if (ms) {
      const progress = computeStructureProgress(ms, store.getTasks());
      gameMap.setStructureProgress(sp.milestoneId, progress);
    }
  }

  // --- Fog of War ---
  const fog = new FogOfWar(grid);
  fog.getGroup().position.set(offset.x, 0, offset.z);
  scene.add(fog.getGroup());

  // Reveal base area
  const center = Math.floor(mapSize / 2);
  fog.revealRadius(center, center, CONFIG.BASE_RADIUS + 2);

  // --- Base ---
  const base = new Base(grid, center, center, CONFIG.BASE_RADIUS);
  base.getGroup().position.set(offset.x, 0, offset.z);
  scene.add(base.getGroup());

  // --- Camera controls ---
  const bounds = gameMap.getBounds();
  const adjustedBounds = {
    minX: bounds.minX + offset.x,
    maxX: bounds.maxX + offset.x,
    minZ: bounds.minZ + offset.z,
    maxZ: bounds.maxZ + offset.z,
    centerX: bounds.centerX + offset.x,
    centerZ: bounds.centerZ + offset.z,
  };
  const cameraControls = new CameraControls(camera, renderer, adjustedBounds);

  // --- Units ---
  const unitManager = new UnitManager(scene, grid, gameMap, fog, store, base);
  unitManager.setCamera(camera);
  unitManager.setWorldOffset(offset);
  unitManager.setResourceNodePositions(resourceNodePositions);
  unitManager.setStructurePositions(structurePositions);
  unitManager.refresh();

  // --- Animals (decorative wanderers) ---
  const animalManager = new AnimalManager(scene, grid, offset);
  animalManager.spawn(); // 5-8 random cats, dogs, penguins

  // --- Render loop (start early so scene is always live) ---
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    cameraControls.update(dt);
    unitManager.update(dt);
    animalManager.update(dt);
    gameMap.update(dt);
    fog.update(dt);
    sceneManager.render();
  }

  requestAnimationFrame(animate);

  // --- Interaction ---
  let raycaster, tooltip, detailPanel, toolbar, editorPanel;
  try {
    raycaster = new Raycaster(camera, renderer, unitManager, gameMap);
    tooltip = new Tooltip(uiRoot);

    // --- UI ---
    detailPanel = new DetailPanel(uiRoot, store);
    detailPanel.setUnitManager(unitManager);
    toolbar = new Toolbar(uiRoot);
    editorPanel = new EditorPanel(uiRoot, store);

    // Wire events
    toolbar.onToggleEditor(() => editorPanel.toggle());

    raycaster.onAvatarClick((personId) => detailPanel.open(personId));

    raycaster.onAvatarHover((personId, screenPos) => {
      if (personId) {
        const person = store.getPerson(personId);
        if (person) tooltip.show(person.name, screenPos.x, screenPos.y);
      } else {
        tooltip.hide();
      }
    });
  } catch (err) {
    console.error('[boot] UI init error:', err);
  }

  store.on('change', () => {
    unitManager.refresh();
    if (detailPanel) detailPanel.refresh();

    // Update structure progress
    for (const sp of structurePositions) {
      const ms = store.getMilestone(sp.milestoneId);
      if (ms) {
        const progress = computeStructureProgress(ms, store.getTasks());
        gameMap.setStructureProgress(sp.milestoneId, progress);
      }
    }
  });

  // Periodic sync from external data source
  if (CONFIG.DATA_SOURCE !== 'seed' && CONFIG.SYNC_INTERVAL_MS > 0) {
    setInterval(async () => {
      await store.syncFromAdapter();
    }, CONFIG.SYNC_INTERVAL_MS);
  }
}

boot().catch(err => console.error('[boot] Fatal:', err));
