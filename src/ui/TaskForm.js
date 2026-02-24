export class TaskForm {
  constructor(task = null, milestones = [], resourceTypes = [], onSave, onCancel) {
    this.el = document.createElement('div');
    this.el.style.padding = '12px';
    this.el.style.background = 'rgba(255,255,255,0.03)';
    this.el.style.borderRadius = '8px';
    this.el.style.marginTop = '8px';

    const isEdit = !!task;
    const name = task?.name || '';
    const desc = task?.description || '';
    const disc = task?.discoveryPercent ?? 50;
    const expectedDate = task?.expectedDate || new Date().toISOString().split('T')[0];
    const pctComplete = task?.percentComplete ?? 0;
    const category = task?.category || '';
    const milestoneId = task?.milestoneId || '';

    const categoryOptions = resourceTypes.map(rt =>
      `<option value="${this._esc(rt)}" ${rt === category ? 'selected' : ''}>${this._esc(rt)}</option>`
    ).join('');

    const milestoneOptions = milestones.map(ms =>
      `<option value="${ms.id}" ${ms.id === milestoneId ? 'selected' : ''}>${this._esc(ms.name)}</option>`
    ).join('');

    this.el.innerHTML = `
      <div class="form-group">
        <label>Task Name</label>
        <input type="text" name="name" value="${this._esc(name)}" placeholder="Task name" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" rows="2" placeholder="Brief description">${this._esc(desc)}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category (Resource Type)</label>
          <select name="category">
            <option value="">None</option>
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Milestone</label>
          <select name="milestoneId">
            <option value="">None</option>
            ${milestoneOptions}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Discovery / Execution Balance</label>
          <input type="range" name="discoveryPercent" min="0" max="100" value="${disc}" />
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;">
            <span class="disc-label" style="color:#A0AAB8;">Scout ${disc}%</span>
            <span class="exec-label" style="color:#C0B090;">Gather ${100 - disc}%</span>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Expected Date</label>
          <input type="date" name="expectedDate" value="${expectedDate}" />
        </div>
        <div class="form-group">
          <label>% Complete (${pctComplete}%)</label>
          <input type="range" name="percentComplete" min="0" max="100" value="${pctComplete}" />
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary btn-small" data-action="save">${isEdit ? 'Update' : 'Add'} Task</button>
        <button class="btn btn-ghost btn-small" data-action="cancel">Cancel</button>
      </div>
    `;

    // Link discovery slider labels
    const slider = this.el.querySelector('[name="discoveryPercent"]');
    const discLabel = this.el.querySelector('.disc-label');
    const execLabel = this.el.querySelector('.exec-label');
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value);
      discLabel.textContent = `Scout ${v}%`;
      execLabel.textContent = `Gather ${100 - v}%`;
    });

    // Link progress label
    const pctSlider = this.el.querySelector('[name="percentComplete"]');
    pctSlider.addEventListener('input', () => {
      pctSlider.parentElement.querySelector('label').textContent = `% Complete (${pctSlider.value}%)`;
    });

    // Save
    this.el.querySelector('[data-action="save"]').addEventListener('click', () => {
      const data = {
        name: this.el.querySelector('[name="name"]').value.trim(),
        description: this.el.querySelector('[name="description"]').value.trim(),
        category: this.el.querySelector('[name="category"]').value,
        milestoneId: this.el.querySelector('[name="milestoneId"]').value || null,
        discoveryPercent: parseInt(this.el.querySelector('[name="discoveryPercent"]').value),
        executionPercent: 100 - parseInt(this.el.querySelector('[name="discoveryPercent"]').value),
        expectedDate: this.el.querySelector('[name="expectedDate"]').value,
        percentComplete: parseInt(this.el.querySelector('[name="percentComplete"]').value),
      };
      if (!data.name) {
        this.el.querySelector('[name="name"]').style.borderColor = '#C0A090';
        return;
      }
      onSave(data);
    });

    this.el.querySelector('[data-action="cancel"]').addEventListener('click', () => onCancel());
  }

  _esc(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  getElement() { return this.el; }
}
