import { clamp } from '../utils/Math.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DECAY_RATE = 0.03;
const IDEAL_DISCOVERY = 0.4;
const MAX_PHASE_PENALTY = 0.8;

function taskTimeEnergy(task, now) {
  if (!task.expectedDate) return 1.0;
  const expected = new Date(task.expectedDate + 'T00:00:00');
  const daysOverdue = Math.max(0, (now - expected) / MS_PER_DAY);
  const remainingWork = 1 - (task.percentComplete / 100);
  if (daysOverdue === 0) return 1.0;
  const penalty = daysOverdue * DECAY_RATE * remainingWork;
  return Math.max(0, 1.0 - penalty);
}

function timeEnergy(tasks, now) {
  if (tasks.length === 0) return 1.0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const task of tasks) {
    const weight = Math.max(1 - task.percentComplete / 100, 0.1);
    weightedSum += taskTimeEnergy(task, now) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 1.0;
}

export function computePhaseBalance(tasks) {
  if (tasks.length === 0) return 0.5;
  let discoveryWeight = 0;
  let totalWeight = 0;
  for (const task of tasks) {
    const remaining = 1 - (task.percentComplete / 100);
    const weight = Math.max(remaining, 0.1);
    discoveryWeight += (task.discoveryPercent / 100) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? discoveryWeight / totalWeight : 0.5;
}

function phaseEnergy(tasks) {
  const balance = computePhaseBalance(tasks);
  const deviation = Math.abs(balance - IDEAL_DISCOVERY);
  const normalizedDeviation = deviation / 0.6;
  return 1.0 - (MAX_PHASE_PENALTY * normalizedDeviation * normalizedDeviation);
}

export function computeUnitStamina(tasks, now = new Date()) {
  if (tasks.length === 0) return 1.0;
  const timeFactor = timeEnergy(tasks, now);
  const phaseFactor = phaseEnergy(tasks);
  return clamp(timeFactor * phaseFactor, 0, 1);
}

export function computeStaminaBreakdown(tasks, now = new Date()) {
  const timeFactor = timeEnergy(tasks, now);
  const phaseFactor = phaseEnergy(tasks);
  return {
    total: clamp(timeFactor * phaseFactor, 0, 1),
    timeFactor,
    phaseFactor,
    discoveryRatio: computePhaseBalance(tasks),
    perTask: tasks.map(t => ({
      taskId: t.id,
      taskName: t.name,
      timeEnergy: taskTimeEnergy(t, now),
      percentComplete: t.percentComplete,
      daysUntilDue: t.expectedDate
        ? Math.ceil((new Date(t.expectedDate + 'T00:00:00') - now) / MS_PER_DAY)
        : null,
    })),
  };
}

export function computeGatherRate(tasks) {
  const stamina = computeUnitStamina(tasks);
  return 0.5 + stamina * 0.5; // 0.5x to 1.0x speed
}

export function computeScoutSpeed(tasks) {
  const stamina = computeUnitStamina(tasks);
  return 0.6 + stamina * 0.4; // 0.6x to 1.0x speed
}

export function computeStructureProgress(milestone, allTasks) {
  const milestoneTasks = allTasks.filter(t => milestone.taskIds.includes(t.id));
  if (milestoneTasks.length === 0) return 0;
  const totalComplete = milestoneTasks.reduce((sum, t) => sum + t.percentComplete, 0);
  return totalComplete / (milestoneTasks.length * 100);
}
