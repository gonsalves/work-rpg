# Work RPG

An Age of Empires–inspired isometric visualization that turns your team's task progress into a fog-of-war resource-gathering game. Built with Three.js.

## The Idea

Every team member becomes a **unit** on a procedurally generated map. Tasks are **resource nodes** scattered across the terrain — the more discovery-heavy a task, the farther it spawns from base. Milestones become **structures** that units build once their contributing tasks are complete.

Units autonomously scout through fog of war, gather resources, return them to the town center, and build milestone structures — all driven by real task data.

### How work maps to gameplay

| Work concept | Game equivalent |
|---|---|
| **Person** | Unit with colored avatar, name label, and stamina bar |
| **Task** | Resource node (crystal) placed on the map |
| **Discovery %** | Distance from base — high-discovery tasks are hidden deep in fog |
| **Execution %** | Gather speed — execution-heavy tasks are faster to collect |
| **Task completion** | Resource depletion — nodes grey out at 100% |
| **Milestone** | Structure — wireframe fills in as contributing tasks complete |
| **Deadline pressure** | Stamina drain — overdue tasks sap a unit's energy |

### Dynamic fog of war

The map starts shrouded in black fog. As units explore, tiles are permanently revealed with a translucent overlay. Tiles near a unit are fully transparent — when the unit moves away, fog gently returns to a semi-transparent state. The result is a living map that shows exploration history while keeping the frontier visible.

### Unit behavior

Units follow a state machine: **Idle → Scouting → Moving to Resource → Gathering → Returning to Base → Depositing → Building → Resting**. They prioritize overdue tasks, scout toward undiscovered high-discovery resources via BFS frontier search, and rest at base when stamina is low.

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5174`.

## Data Sources

By default, the app uses **seed data** (6 people, 10 tasks, 2 milestones). To connect a Google Sheet:

1. Publish your sheet to the web (File → Share → Publish to web → CSV)
2. Set `DATA_SOURCE: 'google-sheets'` and your `GOOGLE_SHEET_ID` in `src/utils/Config.js`

The sheet should have three tabs: **People**, **Tasks**, and **Milestones**.

## Tech

- **Three.js** — isometric orthographic camera, InstancedMesh terrain, DataTexture fog overlay
- **Vite** — dev server and production builds
- **Vanilla JS** — no framework, ES modules throughout
- **localStorage** — persists task progress across sessions
- **A\* pathfinding** — on a 48×48 tile grid with procedural terrain

## Project Structure

```
src/
  data/
    DataAdapter.js          # Interface for data sources
    SeedAdapter.js          # Built-in demo data (6 people, 10 tasks)
    GoogleSheetsAdapter.js  # Fetches CSV from a published Google Sheet
    ResourceCalculator.js   # Stamina, scout speed, gather rate formulas
    Store.js                # localStorage-backed store with event emitter
  map/
    GameGrid.js             # 48×48 tile grid, A* pathfinding, fog state
    TerrainGenerator.js     # Procedural terrain, resource/structure placement
    GameMap.js              # Three.js terrain renderer (InstancedMesh per tile type)
    FogOfWar.js             # DataTexture fog with two-layer alpha system
    Base.js                 # Town center mesh and spawn positions
  scene/
    SceneManager.js         # Three.js renderer, camera, lighting
    Avatar.js               # Unit mesh, walk/gather/build animations
    CameraControls.js       # Pan, zoom, rotate (mouse + touch)
    EnergyBar.js            # Floating stamina bar above each unit
  units/
    UnitManager.js          # Behavior assignment, pathfinding, state handlers
    UnitState.js            # State machine (9 states) with transition logic
  interaction/
    Raycaster.js            # Click/hover detection on units, resources, structures
    Tooltip.js              # Hover tooltip with person name
  ui/
    DetailPanel.js          # Side panel with stamina breakdown and task list
    EditorPanel.js          # Team editor for adding/editing people and tasks
    TaskForm.js             # Task creation/editing form
    Toolbar.js              # Top toolbar with Team Editor button
  utils/
    Colors.js               # Resource category color palette
    Config.js               # Map size, base radius, data source settings
    Geometry.js             # Shared geometry helpers (text sprites, shadows)
    Math.js                 # UUID generation, clamp, lerp
  styles/
    main.css                # UI styling
```

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## License

MIT
