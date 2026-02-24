import * as THREE from 'three';
import { computeStructureProgress } from '../data/ResourceCalculator.js';

export class StructurePopup {
  constructor(container, store) {
    this.store = store;
    this.milestoneId = null;
    this._worldPos = new THREE.Vector3();
    this._camera = null;
    this._personClickCallbacks = [];

    this.el = document.createElement('div');
    this.el.className = 'structure-popup';
    container.appendChild(this.el);
  }

  setCamera(camera) {
    this._camera = camera;
  }

  open(milestoneId, sceneX, sceneZ) {
    this.milestoneId = milestoneId;
    this._worldPos.set(sceneX, 3, sceneZ);
    this._render();
    this.el.classList.add('open');
    this.updatePosition();
  }

  close() {
    this.el.classList.remove('open');
    this.milestoneId = null;
  }

  isOpen() {
    return this.milestoneId !== null;
  }

  refresh() {
    if (!this.isOpen()) return;
    this._render();
  }

  updatePosition() {
    if (!this.isOpen() || !this._camera) return;

    const vec = this._worldPos.clone();
    vec.project(this._camera);

    // Behind camera — hide
    if (vec.z > 1) {
      this.el.style.opacity = '0';
      this.el.style.pointerEvents = 'none';
      return;
    }

    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.opacity = '';
    this.el.style.pointerEvents = '';
  }

  onPersonClick(cb) {
    this._personClickCallbacks.push(cb);
  }

  _render() {
    const ms = this.store.getMilestone(this.milestoneId);
    if (!ms) {
      this.close();
      return;
    }

    const tasks = this.store.getTasksForMilestone(this.milestoneId);
    const progress = computeStructureProgress(ms, this.store.getTasks());
    const progressPct = Math.round(progress * 100);

    // Collect unique contributors
    const contributors = new Map();
    for (const task of tasks) {
      if (task.assigneeId) {
        const person = this.store.getPerson(task.assigneeId);
        if (person && !contributors.has(person.id)) {
          contributors.set(person.id, person);
        }
      }
    }

    this.el.innerHTML = `
      <button class="structure-popup-close">&times;</button>
      <div class="structure-popup-header">
        <div class="structure-popup-name">${ms.name}</div>
        <div class="structure-popup-pct">${progressPct}%</div>
      </div>
      <div class="energy-bar-container" style="margin-bottom:10px;">
        <div class="energy-bar-fill" style="width:${progressPct}%;background:${progressBarColor(progress)};"></div>
      </div>
      <div class="structure-popup-tasks">
        ${tasks.map(task => this._renderTask(task)).join('')}
        ${tasks.length === 0 ? '<div style="color:#666;font-size:11px;">No tasks</div>' : ''}
      </div>
      ${contributors.size > 0 ? `
        <div class="structure-popup-contributors">
          ${[...contributors.values()].map(p => `
            <button class="contributor-chip" data-person-id="${p.id}">
              <span class="contributor-swatch" style="background:${p.color};"></span>
              <span>${p.name.split(' ')[0]}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    // Close button
    this.el.querySelector('.structure-popup-close').addEventListener('click', () => this.close());

    // Contributor chip clicks
    this.el.querySelectorAll('.contributor-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pid = chip.dataset.personId;
        if (pid) {
          for (const cb of this._personClickCallbacks) cb(pid);
        }
      });
    });
  }

  _renderTask(task) {
    const assignee = task.assigneeId ? this.store.getPerson(task.assigneeId) : null;
    const categoryBadge = task.category
      ? `<span class="structure-popup-badge">${task.category}</span>`
      : '';

    return `
      <div class="structure-popup-task">
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="structure-popup-task-name">${task.name}</span>
          ${categoryBadge}
        </div>
        <div class="task-progress" style="height:3px;">
          <div class="task-progress-fill" style="width:${Math.round(task.percentComplete)}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;">
          <span>${Math.round(task.percentComplete)}%</span>
          ${assignee ? `<span>${assignee.name.split(' ')[0]}</span>` : ''}
        </div>
      </div>
    `;
  }
}

function progressBarColor(value) {
  if (value >= 1) return '#C4956A';
  if (value > 0.5) return '#8A9A7C';
  if (value > 0.25) return '#C8C0A0';
  return '#A0AAB8';
}
