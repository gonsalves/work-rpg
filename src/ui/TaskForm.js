export class TaskForm {
  constructor(task = null, onSave, onCancel) {
    this.el = document.createElement('div');
    this.el.style.padding = '12px';
    this.el.style.background = 'rgba(0,0,0,0.02)';
    this.el.style.borderRadius = '8px';
    this.el.style.marginTop = '8px';

    const isEdit = !!task;
    const name = task?.name || '';
    const desc = task?.description || '';
    const disc = task?.discoveryPercent ?? 50;
    const expectedDate = task?.expectedDate || new Date().toISOString().split('T')[0];
    const pctComplete = task?.percentComplete ?? 0;

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
          <label>Discovery / Execution Balance</label>
          <input type="range" name="discoveryPercent" min="0" max="100" value="${disc}" />
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#999;">
            <span class="disc-label" style="color:#0078D7;">Discovery ${disc}%</span>
            <span class="exec-label" style="color:#FF6F00;">Execution ${100 - disc}%</span>
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
      discLabel.textContent = `Discovery ${v}%`;
      execLabel.textContent = `Execution ${100 - v}%`;
    });

    // Link progress label
    const pctSlider = this.el.querySelector('[name="percentComplete"]');
    const pctLabel = this.el.querySelector('label:last-of-type');
    pctSlider.addEventListener('input', () => {
      pctSlider.parentElement.querySelector('label').textContent = `% Complete (${pctSlider.value}%)`;
    });

    // Save
    this.el.querySelector('[data-action="save"]').addEventListener('click', () => {
      const data = {
        name: this.el.querySelector('[name="name"]').value.trim(),
        description: this.el.querySelector('[name="description"]').value.trim(),
        discoveryPercent: parseInt(this.el.querySelector('[name="discoveryPercent"]').value),
        executionPercent: 100 - parseInt(this.el.querySelector('[name="discoveryPercent"]').value),
        expectedDate: this.el.querySelector('[name="expectedDate"]').value,
        percentComplete: parseInt(this.el.querySelector('[name="percentComplete"]').value)
      };
      if (!data.name) {
        this.el.querySelector('[name="name"]').style.borderColor = '#E8422F';
        return;
      }
      onSave(data);
    });

    // Cancel
    this.el.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      onCancel();
    });
  }

  _esc(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  getElement() { return this.el; }
}
