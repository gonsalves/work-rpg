import { describe, it, expect } from 'vitest';
import {
  computeUnitStamina,
  computeStaminaBreakdown,
  computePhaseBalance,
  computeGatherRate,
  computeScoutSpeed,
  computeStructureProgress,
} from '../src/data/ResourceCalculator.js';

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    name: 'Test Task',
    assigneeId: 'p1',
    category: 'Design',
    discoveryPercent: 50,
    executionPercent: 50,
    percentComplete: 0,
    expectedDate: null,
    milestoneId: null,
    ...overrides,
  };
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('computeUnitStamina', () => {
  it('returns 1.0 for empty task list', () => {
    expect(computeUnitStamina([])).toBe(1);
  });

  it('returns 1.0 for tasks with no due date', () => {
    const tasks = [makeTask({ expectedDate: null, percentComplete: 50 })];
    expect(computeUnitStamina(tasks)).toBeCloseTo(1, 1);
  });

  it('returns high stamina for tasks due in the future', () => {
    const tasks = [makeTask({ expectedDate: daysFromNow(30), percentComplete: 50 })];
    const stamina = computeUnitStamina(tasks);
    expect(stamina).toBeGreaterThan(0.8);
  });

  it('returns lower stamina for overdue tasks', () => {
    const tasks = [makeTask({ expectedDate: daysFromNow(-20), percentComplete: 10 })];
    const stamina = computeUnitStamina(tasks);
    expect(stamina).toBeLessThan(0.8);
  });

  it('clamps between 0 and 1', () => {
    const tasks = [makeTask({ expectedDate: daysFromNow(-100), percentComplete: 0 })];
    const stamina = computeUnitStamina(tasks);
    expect(stamina).toBeGreaterThanOrEqual(0);
    expect(stamina).toBeLessThanOrEqual(1);
  });

  it('completed tasks have less penalty even when overdue', () => {
    const incomplete = [makeTask({ expectedDate: daysFromNow(-20), percentComplete: 10 })];
    const complete = [makeTask({ expectedDate: daysFromNow(-20), percentComplete: 90 })];
    expect(computeUnitStamina(complete)).toBeGreaterThan(computeUnitStamina(incomplete));
  });
});

describe('computePhaseBalance', () => {
  it('returns 0.5 for empty tasks', () => {
    expect(computePhaseBalance([])).toBe(0.5);
  });

  it('returns high value for discovery-heavy tasks', () => {
    const tasks = [makeTask({ discoveryPercent: 90, percentComplete: 0 })];
    expect(computePhaseBalance(tasks)).toBeGreaterThan(0.7);
  });

  it('returns low value for execution-heavy tasks', () => {
    const tasks = [makeTask({ discoveryPercent: 10, percentComplete: 0 })];
    expect(computePhaseBalance(tasks)).toBeLessThan(0.3);
  });

  it('weights incomplete tasks higher', () => {
    const tasks = [
      makeTask({ id: 't1', discoveryPercent: 90, percentComplete: 95 }), // nearly done, high disc
      makeTask({ id: 't2', discoveryPercent: 20, percentComplete: 10 }), // lots left, low disc
    ];
    // The incomplete task (t2) should dominate the balance → low value
    expect(computePhaseBalance(tasks)).toBeLessThan(0.5);
  });
});

describe('computeStaminaBreakdown', () => {
  it('returns structured breakdown', () => {
    const tasks = [makeTask({ expectedDate: daysFromNow(10) })];
    const breakdown = computeStaminaBreakdown(tasks);

    expect(breakdown).toHaveProperty('total');
    expect(breakdown).toHaveProperty('timeFactor');
    expect(breakdown).toHaveProperty('phaseFactor');
    expect(breakdown).toHaveProperty('discoveryRatio');
    expect(breakdown).toHaveProperty('perTask');
    expect(breakdown.perTask).toHaveLength(1);
    expect(breakdown.perTask[0]).toHaveProperty('taskId', 'task-1');
  });
});

describe('computeGatherRate', () => {
  it('ranges from 0.5 to 1.0', () => {
    // Full stamina
    const high = computeGatherRate([]);
    expect(high).toBe(1);

    // Some stamina
    const tasks = [makeTask({ expectedDate: daysFromNow(-50), percentComplete: 0 })];
    const low = computeGatherRate(tasks);
    expect(low).toBeGreaterThanOrEqual(0.5);
    expect(low).toBeLessThanOrEqual(1);
  });
});

describe('computeScoutSpeed', () => {
  it('ranges from 0.6 to 1.0', () => {
    const high = computeScoutSpeed([]);
    expect(high).toBe(1);

    const tasks = [makeTask({ expectedDate: daysFromNow(-50), percentComplete: 0 })];
    const low = computeScoutSpeed(tasks);
    expect(low).toBeGreaterThanOrEqual(0.6);
    expect(low).toBeLessThanOrEqual(1);
  });
});

describe('computeStructureProgress', () => {
  it('returns 0 for milestone with no matching tasks', () => {
    const ms = { id: 'ms-1', name: 'Test', taskIds: ['t1', 't2'] };
    const allTasks = [];
    expect(computeStructureProgress(ms, allTasks)).toBe(0);
  });

  it('computes average progress across milestone tasks', () => {
    const ms = { id: 'ms-1', name: 'Test', taskIds: ['t1', 't2'] };
    const allTasks = [
      makeTask({ id: 't1', percentComplete: 50 }),
      makeTask({ id: 't2', percentComplete: 100 }),
      makeTask({ id: 't3', percentComplete: 0 }), // not in milestone
    ];
    // (50 + 100) / (2 * 100) = 0.75
    expect(computeStructureProgress(ms, allTasks)).toBe(0.75);
  });

  it('returns 1.0 when all tasks are 100%', () => {
    const ms = { id: 'ms-1', name: 'Test', taskIds: ['t1'] };
    const allTasks = [makeTask({ id: 't1', percentComplete: 100 })];
    expect(computeStructureProgress(ms, allTasks)).toBe(1);
  });

  it('returns 0 when all tasks are 0%', () => {
    const ms = { id: 'ms-1', name: 'Test', taskIds: ['t1', 't2'] };
    const allTasks = [
      makeTask({ id: 't1', percentComplete: 0 }),
      makeTask({ id: 't2', percentComplete: 0 }),
    ];
    expect(computeStructureProgress(ms, allTasks)).toBe(0);
  });
});
