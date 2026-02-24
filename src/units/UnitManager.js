import { Avatar } from '../scene/Avatar.js';
import { UnitStateMachine, UnitStates } from './UnitState.js';
import { computeUnitStamina, computeScoutSpeed, computeGatherRate } from '../data/ResourceCalculator.js';
import { FogState } from '../map/GameGrid.js';

const SCOUT_SIGHT = 4;
const GATHER_SIGHT = 1;
const GATHER_TIME = 4;   // seconds to fully gather a resource
const BUILD_TIME = 3;    // seconds to deposit / build
const DEPOSIT_TIME = 1.5;
const REST_TIME = 5;
const IDLE_WANDER_RADIUS = 3;
const SCOUT_FRONTIER_SEARCH = 200; // max tiles to check in BFS for frontier

export class UnitManager {
  constructor(scene, gameGrid, gameMap, fogOfWar, store, base) {
    this.scene = scene;
    this.grid = gameGrid;
    this.map = gameMap;
    this.fog = fogOfWar;
    this.store = store;
    this.base = base;
    this._camera = null;
    this._worldOffset = { x: 0, z: 0 };

    this.units = new Map(); // personId -> { avatar, sm }
    this._resourceNodePositions = new Map(); // taskId -> { col, row }
  }

  setWorldOffset(offset) {
    this._worldOffset = offset;
  }

  /** Convert grid-world coords to scene coords */
  _toScene(gx, gz) {
    return { x: gx + this._worldOffset.x, z: gz + this._worldOffset.z };
  }

  /** Convert scene coords to grid-world coords */
  _fromScene(sx, sz) {
    return { x: sx - this._worldOffset.x, z: sz - this._worldOffset.z };
  }

  setResourceNodePositions(positions) {
    for (const p of positions) {
      this._resourceNodePositions.set(p.taskId, { col: p.col, row: p.row });
    }
  }

  setStructurePositions(positions) {
    this._structurePositions = new Map();
    for (const p of positions) {
      this._structurePositions.set(p.milestoneId, { col: p.col, row: p.row });
    }
  }

  refresh() {
    const people = this.store.getPeople();
    const currentIds = new Set(people.map(p => p.id));

    // Remove avatars for deleted people
    for (const [id, unit] of this.units) {
      if (!currentIds.has(id)) {
        this.scene.remove(unit.avatar.group);
        unit.avatar.dispose();
        this.units.delete(id);
      }
    }

    // Add/update units
    const total = people.length;
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      let unit = this.units.get(person.id);

      if (!unit) {
        const avatar = new Avatar(person);
        const sm = new UnitStateMachine(person.id);
        unit = { avatar, sm };
        this.units.set(person.id, unit);
        this.scene.add(avatar.group);

        // Start at base (convert grid-world to scene coords)
        const spawn = this.base.getSpawnPosition(i, total);
        const sceneSpawn = this._toScene(spawn.x, spawn.z);
        avatar.setHomePosition(sceneSpawn.x, sceneSpawn.z);
      }

      // Update stamina
      const tasks = this.store.getTasksForPerson(person.id);
      const stamina = computeUnitStamina(tasks);
      unit.avatar.setEnergy(stamina);

      // Assign behavior if idle
      if (unit.sm.state === UnitStates.IDLE) {
        this._assignBehavior(unit, person);
      }
    }
  }

  // ─── Behavior Assignment ──────────────────────────────────────────

  _assignBehavior(unit, person) {
    const tasks = this.store.getTasksForPerson(person.id);

    if (tasks.length === 0) {
      this._assignScoutMission(unit);
      return;
    }

    const stamina = computeUnitStamina(tasks);
    if (stamina < 0.15) {
      unit.sm.transition(UnitStates.RESTING, { stateTimer: REST_TIME });
      this._moveToBase(unit);
      return;
    }

    // Find highest-priority incomplete task with an available resource node
    const incompleteTasks = tasks.filter(t => {
      if (t.percentComplete >= 100) return false;
      // Skip tasks whose resource is currently depleted/regrowing
      return this.map.isNodeAvailable(t.id);
    });

    if (incompleteTasks.length === 0) {
      // All tasks done or all resources currently depleted — go scout
      this._assignScoutMission(unit);
      return;
    }

    // Sort by: overdue first, then most remaining work
    incompleteTasks.sort((a, b) => {
      const aDue = a.expectedDate ? new Date(a.expectedDate) : new Date('2099-01-01');
      const bDue = b.expectedDate ? new Date(b.expectedDate) : new Date('2099-01-01');
      return aDue - bDue;
    });

    const task = incompleteTasks[0];
    const discoveryRatio = task.discoveryPercent / 100;
    const nodePos = this._resourceNodePositions.get(task.id);

    // If discovery-heavy and resource not yet revealed → scout toward it
    if (discoveryRatio > 0.5 && nodePos && !this.fog.isRevealed(nodePos.col, nodePos.row)) {
      unit.sm.transition(UnitStates.SCOUTING, {
        assignedTaskId: task.id,
        targetCol: nodePos.col,
        targetRow: nodePos.row,
      });
      this._pathTo(unit, nodePos.col, nodePos.row);
      return;
    }

    // Resource is discovered (or execution-heavy) → go gather
    if (nodePos) {
      unit.sm.transition(UnitStates.MOVING_TO_RESOURCE, {
        assignedTaskId: task.id,
        targetCol: nodePos.col,
        targetRow: nodePos.row,
        carryingResource: null,
      });
      this._pathTo(unit, nodePos.col, nodePos.row);
      return;
    }

    // No node position — scout instead of just sitting idle
    this._assignScoutMission(unit);
  }

  /**
   * Send a unit to explore the nearest unexplored frontier.
   * Uses BFS from the unit's current position to find the closest
   * walkable HIDDEN tile, then paths toward it.
   */
  _assignScoutMission(unit) {
    const avatarPos = unit.avatar.group.position;
    const gridWorld = this._fromScene(avatarPos.x, avatarPos.z);
    const startTile = this.grid.worldToTile(gridWorld.x, gridWorld.z);

    const target = this._findFrontierTile(startTile.col, startTile.row);
    if (target) {
      unit.sm.transition(UnitStates.SCOUTING, {
        assignedTaskId: null,
        targetCol: target.col,
        targetRow: target.row,
      });
      this._pathTo(unit, target.col, target.row);
    } else {
      // Entire map explored — wander near base
      unit.sm.transition(UnitStates.IDLE);
    }
  }

  /**
   * BFS outward from (startCol, startRow) to find the nearest walkable
   * tile that borders at least one HIDDEN tile (the "frontier").
   * Returns {col, row} or null if fully explored.
   */
  _findFrontierTile(startCol, startRow) {
    const visited = new Set();
    const queue = [{ col: startCol, row: startRow }];
    visited.add(`${startCol},${startRow}`);

    const frontierCandidates = [];
    let checked = 0;

    while (queue.length > 0 && checked < SCOUT_FRONTIER_SEARCH) {
      const { col, row } = queue.shift();
      checked++;

      const tile = this.grid.getTile(col, row);
      if (!tile || !this.grid.isWalkable(col, row)) continue;

      // Is this tile on the frontier? (revealed/visible tile adjacent to hidden tile)
      if (tile.fogState !== FogState.HIDDEN) {
        const neighbors = this.grid.getNeighbors(col, row);
        for (const n of neighbors) {
          const nTile = this.grid.getTile(n.col, n.row);
          if (nTile && nTile.fogState === FogState.HIDDEN && this.grid.isWalkable(n.col, n.row)) {
            frontierCandidates.push({ col, row });
            break;
          }
        }
      }

      // Expand BFS
      for (const n of this.grid.getNeighbors(col, row)) {
        const key = `${n.col},${n.row}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(n);
        }
      }
    }

    if (frontierCandidates.length === 0) return null;

    // Pick a random frontier tile (not always the nearest — adds variety)
    return frontierCandidates[Math.floor(Math.random() * frontierCandidates.length)];
  }

  // ─── Pathfinding ──────────────────────────────────────────────────

  _pathTo(unit, col, row) {
    const avatarPos = unit.avatar.group.position;
    const gridWorld = this._fromScene(avatarPos.x, avatarPos.z);
    const currentTile = this.grid.worldToTile(gridWorld.x, gridWorld.z);
    const path = this.grid.findPath(currentTile.col, currentTile.row, col, row);
    unit.sm.path = path;
    unit.sm.pathIndex = 0;
  }

  _moveToBase(unit) {
    const deposit = this.base.getDepositPosition();
    const tile = this.grid.worldToTile(deposit.x, deposit.z);
    this._pathTo(unit, tile.col, tile.row);
  }

  // ─── Update Loop ──────────────────────────────────────────────────

  update(dt) {
    const unitPositions = [];

    for (const [personId, unit] of this.units) {
      const { avatar, sm } = unit;

      switch (sm.state) {
        case UnitStates.IDLE:
          this._handleIdle(unit, dt);
          break;
        case UnitStates.SCOUTING:
          this._handleScouting(unit, dt, personId);
          break;
        case UnitStates.MOVING_TO_RESOURCE:
          this._handleMovement(unit, dt, 3.0);
          break;
        case UnitStates.GATHERING:
          this._handleGathering(unit, dt);
          break;
        case UnitStates.RETURNING_TO_BASE:
          this._handleMovement(unit, dt, 2.5);
          break;
        case UnitStates.DEPOSITING:
          this._handleDepositing(unit, dt);
          break;
        case UnitStates.MOVING_TO_STRUCTURE:
          this._handleMovement(unit, dt, 2.5);
          break;
        case UnitStates.BUILDING:
          this._handleBuilding(unit, dt);
          break;
        case UnitStates.RESTING:
          this._handleResting(unit, dt);
          break;
      }

      avatar.update(dt, this._camera);

      // Track unit position for fog updates (convert scene to grid coords)
      const pos = avatar.group.position;
      const gridWorld = this._fromScene(pos.x, pos.z);
      const tile = this.grid.worldToTile(gridWorld.x, gridWorld.z);
      const sightRadius = sm.state === UnitStates.SCOUTING ? SCOUT_SIGHT : GATHER_SIGHT;
      unitPositions.push({ col: tile.col, row: tile.row, sightRadius });
    }

    // Update fog visibility based on unit positions
    this.fog.updateVisibility(unitPositions);

    // Update resource node visibility based on fog
    for (const [taskId, pos] of this._resourceNodePositions) {
      const visible = this.fog.isRevealed(pos.col, pos.row);
      this.map.setResourceNodeVisible(taskId, visible);
    }
  }

  // ─── State Handlers ───────────────────────────────────────────────

  _handleIdle(unit, dt) {
    // Gentle wander near base while waiting for reassignment
    unit.sm.stateTimer -= dt;

    if (unit.sm.stateTimer <= 0) {
      const basePos = this.base.getDepositPosition();
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * IDLE_WANDER_RADIUS;
      const tx = basePos.x + Math.cos(angle) * r;
      const tz = basePos.z + Math.sin(angle) * r;
      const scenePt = this._toScene(tx, tz);

      unit.avatar.wanderTarget.set(scenePt.x, 0, scenePt.z);
      unit.sm.stateTimer = 2 + Math.random() * 3;
    }

    // Re-evaluate behavior frequently so units don't stay idle long
    if (Math.random() < dt * 0.5) {
      const person = this.store.getPerson(unit.sm.personId);
      if (person) this._assignBehavior(unit, person);
    }
  }

  _handleScouting(unit, dt, personId) {
    const speed = computeScoutSpeed(this.store.getTasksForPerson(personId)) * 3.0;
    this._handleMovement(unit, dt, speed);
  }

  _handleMovement(unit, dt, speed) {
    const { avatar, sm } = unit;

    if (!sm.path || sm.pathIndex >= sm.path.length) {
      this._onArrival(unit);
      return;
    }

    const targetStep = sm.path[sm.pathIndex];
    const targetWorld = this.grid.tileToWorld(targetStep.col, targetStep.row);
    const target = this._toScene(targetWorld.x, targetWorld.z);

    const dx = target.x - avatar.group.position.x;
    const dz = target.z - avatar.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
      sm.pathIndex++;
    } else {
      const step = Math.min(speed * dt, dist);
      avatar.group.position.x += (dx / dist) * step;
      avatar.group.position.z += (dz / dist) * step;
      avatar._faceDirection(dx, dz, dt);
      avatar._updateWalkAnimation(dt);
    }
  }

  _onArrival(unit) {
    const { sm } = unit;

    switch (sm.state) {
      case UnitStates.SCOUTING:
        if (sm.assignedTaskId) {
          // Was scouting toward a task resource — now gather it
          sm.transition(UnitStates.GATHERING, {
            assignedTaskId: sm.assignedTaskId,
            carryingResource: null,
          });
        } else {
          // General exploration — pick another frontier target
          const person = this.store.getPerson(sm.personId);
          sm.transition(UnitStates.IDLE);
          if (person) this._assignBehavior(unit, person);
        }
        break;

      case UnitStates.MOVING_TO_RESOURCE:
        sm.transition(UnitStates.GATHERING, {
          assignedTaskId: sm.assignedTaskId,
          carryingResource: null,
        });
        break;

      case UnitStates.RETURNING_TO_BASE:
        sm.transition(UnitStates.DEPOSITING, {
          carryingResource: sm.carryingResource,
          assignedTaskId: sm.assignedTaskId,
        });
        break;

      case UnitStates.MOVING_TO_STRUCTURE:
        sm.transition(UnitStates.BUILDING, {
          assignedMilestoneId: sm.assignedMilestoneId,
          assignedTaskId: sm.assignedTaskId,
          carryingResource: sm.carryingResource,
        });
        break;

      default:
        sm.transition(UnitStates.IDLE);
        break;
    }
  }

  _handleGathering(unit, dt) {
    const { sm } = unit;
    const tasks = this.store.getTasksForPerson(sm.personId);
    const gatherRate = computeGatherRate(tasks);

    sm.stateTimer += dt * gatherRate;
    sm.gatherProgress = Math.min(1, sm.stateTimer / GATHER_TIME);

    unit.avatar.playGatherAnimation(dt);

    if (sm.gatherProgress >= 1) {
      const task = this.store.getTask(sm.assignedTaskId);
      sm.carryingResource = {
        type: task ? (task.category || 'Resource') : 'Resource',
        taskId: sm.assignedTaskId,
      };
      unit.avatar.setCarrying(true);

      // Deplete the resource node visually (will regrow later)
      this.map.depleteNode(sm.assignedTaskId);

      // Redirect to milestone structure if task has one, otherwise base
      const milestoneId = task ? task.milestoneId : null;
      const structPos = milestoneId && this._structurePositions
        ? this._structurePositions.get(milestoneId)
        : null;

      if (structPos) {
        sm.transition(UnitStates.MOVING_TO_STRUCTURE, {
          carryingResource: sm.carryingResource,
          assignedTaskId: sm.assignedTaskId,
          assignedMilestoneId: milestoneId,
          targetCol: structPos.col,
          targetRow: structPos.row,
        });
        this._pathTo(unit, structPos.col, structPos.row);
      } else {
        sm.transition(UnitStates.RETURNING_TO_BASE, {
          carryingResource: sm.carryingResource,
          assignedTaskId: sm.assignedTaskId,
        });
        this._moveToBase(unit);
      }
    }
  }

  _handleDepositing(unit, dt) {
    const { sm } = unit;
    sm.stateTimer += dt;

    if (sm.stateTimer >= DEPOSIT_TIME) {
      const task = this.store.getTask(sm.assignedTaskId);
      if (task && task.percentComplete < 100) {
        const advance = Math.min(100 - task.percentComplete, 15 + Math.random() * 10);
        this.store.updateTask(sm.assignedTaskId, {
          percentComplete: Math.min(100, task.percentComplete + advance),
        });
      }

      unit.avatar.setCarrying(false);
      sm.carryingResource = null;

      const person = this.store.getPerson(sm.personId);
      sm.transition(UnitStates.IDLE);
      if (person) this._assignBehavior(unit, person);
    }
  }

  _handleBuilding(unit, dt) {
    const { sm } = unit;
    sm.stateTimer += dt;
    sm.buildProgress = Math.min(1, sm.stateTimer / BUILD_TIME);

    unit.avatar.playBuildAnimation(dt);

    if (sm.buildProgress >= 1) {
      // Advance task progress (deposit resource into structure)
      if (sm.assignedTaskId) {
        const task = this.store.getTask(sm.assignedTaskId);
        if (task && task.percentComplete < 100) {
          const advance = Math.min(100 - task.percentComplete, 15 + Math.random() * 10);
          this.store.updateTask(sm.assignedTaskId, {
            percentComplete: Math.min(100, task.percentComplete + advance),
          });
        }

        // If task reached 100%, permanently deplete its resource node
        const updatedTask = this.store.getTask(sm.assignedTaskId);
        if (updatedTask && updatedTask.percentComplete >= 100) {
          this.map.depleteNode(sm.assignedTaskId, true);
        }
      }

      unit.avatar.setCarrying(false);
      sm.carryingResource = null;

      sm.transition(UnitStates.IDLE);
      const person = this.store.getPerson(sm.personId);
      if (person) this._assignBehavior(unit, person);
    }
  }

  _handleResting(unit, dt) {
    const { sm } = unit;
    sm.stateTimer -= dt;

    if (sm.stateTimer <= 0) {
      sm.transition(UnitStates.IDLE);
      const person = this.store.getPerson(sm.personId);
      if (person) this._assignBehavior(unit, person);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  setCamera(camera) {
    this._camera = camera;
  }

  getPickableObjects() {
    const pickables = [];
    for (const unit of this.units.values()) {
      for (const mesh of unit.avatar.getPickables()) {
        mesh.userData.personId = unit.avatar.personId;
        pickables.push(mesh);
      }
    }
    return pickables;
  }

  getUnitState(personId) {
    const unit = this.units.get(personId);
    return unit ? unit.sm : null;
  }

  getAvatars() {
    const avatars = new Map();
    for (const [id, unit] of this.units) {
      avatars.set(id, unit.avatar);
    }
    return avatars;
  }
}
