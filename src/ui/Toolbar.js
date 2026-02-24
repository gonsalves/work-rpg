export class Toolbar {
  constructor(container) {
    this._editorCallbacks = [];
    this._settingsCallbacks = [];
    this._dayNightCallbacks = [];
    this._isNight = false;

    this.el = document.createElement('div');
    this.el.className = 'toolbar';
    this.el.innerHTML = `
      <div class="toolbar-title">WORK RPG</div>
      <button class="toolbar-btn toolbar-btn-daynight" data-action="daynight">
        <span class="daynight-icon">☀️</span>
        <span class="daynight-label">Day</span>
      </button>
      <div class="toolbar-spacer"></div>
      <button class="toolbar-btn toolbar-btn-settings" data-action="settings">⚙</button>
      <button class="toolbar-btn" data-action="editor">Team Editor</button>
    `;
    container.appendChild(this.el);

    // Day/Night toggle
    this._dayNightBtn = this.el.querySelector('[data-action="daynight"]');
    this._dayNightIcon = this._dayNightBtn.querySelector('.daynight-icon');
    this._dayNightLabel = this._dayNightBtn.querySelector('.daynight-label');
    this._dayNightBtn.addEventListener('click', () => {
      this._isNight = !this._isNight;
      this._updateDayNightDisplay();
      for (const cb of this._dayNightCallbacks) cb(this._isNight);
    });

    // Settings toggle
    this._settingsBtn = this.el.querySelector('[data-action="settings"]');
    this._settingsBtn.addEventListener('click', () => {
      this._settingsBtn.classList.toggle('active');
      for (const cb of this._settingsCallbacks) cb();
    });

    // Editor toggle
    this.editorBtn = this.el.querySelector('[data-action="editor"]');
    this.editorBtn.addEventListener('click', () => {
      this.editorBtn.classList.toggle('active');
      for (const cb of this._editorCallbacks) cb();
    });
  }

  _updateDayNightDisplay() {
    if (this._isNight) {
      this._dayNightIcon.textContent = '🌙';
      this._dayNightLabel.textContent = 'Night';
      this._dayNightBtn.classList.add('active');
    } else {
      this._dayNightIcon.textContent = '☀️';
      this._dayNightLabel.textContent = 'Day';
      this._dayNightBtn.classList.remove('active');
    }
  }

  /** Set the time label text (for future smooth cycle: "Morning", "Afternoon", etc.) */
  setTimeLabel(label) {
    this._dayNightLabel.textContent = label;
  }

  onToggleDayNight(cb) {
    this._dayNightCallbacks.push(cb);
  }

  onToggleEditor(cb) {
    this._editorCallbacks.push(cb);
  }

  onToggleSettings(cb) {
    this._settingsCallbacks.push(cb);
  }
}
