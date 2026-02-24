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
import { THEME, THEME_NIGHT } from './utils/Theme.js';

// ─── Spawn Sequencer ─────────────────────────────────────────────────────────
// Drives the "characters emerging from the base" intro sequence.
// Each entity: door opens → entity walks out → door closes → next

const EMERGE_DISTANCE = 2.0;    // tiles to walk out from door
const EMERGE_SPEED = 3.0;       // tiles/sec while walking out

class SpawnSequencer {
  /**
   * @param {Base} base
   * @param {{x:number, z:number}} worldOffset — grid-to-scene offset
   */
  constructor(base, worldOffset) {
    this._base = base;
    this._offset = worldOffset;
    this._queue = [];       // { group, onSpawned, type }
    this._currentIndex = 0;
    this._state = 'idle';   // idle | door_opening | emerging | door_closing
    this._timer = 0;
    this._emergeStart = null;
    this._emergeEnd = null;
    this._done = false;
  }

  /**
   * Add an entity to the spawn queue.
   * @param {THREE.Group} group — the entity's 3D group
   * @param {Function} onSpawned — called when entity finishes emerging
   * @param {'person'|'animal'} type
   */
  addEntity(group, onSpawned, type = 'person') {
    this._queue.push({ group, onSpawned, type });
  }

  isDone() { return this._done; }

  update(dt) {
    if (this._done) return;

    // Nothing in queue
    if (this._queue.length === 0) {
      this._done = true;
      return;
    }

    // All spawned
    if (this._currentIndex >= this._queue.length) {
      // Wait for door to close after last entity
      if (this._state === 'door_closing') {
        this._base.closeDoor(dt);
        if (this._base.isDoorClosed()) {
          this._state = 'idle';
          this._done = true;
        }
      } else {
        this._done = true;
      }
      return;
    }

    const entry = this._queue[this._currentIndex];
    const doorExit = this._base.getDoorExitPosition();
    const sceneExit = {
      x: doorExit.x + this._offset.x,
      z: doorExit.z + this._offset.z,
    };

    switch (this._state) {
      case 'idle':
        // Start opening door for next entity
        this._state = 'door_opening';
        // Position entity at door exit, hidden
        entry.group.position.set(sceneExit.x, 0, sceneExit.z);
        entry.group.visible = false;
        break;

      case 'door_opening':
        this._base.openDoor(dt);
        if (this._base.isDoorOpen()) {
          // Door is open — entity starts emerging
          this._state = 'emerging';
          entry.group.visible = true;
          entry.group.position.set(sceneExit.x, 0, sceneExit.z);
          this._emergeStart = { x: sceneExit.x, z: sceneExit.z };
          this._emergeEnd = {
            x: sceneExit.x,
            z: sceneExit.z + EMERGE_DISTANCE,
          };
          this._timer = 0;
        }
        break;

      case 'emerging': {
        this._timer += dt;
        const emergeDuration = EMERGE_DISTANCE / EMERGE_SPEED;
        const t = Math.min(1, this._timer / emergeDuration);

        // Lerp position from start to end
        entry.group.position.x = this._emergeStart.x + (this._emergeEnd.x - this._emergeStart.x) * t;
        entry.group.position.z = this._emergeStart.z + (this._emergeEnd.z - this._emergeStart.z) * t;
        entry.group.position.y = 0;

        if (t >= 1) {
          // Done emerging — call onSpawned and start closing door
          if (entry.onSpawned) entry.onSpawned();
          this._currentIndex++;
          this._state = 'door_closing';
          this._timer = 0;
        }
        break;
      }

      case 'door_closing':
        this._base.closeDoor(dt);
        this._timer += dt;
        // Overlap: start opening for next entity after door is mostly closed
        // or after a brief pause
        if (this._base.isDoorClosed() || this._timer > 0.4) {
          this._state = 'idle'; // will immediately start next entity
        }
        break;
    }
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────

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

  // --- Map renderer (no textures — flat matte colors) ---
  const gameMap = new GameMap(grid, null);
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

  // --- Units (all start hidden — spawn sequencer reveals them) ---
  const unitManager = new UnitManager(scene, grid, gameMap, fog, store, base);
  unitManager.setCamera(camera);
  unitManager.setWorldOffset(offset);
  unitManager.setResourceNodePositions(resourceNodePositions);
  unitManager.setStructurePositions(structurePositions);
  unitManager.refresh();

  // --- Animals (all start hidden — spawn sequencer reveals them) ---
  const animalManager = new AnimalManager(scene, grid, offset);
  animalManager.setDoorExitPosition(base.getDoorExitPosition());
  animalManager.spawn(); // 5-8 random cats, dogs, penguins

  // --- Spawn Sequencer ---
  const spawnSequencer = new SpawnSequencer(base, offset);

  // Queue people first, then animals
  const avatarList = unitManager.getAvatarList();
  for (const { personId, avatar } of avatarList) {
    spawnSequencer.addEntity(avatar.group, () => {
      unitManager.markSpawned(personId);
    }, 'person');
  }

  const animalList = animalManager.getAnimalList();
  for (const { index, group } of animalList) {
    spawnSequencer.addEntity(group, () => {
      animalManager.markSpawned(index);
    }, 'animal');
  }

  // --- Render loop (start early so scene is always live) ---
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    cameraControls.update(dt);

    // Drive the spawn intro sequence
    if (!spawnSequencer.isDone()) {
      spawnSequencer.update(dt);
    }

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
    toolbar.onToggleDayNight((isNight) => {
      const t = isNight ? 1 : 0;
      sceneManager.setTimeOfDay(t);
      unitManager.setTimeOfDay(t);

      // Lerp fog color
      const dFog = THEME.fog.color;
      const nFog = THEME_NIGHT.fog.color;
      const fogR = Math.round(dFog.r + (nFog.r - dFog.r) * t);
      const fogG = Math.round(dFog.g + (nFog.g - dFog.g) * t);
      const fogB = Math.round(dFog.b + (nFog.b - dFog.b) * t);
      fog.setFogColor(fogR, fogG, fogB);
    });

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
