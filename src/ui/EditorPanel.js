import { TaskForm } from './TaskForm.js';
import { PALETTE } from '../utils/Colors.js';
import { computeUnitStamina } from '../data/ResourceCalculator.js';

export class EditorPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.isOpen = false;
    this.expandedPersonId = null;

    this.el = document.createElement('div');
    this.el.className = 'editor-panel';
    container.appendChild(this.el);

    this.store.on('change', () => {
      if (this.isOpen) this._render();
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this._render();
      this.el.classList.add('open');
    } else {
      this.el.classList.remove('open');
    }
  }

  _render() {
    const people = this.store.getPeople();

    this.el.innerHTML = `
      <div class="editor-header">
        <h2>Team Editor</h2>
        <button class="btn btn-primary btn-small" data-action="add-person">+ Add Person</button>
      </div>
      <div class="editor-content">
        ${people.map(p => this._renderPerson(p)).join('')}
        ${people.length === 0 ? '<p style="color:#666;text-align:center;padding:20px;">No team members yet. Add someone!</p>' : ''}
      </div>
    `;

    // Bind events
    this.el.querySelector('[data-action="add-person"]').addEventListener('click', () => {
      this._showPersonForm();
    });

    this.el.querySelectorAll('.person-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const personId = header.dataset.personId;
        this.expandedPersonId = this.expandedPersonId === personId ? null : personId;
        this._render();
      });
    });

    this.el.querySelectorAll('[data-action="edit-person"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showPersonForm(btn.dataset.personId);
      });
    });

    this.el.querySelectorAll('[data-action="delete-person"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.store.removePerson(btn.dataset.personId);
      });
    });

    this.el.querySelectorAll('[data-action="add-task"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showTaskForm(btn.dataset.personId);
      });
    });

    this.el.querySelectorAll('[data-action="edit-task"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showTaskForm(btn.dataset.personId, btn.dataset.taskId);
      });
    });

    this.el.querySelectorAll('[data-action="delete-task"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.store.removeTask(btn.dataset.taskId);
      });
    });
  }

  _renderPerson(person) {
    const tasks = this.store.getTasksForPerson(person.id);
    const stamina = computeUnitStamina(tasks);
    const staminaPct = Math.round(stamina * 100);
    const isExpanded = this.expandedPersonId === person.id;

    return `
      <div class="person-row">
        <div class="person-header" data-person-id="${person.id}">
          <div class="person-color-swatch" style="background:${person.color};"></div>
          <div class="person-info">
            <div class="person-info-name">${person.name}</div>
            <div class="person-info-role">${person.role} &middot; ${tasks.length} task${tasks.length !== 1 ? 's' : ''} &middot; ${staminaPct}% stamina</div>
          </div>
          <button class="btn btn-ghost btn-small" data-action="edit-person" data-person-id="${person.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-action="delete-person" data-person-id="${person.id}">&times;</button>
        </div>
        <div class="person-tasks ${isExpanded ? 'expanded' : ''}">
          ${tasks.map(t => this._renderTaskRow(person.id, t)).join('')}
          <button class="btn btn-ghost btn-small" data-action="add-task" data-person-id="${person.id}" style="margin-top:8px;">+ Add Task</button>
          <div class="task-form-container" data-person-id="${person.id}"></div>
        </div>
      </div>
    `;
  }

  _renderTaskRow(personId, task) {
    const categoryBadge = task.category
      ? `<span style="background:rgba(160,170,184,0.12);color:#A0AAB8;padding:1px 5px;border-radius:3px;font-size:10px;">${task.category}</span>`
      : '';

    return `
      <div class="task-item" style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:4px;">
            <div class="task-name" style="font-size:13px;">${task.name}</div>
            ${categoryBadge}
          </div>
          <div style="display:flex;gap:12px;font-size:11px;color:#666;">
            <span>${task.percentComplete}% done</span>
            <span style="color:#A0AAB8;">D:${task.discoveryPercent}%</span>
            <span style="color:#C0B090;">E:${task.executionPercent}%</span>
            <span>${task.expectedDate || 'No date'}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-small" data-action="edit-task" data-person-id="${personId}" data-task-id="${task.id}">Edit</button>
        <button class="btn btn-danger btn-small" data-action="delete-task" data-task-id="${task.id}">&times;</button>
      </div>
    `;
  }

  _showPersonForm(personId = null) {
    const person = personId ? this.store.getPerson(personId) : null;
    const isEdit = !!person;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;pointer-events:auto;';

    const form = document.createElement('div');
    form.style.cssText = 'background:#1A1A1A;border-radius:12px;padding:24px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.3);color:#E8E4DC;border:1px solid rgba(255,255,255,0.08);';
    form.innerHTML = `
      <h3 style="margin-bottom:16px;color:#F0EBE3;">${isEdit ? 'Edit' : 'Add'} Person</h3>
      <div class="form-group">
        <label>Name</label>
        <input type="text" name="name" value="${person?.name || ''}" placeholder="Full name" />
      </div>
      <div class="form-group">
        <label>Role</label>
        <input type="text" name="role" value="${person?.role || ''}" placeholder="Job title" />
      </div>
      <div class="form-group">
        <label>Avatar Color</label>
        <input type="color" name="color" value="${person?.color || PALETTE.AVATAR_COLORS[Math.floor(Math.random() * PALETTE.AVATAR_COLORS.length)]}" />
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-action="save">${isEdit ? 'Update' : 'Add'}</button>
        <button class="btn btn-ghost" data-action="cancel">Cancel</button>
      </div>
    `;

    overlay.appendChild(form);
    this.container.appendChild(overlay);

    form.querySelector('[data-action="save"]').addEventListener('click', () => {
      const name = form.querySelector('[name="name"]').value.trim();
      const role = form.querySelector('[name="role"]').value.trim();
      const color = form.querySelector('[name="color"]').value;

      if (!name) {
        form.querySelector('[name="name"]').style.borderColor = '#C0A090';
        return;
      }

      if (isEdit) {
        this.store.updatePerson(personId, { name, role, color });
      } else {
        const newPerson = this.store.addPerson({ name, role, color });
        this.expandedPersonId = newPerson.id;
      }
      overlay.remove();
    });

    form.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  _showTaskForm(personId, taskId = null) {
    const task = taskId ? this.store.getTask(taskId) : null;

    const container = this.el.querySelector(`.task-form-container[data-person-id="${personId}"]`);
    if (!container) return;
    container.innerHTML = '';

    const milestones = this.store.getMilestones();
    const resourceTypes = this.store.getResourceTypes();

    const form = new TaskForm(
      task,
      milestones,
      resourceTypes,
      (data) => {
        if (taskId) {
          this.store.updateTask(taskId, data);
        } else {
          this.store.addTask({ ...data, assigneeId: personId });
        }
        container.innerHTML = '';
      },
      () => { container.innerHTML = ''; }
    );

    container.appendChild(form.getElement());
  }
}
