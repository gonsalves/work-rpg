import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store } from '../src/data/Store.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _store: store,
  };
})();

// Mock crypto.randomUUID for generateUUID
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) });

// Minimal adapter mock
function mockAdapter(data = {}) {
  return {
    fetchPeople: vi.fn(async () => data.people || []),
    fetchTasks: vi.fn(async () => data.tasks || []),
    fetchMilestones: vi.fn(async () => data.milestones || []),
    fetchResourceTypes: vi.fn(async () => data.resourceTypes || []),
    sync: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('Store', () => {
  describe('construction', () => {
    it('creates with empty data', () => {
      const store = new Store(mockAdapter());
      expect(store.getPeople()).toEqual([]);
      expect(store.getTasks()).toEqual([]);
      expect(store.getMilestones()).toEqual([]);
    });

    it('loads from localStorage if data exists', () => {
      const savedData = {
        people: [{ id: 'p1', name: 'Alice', role: 'Dev', color: '#fff' }],
        tasks: [],
        milestones: [],
        resourceTypes: [],
        mapState: { revealedTiles: [], resourceNodes: [] },
      };
      localStorageMock.setItem('workrpg-data-v3', JSON.stringify(savedData));

      const store = new Store(mockAdapter());
      expect(store.getPeople()).toHaveLength(1);
      expect(store.getPerson('p1').name).toBe('Alice');
    });
  });

  describe('syncFromAdapter', () => {
    it('loads data from adapter', async () => {
      const adapter = mockAdapter({
        people: [{ id: 'p1', name: 'Bob', role: 'PM', color: '#000' }],
        tasks: [{ id: 't1', name: 'Task 1', assigneeId: 'p1' }],
        milestones: [{ id: 'ms-1', name: 'Sprint', taskIds: ['t1'] }],
        resourceTypes: ['Design'],
      });

      const store = new Store(adapter);
      await store.syncFromAdapter();

      expect(store.getPeople()).toHaveLength(1);
      expect(store.getTasks()).toHaveLength(1);
      expect(store.getMilestones()).toHaveLength(1);
      expect(store.getResourceTypes()).toEqual(['Design']);
    });

    it('saves to localStorage after sync', async () => {
      const adapter = mockAdapter({
        people: [{ id: 'p1', name: 'Carol', role: 'Eng', color: '#abc' }],
      });

      const store = new Store(adapter);
      await store.syncFromAdapter();

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('emits change event after sync', async () => {
      const adapter = mockAdapter({ people: [] });
      const store = new Store(adapter);
      const listener = vi.fn();
      store.on('change', listener);

      await store.syncFromAdapter();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('event emitter', () => {
    it('on/emit fires listeners', () => {
      const store = new Store(mockAdapter());
      const listener = vi.fn();
      store.on('test', listener);
      store.emit('test', { value: 42 });
      expect(listener).toHaveBeenCalledWith({ value: 42 });
    });

    it('off removes listener', () => {
      const store = new Store(mockAdapter());
      const listener = vi.fn();
      store.on('test', listener);
      store.off('test', listener);
      store.emit('test');
      expect(listener).not.toHaveBeenCalled();
    });

    it('multiple listeners are supported', () => {
      const store = new Store(mockAdapter());
      const a = vi.fn();
      const b = vi.fn();
      store.on('evt', a);
      store.on('evt', b);
      store.emit('evt');
      expect(a).toHaveBeenCalled();
      expect(b).toHaveBeenCalled();
    });
  });

  describe('people mutations', () => {
    it('addPerson creates person with generated id', () => {
      const store = new Store(mockAdapter());
      const person = store.addPerson({ name: 'Dave', role: 'Designer' });
      expect(person.id).toBeDefined();
      expect(person.name).toBe('Dave');
      expect(store.getPeople()).toHaveLength(1);
    });

    it('addPerson uses defaults for missing fields', () => {
      const store = new Store(mockAdapter());
      const person = store.addPerson({});
      expect(person.name).toBe('New Person');
      expect(person.role).toBe('');
      expect(person.color).toBe('#607D8B');
    });

    it('updatePerson modifies existing person', () => {
      const store = new Store(mockAdapter());
      const person = store.addPerson({ name: 'Eve' });
      store.updatePerson(person.id, { name: 'Eva' });
      expect(store.getPerson(person.id).name).toBe('Eva');
    });

    it('removePerson deletes person and their tasks', () => {
      const store = new Store(mockAdapter());
      const person = store.addPerson({ name: 'Frank' });
      store.addTask({ name: 'Task', assigneeId: person.id });
      store.addTask({ name: 'Other', assigneeId: 'other-person' });

      store.removePerson(person.id);
      expect(store.getPeople()).toHaveLength(0);
      expect(store.getTasks()).toHaveLength(1); // only 'Other' remains
    });
  });

  describe('task mutations', () => {
    it('addTask creates task with defaults', () => {
      const store = new Store(mockAdapter());
      const task = store.addTask({ name: 'Build feature', assigneeId: 'p1' });
      expect(task.id).toBeDefined();
      expect(task.discoveryPercent).toBe(50);
      expect(task.executionPercent).toBe(50);
      expect(task.percentComplete).toBe(0);
    });

    it('updateTask modifies task fields', () => {
      const store = new Store(mockAdapter());
      const task = store.addTask({ name: 'T1', assigneeId: 'p1' });
      store.updateTask(task.id, { percentComplete: 75 });
      expect(store.getTask(task.id).percentComplete).toBe(75);
    });

    it('removeTask deletes task and removes from milestones', () => {
      const store = new Store(mockAdapter());
      const task = store.addTask({ name: 'T1', assigneeId: 'p1' });

      // Manually add a milestone referencing this task
      store._data.milestones.push({ id: 'ms-1', name: 'M1', taskIds: [task.id, 'other'] });

      store.removeTask(task.id);
      expect(store.getTasks()).toHaveLength(0);
      expect(store.getMilestone('ms-1').taskIds).toEqual(['other']);
    });

    it('getTasksForPerson filters by assigneeId', () => {
      const store = new Store(mockAdapter());
      store.addTask({ name: 'A', assigneeId: 'p1' });
      store.addTask({ name: 'B', assigneeId: 'p2' });
      store.addTask({ name: 'C', assigneeId: 'p1' });

      expect(store.getTasksForPerson('p1')).toHaveLength(2);
      expect(store.getTasksForPerson('p2')).toHaveLength(1);
      expect(store.getTasksForPerson('p3')).toHaveLength(0);
    });
  });

  describe('milestone mutations', () => {
    it('addMilestone creates milestone', () => {
      const store = new Store(mockAdapter());
      const ms = store.addMilestone({ name: 'Sprint 1', taskIds: ['t1', 't2'] });
      expect(ms.id).toBeDefined();
      expect(ms.name).toBe('Sprint 1');
      expect(ms.taskIds).toEqual(['t1', 't2']);
    });

    it('removeMilestone deletes milestone', () => {
      const store = new Store(mockAdapter());
      const ms = store.addMilestone({ name: 'Sprint 1' });
      store.removeMilestone(ms.id);
      expect(store.getMilestones()).toHaveLength(0);
    });
  });

  describe('map state', () => {
    it('setTileRevealed adds tile keys', () => {
      const store = new Store(mockAdapter());
      store.setTileRevealed(5, 10);
      store.setTileRevealed(5, 10); // duplicate
      expect(store.getRevealedTiles()).toEqual(['5,10']);
    });

    it('addResourceNode adds node, deduplicates by taskId', () => {
      const store = new Store(mockAdapter());
      const node = store.addResourceNode({ col: 1, row: 2, resourceType: 'X', taskId: 't1' });
      const dup = store.addResourceNode({ col: 3, row: 4, resourceType: 'Y', taskId: 't1' });
      expect(store.getResourceNodes()).toHaveLength(1);
      expect(dup).toBe(node); // returns existing
    });

    it('depleteResourceNode marks node as depleted', () => {
      const store = new Store(mockAdapter());
      store.addResourceNode({ col: 1, row: 2, resourceType: 'X', taskId: 't1', depleted: false });
      store.depleteResourceNode('t1');
      expect(store.getResourceNodes()[0].depleted).toBe(true);
    });
  });

  describe('resetToSeed', () => {
    it('clears all data and localStorage', () => {
      const store = new Store(mockAdapter());
      store.addPerson({ name: 'Test' });
      store.addTask({ name: 'Task', assigneeId: 'p1' });

      const listener = vi.fn();
      store.on('change', listener);

      store.resetToSeed();
      expect(store.getPeople()).toHaveLength(0);
      expect(store.getTasks()).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('workrpg-data-v3');
      expect(listener).toHaveBeenCalled();
    });
  });
});
