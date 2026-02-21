# Work RPG

An isometric 3D visualization that turns your team's task progress into a living office scene. Inspired by the aesthetic of *Severance*, the office sits on a circular green carpet and maps each person's work journey through four spatial zones.

## The Idea

Every team member has tasks with a mix of **discovery** (research, exploration, ideation) and **execution** (building, shipping, refining). Work RPG computes an **energy score** from deadlines, phase balance, and completion — then places each person in the zone that reflects where they are in their work:

| Zone | Who ends up here |
|---|---|
| **Lobby** | New joiners or people with no assigned tasks — waiting to begin |
| **Discovery Maze** | People whose work is >50% discovery — deeper into the maze the more exploratory their work is |
| **Execution Zone** | People in heads-down build mode — seated at Severance-style desk pods with CRT monitors and cross-shaped partitions |
| **Break Room** | People who've completed all their tasks — relaxing by the round table |

Avatars wander autonomously within their zone, navigating around furniture and maze walls. Click any avatar to see their energy breakdown, task list, deadlines, and phase balance.

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Tech

- **Three.js** for the 3D scene (orthographic isometric camera)
- **Vite** for dev server and builds
- **Vanilla JS** — no framework, ES modules throughout
- **localStorage** for persisting team data across sessions

## Project Structure

```
src/
  data/
    SeedData.js          # Team members and their tasks
    Store.js             # localStorage-backed data store with event emitter
    EnergyCalculator.js  # Time decay + phase balance energy formula
  scene/
    SceneManager.js      # Three.js renderer, camera, lighting, green circular floor
    Office.js            # Arranges the four zones left-to-right
    MazeBuilder.js       # Procedural maze for the discovery zone
    ExecutionZone.js     # Severance-style desk pods with cross partitions
    CommonAreas.js       # Lobby (reception desk) and Break Room (round table, plants)
    AvatarManager.js     # Places avatars in zones based on energy/phase, handles wandering
    Avatar.js            # Individual avatar mesh, animation, energy bar
    CameraControls.js    # Pan, zoom, rotate (mouse + touch)
    EnergyBar.js         # Floating energy bar above each avatar
  interaction/
    Raycaster.js         # Click and hover detection on avatars
    Tooltip.js           # Hover tooltip with person name
  ui/
    DetailPanel.js       # Side panel with energy breakdown and task list
    EditorPanel.js       # Team editor for adding/editing people and tasks
    TaskForm.js          # Task creation/editing form
    Toolbar.js           # Top toolbar with Team Editor button
  utils/
    Colors.js            # Palette constants (Severance greens, avatar colors)
    Geometry.js          # Shared geometry helpers
    Math.js              # UUID generation, clamp, lerp
  styles/
    main.css             # UI styling
```

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

## License

MIT
