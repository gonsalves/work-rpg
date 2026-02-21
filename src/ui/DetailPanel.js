import { computeEnergyBreakdown } from '../data/EnergyCalculator.js';

export class DetailPanel {
  constructor(container, store) {
    this.store = store;
    this.personId = null;

    this.el = document.createElement('div');
    this.el.className = 'detail-panel';
    container.appendChild(this.el);
  }

  open(personId) {
    this.personId = personId;
    this._render();
    this.el.classList.add('open');
  }

  close() {
    this.el.classList.remove('open');
    this.personId = null;
  }

  refresh() {
    if (this.personId && this.el.classList.contains('open')) {
      this._render();
    }
  }

  _render() {
    const person = this.store.getPerson(this.personId);
    if (!person) {
      this.close();
      return;
    }

    const breakdown = computeEnergyBreakdown(person);
    const energyPct = Math.round(breakdown.total * 100);
    const timePct = Math.round(breakdown.timeFactor * 100);
    const phasePct = Math.round(breakdown.phaseFactor * 100);
    const discoveryPct = Math.round(breakdown.discoveryRatio * 100);

    this.el.innerHTML = `
      <button class="detail-panel-close">&times;</button>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:40px;height:40px;border-radius:50%;background:${person.color};flex-shrink:0;"></div>
        <div>
          <div class="detail-name">${person.name}</div>
          <div class="detail-role">${person.role}</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Overall Energy</div>
        <div class="energy-bar-container">
          <div class="energy-bar-fill" style="width:${energyPct}%;background:${energyBarColor(breakdown.total)};"></div>
          <div class="energy-bar-label">${energyPct}%</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Energy Breakdown</div>
        <div class="energy-breakdown">
          <div class="energy-factor">
            <div class="energy-factor-label">Time Factor: ${timePct}%</div>
            <div class="energy-factor-bar">
              <div class="energy-factor-fill" style="width:${timePct}%;background:${energyBarColor(breakdown.timeFactor)};"></div>
            </div>
          </div>
          <div class="energy-factor">
            <div class="energy-factor-label">Phase Balance: ${phasePct}%</div>
            <div class="energy-factor-bar">
              <div class="energy-factor-fill" style="width:${phasePct}%;background:${energyBarColor(breakdown.phaseFactor)};"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Phase Balance</div>
        <div class="task-phase-bar" style="height:8px;border-radius:4px;">
          <div class="task-phase-discovery" style="width:${discoveryPct}%;"></div>
          <div class="task-phase-execution" style="width:${100 - discoveryPct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#999;">
          <span style="color:#0078D7;">Discovery ${discoveryPct}%</span>
          <span style="color:#FF6F00;">Execution ${100 - discoveryPct}%</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Tasks (${person.tasks.length})</div>
        ${person.tasks.map(task => this._renderTask(task, breakdown)).join('')}
      </div>
    `;

    // Close button
    this.el.querySelector('.detail-panel-close').addEventListener('click', () => this.close());
  }

  _renderTask(task, breakdown) {
    const taskBreakdown = breakdown.perTask.find(t => t.taskId === task.id);
    const daysUntilDue = taskBreakdown ? taskBreakdown.daysUntilDue : 0;
    const isOverdue = daysUntilDue < 0;
    const dateLabel = isOverdue
      ? `${Math.abs(daysUntilDue)} days overdue`
      : daysUntilDue === 0
        ? 'Due today'
        : `${daysUntilDue} days remaining`;

    return `
      <div class="task-item">
        <div class="task-name">${task.name}</div>
        ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
        <div class="task-phase-bar">
          <div class="task-phase-discovery" style="width:${task.discoveryPercent}%;"></div>
          <div class="task-phase-execution" style="width:${task.executionPercent}%;"></div>
        </div>
        <div class="task-progress">
          <div class="task-progress-fill" style="width:${task.percentComplete}%;"></div>
        </div>
        <div class="task-meta">
          <span>${task.percentComplete}% complete</span>
          <span class="${isOverdue ? 'overdue' : ''}">${dateLabel}</span>
        </div>
      </div>
    `;
  }
}

function energyBarColor(value) {
  if (value > 0.65) return '#4CAF50';
  if (value > 0.35) return '#FFC107';
  return '#E8422F';
}
