import { Avatar } from './Avatar.js';
import { computeEnergy, computePhaseBalance } from '../data/EnergyCalculator.js';

// Padding around obstacles for avatar body radius
const AVATAR_RADIUS = 0.2;

export class AvatarManager {
  constructor(scene, office, store, offset) {
    this.scene = scene;
    this.office = office;
    this.store = store;
    this.offset = offset;
    this.avatars = new Map(); // personId -> Avatar

    // Cache obstacles for execution zone (world coordinates) with avatar padding
    this._execObstacles = this._buildExecObstacles();
    // Cache execution zone world bounds for wide wandering
    this._execBounds = this._buildExecBounds();

    this.refresh();
  }

  // Convert execution zone local obstacles to world-space, with avatar-radius padding
  _buildExecObstacles() {
    const execution = this.office.getExecution();
    const execGroup = execution.getGroup();
    const localObs = execution.getObstacles();
    return localObs.map(o => ({
      x: execGroup.position.x + o.x + this.offset.x,
      z: execGroup.position.z + o.z + this.offset.z,
      hw: o.hw + AVATAR_RADIUS,
      hd: o.hd + AVATAR_RADIUS
    }));
  }

  _buildExecBounds() {
    const execution = this.office.getExecution();
    const execGroup = execution.getGroup();
    return {
      minX: execGroup.position.x + this.offset.x + 0.5,
      maxX: execGroup.position.x + execution.width + this.offset.x - 0.5,
      minZ: execGroup.position.z + this.offset.z + 0.5,
      maxZ: execGroup.position.z + execution.depth + this.offset.z - 0.5
    };
  }

  // Check if a point overlaps any execution zone obstacle
  _isBlockedByDesk(x, z) {
    for (const obs of this._execObstacles) {
      if (Math.abs(x - obs.x) < obs.hw && Math.abs(z - obs.z) < obs.hd) {
        return true;
      }
    }
    return false;
  }

  refresh() {
    const people = this.store.getPeople();
    const currentIds = new Set(people.map(p => p.id));

    // Remove avatars for deleted people
    for (const [id, avatar] of this.avatars) {
      if (!currentIds.has(id)) {
        this.scene.remove(avatar.group);
        avatar.dispose();
        this.avatars.delete(id);
      }
    }

    // Add/update avatars
    let deskIndex = 0;
    for (const person of people) {
      let avatar = this.avatars.get(person.id);

      if (!avatar) {
        avatar = new Avatar(person);
        this.avatars.set(person.id, avatar);
        this.scene.add(avatar.group);
      }

      // Compute energy and phase
      const energy = computeEnergy(person);
      const discoveryRatio = computePhaseBalance(person);
      const allComplete = person.tasks.length > 0 &&
        person.tasks.every(t => t.percentComplete >= 100);
      const hasNoWork = person.tasks.length === 0;
      const justStarting = person.tasks.length > 0 &&
        person.tasks.every(t => t.percentComplete === 0);

      avatar.setEnergy(energy);

      // Journey flow: Lobby → Maze → Desks → Break Room
      if (allComplete) {
        this._positionInBreakRoom(avatar, person);
      } else if (hasNoWork || justStarting) {
        this._positionInLobby(avatar, person);
      } else if (discoveryRatio > 0.5) {
        this._positionInMaze(avatar, person, discoveryRatio);
      } else {
        this._positionAtDesk(avatar, person, deskIndex);
        deskIndex++;
      }
    }
  }

  _positionInLobby(avatar, person) {
    const center = this.office.getCommon().getLobbyCenter();
    const cx = center.x + this.offset.x;
    const cz = center.z + this.offset.z;

    // Scatter around lobby center
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 2;
    avatar.setHomePosition(
      cx + Math.cos(angle) * r,
      cz + Math.sin(angle) * r
    );
    avatar.setInMaze(false);

    // Wander provider: roam around lobby, avoid the reception desk (center area)
    const deskRadius = 1.5;
    const deskZ = cz - 1.5; // desk is at 35% of depth, slightly north of center
    avatar.setWanderProvider(() => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 1.0 + Math.random() * 2.5;
        const tx = cx + Math.cos(a) * dist;
        const tz = cz + Math.sin(a) * dist;

        // Avoid reception desk area
        const dx = tx - cx;
        const dz = tz - deskZ;
        if (Math.sqrt(dx * dx + dz * dz) > deskRadius) {
          return { x: tx, z: tz };
        }
      }
      return { x: cx + deskRadius + 0.5, z: cz };
    });
  }

  _positionInMaze(avatar, person, discoveryRatio) {
    const maze = this.office.getMaze();
    const normalizedDepth = (discoveryRatio - 0.5) * 2;
    const cell = maze.getCellAtDepth(normalizedDepth);

    if (cell) {
      avatar.setHomePosition(cell.worldX, cell.worldZ);
      avatar.setInMaze(true);

      // Wander provider: pick a connected neighbor cell
      avatar.setWanderProvider(() => {
        // Find the cell the avatar is currently closest to
        const pos = avatar.group.position;
        let closest = cell;
        let bestDist = Infinity;
        for (const wc of maze.walkableCells) {
          const dx = wc.worldX - pos.x;
          const dz = wc.worldZ - pos.z;
          const d = dx * dx + dz * dz;
          if (d < bestDist) {
            bestDist = d;
            closest = wc;
          }
        }

        const neighbors = maze.getNeighborCells(closest.row, closest.col);
        if (neighbors.length === 0) return null;

        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        return { x: pick.worldX, z: pick.worldZ };
      });
    }
  }

  _positionAtDesk(avatar, person, index) {
    const execution = this.office.getExecution();
    const desk = execution.getDeskPosition(index);
    const execGroup = execution.getGroup();

    const worldX = execGroup.position.x + desk.x + this.offset.x;
    const worldZ = execGroup.position.z + desk.z + this.offset.z;

    avatar.setHomePosition(worldX, worldZ);
    avatar.setInMaze(false);

    const bounds = this._execBounds;
    const mgr = this;

    // Wander provider: roam freely across the whole execution zone floor
    avatar.setWanderProvider(() => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const tx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const tz = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);

        if (!mgr._isBlockedByDesk(tx, tz)) {
          return { x: tx, z: tz };
        }
      }
      // Fallback: a known open spot (behind the avatar's own desk chair)
      return { x: worldX, z: worldZ + 0.5 };
    });

    // Give execution avatars a collision checker for per-step avoidance
    avatar.setCollisionChecker((x, z) => mgr._isBlockedByDesk(x, z));
  }

  _positionInBreakRoom(avatar, person) {
    const center = this.office.getCommon().getBreakRoomCenter();
    const cx = center.x + this.offset.x;
    const cz = center.z + this.offset.z;

    // Scatter around break room center
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 2;
    avatar.setHomePosition(
      cx + Math.cos(angle) * r,
      cz + Math.sin(angle) * r
    );
    avatar.setInMaze(false);

    // Wander provider: avoid the center table (radius ~1.2)
    const tableRadius = 1.3;
    avatar.setWanderProvider(() => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 1.0 + Math.random() * 3.0;
        const tx = cx + Math.cos(a) * dist;
        const tz = cz + Math.sin(a) * dist;

        // Check distance from table center
        const dx = tx - cx;
        const dz = tz - cz;
        if (Math.sqrt(dx * dx + dz * dz) > tableRadius) {
          return { x: tx, z: tz };
        }
      }
      // Fallback: outside the table
      return { x: cx + tableRadius + 0.5, z: cz };
    });
  }

  update(dt) {
    for (const avatar of this.avatars.values()) {
      avatar.update(dt, this._camera);
    }
  }

  setCamera(camera) {
    this._camera = camera;
  }

  getAvatars() {
    return this.avatars;
  }

  getPickableObjects() {
    const pickables = [];
    for (const avatar of this.avatars.values()) {
      for (const mesh of avatar.getPickables()) {
        mesh.userData.personId = avatar.personId;
        pickables.push(mesh);
      }
    }
    return pickables;
  }
}
