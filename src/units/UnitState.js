export const UnitStates = {
  IDLE: 'idle',
  SCOUTING: 'scouting',
  MOVING_TO_RESOURCE: 'moving_to_resource',
  GATHERING: 'gathering',
  RETURNING_TO_BASE: 'returning_to_base',
  DEPOSITING: 'depositing',
  MOVING_TO_STRUCTURE: 'moving_to_structure',
  BUILDING: 'building',
  RESTING: 'resting',
};

// Human-readable labels for the UI
export const UnitStateLabels = {
  [UnitStates.IDLE]: 'Idle',
  [UnitStates.SCOUTING]: 'Scouting',
  [UnitStates.MOVING_TO_RESOURCE]: 'Moving to resource',
  [UnitStates.GATHERING]: 'Gathering',
  [UnitStates.RETURNING_TO_BASE]: 'Returning to base',
  [UnitStates.DEPOSITING]: 'Depositing resources',
  [UnitStates.MOVING_TO_STRUCTURE]: 'Moving to structure',
  [UnitStates.BUILDING]: 'Building',
  [UnitStates.RESTING]: 'Resting',
};

export class UnitStateMachine {
  constructor(personId) {
    this.personId = personId;
    this.state = UnitStates.IDLE;
    this.path = null;
    this.pathIndex = 0;
    this.stateTimer = 0;
    this.gatherProgress = 0;
    this.buildProgress = 0;
    this.carryingResource = null; // { type, taskId } or null
    this.assignedTaskId = null;
    this.assignedMilestoneId = null;
    this.targetCol = 0;
    this.targetRow = 0;
    this.scoutTarget = null; // { col, row } current fog exploration target
  }

  transition(newState, data = {}) {
    this.state = newState;
    this.stateTimer = 0;
    this.gatherProgress = 0;
    this.buildProgress = 0;
    Object.assign(this, data);
  }

  getLabel() {
    let label = UnitStateLabels[this.state] || this.state;
    if (this.state === UnitStates.SCOUTING && this.assignedTaskId) {
      label = 'Scouting for resources';
    }
    if (this.state === UnitStates.GATHERING && this.carryingResource) {
      label = `Gathering ${this.carryingResource.type}`;
    }
    if (this.state === UnitStates.BUILDING) {
      label = 'Building structure';
    }
    return label;
  }
}
