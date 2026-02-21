import { clamp } from '../utils/Math.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DECAY_RATE = 0.03;        // 3% energy loss per day overdue per unit remaining work
const IDEAL_DISCOVERY = 0.4;    // 40% discovery is ideal
const MAX_PHASE_PENALTY = 0.8;  // max 80% loss from phase imbalance

// Time-based energy for a single task
function taskTimeEnergy(task, now) {
  const expected = new Date(task.expectedDate + 'T00:00:00');
  const daysOverdue = Math.max(0, (now - expected) / MS_PER_DAY);
  const remainingWork = 1 - (task.percentComplete / 100);

  if (daysOverdue === 0) return 1.0;

  const penalty = daysOverdue * DECAY_RATE * remainingWork;
  return Math.max(0, 1.0 - penalty);
}

// Weighted average time energy across all tasks
function timeEnergy(person, now) {
  if (person.tasks.length === 0) return 1.0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const task of person.tasks) {
    const weight = Math.max(1 - task.percentComplete / 100, 0.1);
    weightedSum += taskTimeEnergy(task, now) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 1.0;
}

// Compute discovery/execution ratio
export function computePhaseBalance(person) {
  if (person.tasks.length === 0) return 0.5;

  let discoveryWeight = 0;
  let totalWeight = 0;

  for (const task of person.tasks) {
    const remaining = 1 - (task.percentComplete / 100);
    const weight = Math.max(remaining, 0.1);
    discoveryWeight += (task.discoveryPercent / 100) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? discoveryWeight / totalWeight : 0.5;
}

// Phase balance energy
function phaseEnergy(person) {
  const balance = computePhaseBalance(person);
  const deviation = Math.abs(balance - IDEAL_DISCOVERY);
  const normalizedDeviation = deviation / 0.6; // max deviation is 0.6 (from 0.4 ideal)
  return 1.0 - (MAX_PHASE_PENALTY * normalizedDeviation * normalizedDeviation);
}

// Combined energy
export function computeEnergy(person, now = new Date()) {
  if (person.tasks.length === 0) return 1.0;

  const timeFactor = timeEnergy(person, now);
  const phaseFactor = phaseEnergy(person);

  return clamp(timeFactor * phaseFactor, 0, 1);
}

// Full breakdown for detail panel
export function computeEnergyBreakdown(person, now = new Date()) {
  const timeFactor = timeEnergy(person, now);
  const phaseFactor = phaseEnergy(person);

  return {
    total: clamp(timeFactor * phaseFactor, 0, 1),
    timeFactor,
    phaseFactor,
    discoveryRatio: computePhaseBalance(person),
    perTask: person.tasks.map(t => ({
      taskId: t.id,
      taskName: t.name,
      timeEnergy: taskTimeEnergy(t, now),
      percentComplete: t.percentComplete,
      daysUntilDue: Math.ceil((new Date(t.expectedDate + 'T00:00:00') - now) / MS_PER_DAY)
    }))
  };
}
