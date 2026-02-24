import { describe, it, expect } from 'vitest';
import { DataAdapter } from '../src/data/DataAdapter.js';
import { SeedAdapter } from '../src/data/SeedAdapter.js';

describe('DataAdapter', () => {
  it('base class methods throw "Not implemented"', async () => {
    const adapter = new DataAdapter();
    await expect(adapter.fetchPeople()).rejects.toThrow('Not implemented');
    await expect(adapter.fetchTasks()).rejects.toThrow('Not implemented');
    await expect(adapter.fetchMilestones()).rejects.toThrow('Not implemented');
    await expect(adapter.fetchResourceTypes()).rejects.toThrow('Not implemented');
    await expect(adapter.sync()).rejects.toThrow('Not implemented');
  });
});

describe('SeedAdapter', () => {
  const adapter = new SeedAdapter();

  it('fetchPeople returns 6 seed people', async () => {
    const people = await adapter.fetchPeople();
    expect(people).toHaveLength(6);
    expect(people[0]).toHaveProperty('id');
    expect(people[0]).toHaveProperty('name');
    expect(people[0]).toHaveProperty('role');
    expect(people[0]).toHaveProperty('color');
  });

  it('fetchTasks returns seed tasks with required fields', async () => {
    const tasks = await adapter.fetchTasks();
    expect(tasks.length).toBeGreaterThan(0);

    for (const task of tasks) {
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('name');
      expect(task).toHaveProperty('assigneeId');
      expect(task).toHaveProperty('discoveryPercent');
      expect(task).toHaveProperty('executionPercent');
      expect(task).toHaveProperty('percentComplete');
      expect(typeof task.discoveryPercent).toBe('number');
      expect(typeof task.percentComplete).toBe('number');
    }
  });

  it('fetchMilestones returns milestones with taskIds', async () => {
    const milestones = await adapter.fetchMilestones();
    expect(milestones.length).toBeGreaterThan(0);

    for (const ms of milestones) {
      expect(ms).toHaveProperty('id');
      expect(ms).toHaveProperty('name');
      expect(ms.taskIds).toBeInstanceOf(Array);
    }
  });

  it('fetchResourceTypes returns unique categories', async () => {
    const types = await adapter.fetchResourceTypes();
    expect(types.length).toBeGreaterThan(0);
    // Should be unique
    expect(new Set(types).size).toBe(types.length);
  });

  it('returns deep copies (mutations do not affect source)', async () => {
    const people1 = await adapter.fetchPeople();
    people1[0].name = 'MUTATED';
    const people2 = await adapter.fetchPeople();
    expect(people2[0].name).not.toBe('MUTATED');
  });

  it('sync is a no-op (does not throw)', async () => {
    await expect(adapter.sync()).resolves.toBeUndefined();
  });
});
