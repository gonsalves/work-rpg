import { describe, it, expect } from 'vitest';
import { UnitStates, UnitStateLabels, UnitStateMachine } from '../src/units/UnitState.js';

describe('UnitStates', () => {
  it('defines 9 states', () => {
    expect(Object.keys(UnitStates)).toHaveLength(9);
  });

  it('every state has a label', () => {
    for (const state of Object.values(UnitStates)) {
      expect(UnitStateLabels[state]).toBeDefined();
      expect(typeof UnitStateLabels[state]).toBe('string');
    }
  });
});

describe('UnitStateMachine', () => {
  it('starts in IDLE state', () => {
    const sm = new UnitStateMachine('person-1');
    expect(sm.state).toBe(UnitStates.IDLE);
    expect(sm.personId).toBe('person-1');
  });

  it('initializes with default values', () => {
    const sm = new UnitStateMachine('p1');
    expect(sm.path).toBeNull();
    expect(sm.pathIndex).toBe(0);
    expect(sm.stateTimer).toBe(0);
    expect(sm.gatherProgress).toBe(0);
    expect(sm.buildProgress).toBe(0);
    expect(sm.carryingResource).toBeNull();
    expect(sm.assignedTaskId).toBeNull();
  });

  it('transition() changes state and resets timers', () => {
    const sm = new UnitStateMachine('p1');
    sm.stateTimer = 5;
    sm.gatherProgress = 0.5;
    sm.buildProgress = 0.3;

    sm.transition(UnitStates.SCOUTING, { assignedTaskId: 'task-1' });

    expect(sm.state).toBe(UnitStates.SCOUTING);
    expect(sm.stateTimer).toBe(0);
    expect(sm.gatherProgress).toBe(0);
    expect(sm.buildProgress).toBe(0);
    expect(sm.assignedTaskId).toBe('task-1');
  });

  it('transition() merges arbitrary data via Object.assign', () => {
    const sm = new UnitStateMachine('p1');
    sm.transition(UnitStates.GATHERING, {
      carryingResource: { type: 'Design', taskId: 't1' },
      targetCol: 10,
      targetRow: 20,
    });

    expect(sm.carryingResource).toEqual({ type: 'Design', taskId: 't1' });
    expect(sm.targetCol).toBe(10);
    expect(sm.targetRow).toBe(20);
  });

  describe('getLabel()', () => {
    it('returns default label for basic states', () => {
      const sm = new UnitStateMachine('p1');
      expect(sm.getLabel()).toBe('Idle');

      sm.transition(UnitStates.RESTING);
      expect(sm.getLabel()).toBe('Resting');

      sm.transition(UnitStates.DEPOSITING);
      expect(sm.getLabel()).toBe('Depositing resources');
    });

    it('returns "Scouting for resources" when scouting with a task', () => {
      const sm = new UnitStateMachine('p1');
      sm.transition(UnitStates.SCOUTING, { assignedTaskId: 'task-1' });
      expect(sm.getLabel()).toBe('Scouting for resources');
    });

    it('returns "Scouting" when scouting without a task', () => {
      const sm = new UnitStateMachine('p1');
      sm.transition(UnitStates.SCOUTING, { assignedTaskId: null });
      expect(sm.getLabel()).toBe('Scouting');
    });

    it('returns "Gathering <type>" when gathering with a resource', () => {
      const sm = new UnitStateMachine('p1');
      sm.transition(UnitStates.GATHERING, {
        carryingResource: { type: 'Research', taskId: 't1' },
      });
      expect(sm.getLabel()).toBe('Gathering Research');
    });

    it('returns "Building structure" when building', () => {
      const sm = new UnitStateMachine('p1');
      sm.transition(UnitStates.BUILDING);
      expect(sm.getLabel()).toBe('Building structure');
    });
  });
});
