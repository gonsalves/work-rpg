import { computeStaminaBreakdown } from '../data/ResourceCalculator.js';
import { UnitStateLabels } from '../units/UnitState.js';
import { CONFIG } from '../utils/Config.js';

function deriveEmail(name, domain) {
  return name.trim().toLowerCase().replace(/\s+/g, '.') + '@' + domain;
}

export class DetailPanel {
  constructor(container, store) {
    this.store = store;
    this.personId = null;
    this._unitManagerRef = null;

    this.el = document.createElement('div');
    this.el.className = 'detail-panel';
    container.appendChild(this.el);
  }

  setUnitManager(unitManager) {
    this._unitManagerRef = unitManager;
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

    const tasks = this.store.getTasksForPerson(this.personId);
    const breakdown = computeStaminaBreakdown(tasks);
    const staminaPct = Math.round(breakdown.total * 100);
    const timePct = Math.round(breakdown.timeFactor * 100);
    const phasePct = Math.round(breakdown.phaseFactor * 100);
    const discoveryPct = Math.round(breakdown.discoveryRatio * 100);

    // Unit state
    let activityLabel = 'Idle';
    if (this._unitManagerRef) {
      const sm = this._unitManagerRef.getUnitState(this.personId);
      if (sm) activityLabel = sm.getLabel();
    }

    // Action button data
    const email = deriveEmail(person.name, CONFIG.EMAIL_DOMAIN);
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE`
      + `&text=${encodeURIComponent('1:1 with ' + person.name)}`
      + `&details=${encodeURIComponent('Scheduled from Work RPG')}`
      + `&add=${encodeURIComponent(email)}`
      + `&dur=0030`;
    const sheetUrl = CONFIG.GOOGLE_SHEET_URL + '?q=' + encodeURIComponent(person.name);

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
        <div class="detail-section-title">Current Activity</div>
        <div style="padding:8px 12px;background:rgba(0,0,0,0.03);border-radius:6px;font-size:13px;color:#333;">
          ${activityLabel}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Actions</div>
        <div class="detail-actions">
          <div class="detail-action-group">
            <button class="detail-action-btn" data-action="email">
              <span class="detail-action-icon">&#9993;</span>
              Send Email
            </button>
            <div class="detail-action-chips" data-chips="email">
              <a class="detail-chip" href="mailto:${email}?subject=${encodeURIComponent('What are you working on?')}" target="_blank">What are you working on?</a>
              <a class="detail-chip" href="mailto:${email}?subject=${encodeURIComponent('Can you give me an update?')}" target="_blank">Can you give me an update?</a>
              <a class="detail-chip" href="mailto:${email}?subject=${encodeURIComponent("Let's sync up")}" target="_blank">Let's sync up</a>
            </div>
          </div>

          <a class="detail-action-btn" href="${calendarUrl}" target="_blank" rel="noopener">
            <span class="detail-action-icon">&#128197;</span>
            Schedule 1:1
          </a>

          <a class="detail-action-btn" href="${sheetUrl}" target="_blank" rel="noopener">
            <span class="detail-action-icon">&#128203;</span>
            View Tasks
          </a>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Stamina</div>
        <div class="energy-bar-container">
          <div class="energy-bar-fill" style="width:${staminaPct}%;background:${staminaBarColor(breakdown.total)};"></div>
          <div class="energy-bar-label">${staminaPct}%</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Stamina Breakdown</div>
        <div class="energy-breakdown">
          <div class="energy-factor">
            <div class="energy-factor-label">Time Pressure: ${timePct}%</div>
            <div class="energy-factor-bar">
              <div class="energy-factor-fill" style="width:${timePct}%;background:${staminaBarColor(breakdown.timeFactor)};"></div>
            </div>
          </div>
          <div class="energy-factor">
            <div class="energy-factor-label">Scout/Gather Balance: ${phasePct}%</div>
            <div class="energy-factor-bar">
              <div class="energy-factor-fill" style="width:${phasePct}%;background:${staminaBarColor(breakdown.phaseFactor)};"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Scout / Gather Balance</div>
        <div class="task-phase-bar" style="height:8px;border-radius:4px;">
          <div class="task-phase-discovery" style="width:${discoveryPct}%;"></div>
          <div class="task-phase-execution" style="width:${100 - discoveryPct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#999;">
          <span style="color:#0078D7;">Scout ${discoveryPct}%</span>
          <span style="color:#FF6F00;">Gather ${100 - discoveryPct}%</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Resources (${tasks.length})</div>
        ${tasks.map(task => this._renderTask(task, breakdown)).join('')}
        ${tasks.length === 0 ? '<div style="color:#999;font-size:12px;">No tasks assigned</div>' : ''}
      </div>
    `;

    // Close button
    this.el.querySelector('.detail-panel-close').addEventListener('click', () => this.close());

    // Email chips toggle
    const emailBtn = this.el.querySelector('[data-action="email"]');
    const emailChips = this.el.querySelector('[data-chips="email"]');
    if (emailBtn && emailChips) {
      emailBtn.addEventListener('click', () => {
        emailChips.classList.toggle('expanded');
      });
    }
  }

  _renderTask(task, breakdown) {
    const taskBreakdown = breakdown.perTask.find(t => t.taskId === task.id);
    const daysUntilDue = taskBreakdown ? taskBreakdown.daysUntilDue : null;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
    const dateLabel = daysUntilDue === null
      ? 'No due date'
      : isOverdue
        ? `${Math.abs(daysUntilDue)} days overdue`
        : daysUntilDue === 0
          ? 'Due today'
          : `${daysUntilDue} days remaining`;

    const categoryBadge = task.category
      ? `<span style="background:rgba(0,120,215,0.1);color:#0078D7;padding:2px 6px;border-radius:4px;font-size:10px;">${task.category}</span>`
      : '';

    return `
      <div class="task-item">
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="task-name">${task.name}</div>
          ${categoryBadge}
        </div>
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

function staminaBarColor(value) {
  if (value > 0.65) return '#4CAF50';
  if (value > 0.35) return '#FFC107';
  return '#E8422F';
}
