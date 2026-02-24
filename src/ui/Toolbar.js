export class Toolbar {
  constructor(container) {
    this._editorCallbacks = [];
    this._settingsCallbacks = [];
    this._dayNightCallbacks = [];
    this._isNight = false;

    this.el = document.createElement('div');
    this.el.className = 'toolbar';
    this.el.innerHTML = `
      <div class="toolbar-title">REALM OF SPRINTS</div>
      <button class="toolbar-btn toolbar-btn-daynight" data-action="daynight">
        <span class="daynight-icon">☀️</span>
        <span class="daynight-label">Day</span>
      </button>
      <span class="daynight-time">6:00 AM</span>
      <div class="toolbar-spacer"></div>
      <button class="toolbar-btn toolbar-btn-settings" data-action="settings">⚙</button>
      <button class="toolbar-btn" data-action="editor">Team Editor</button>
    `;
    container.appendChild(this.el);

    // Day/Night toggle
    this._dayNightBtn = this.el.querySelector('[data-action="daynight"]');
    this._dayNightIcon = this._dayNightBtn.querySelector('.daynight-icon');
    this._dayNightLabel = this._dayNightBtn.querySelector('.daynight-label');
    this._timeEl = this.el.querySelector('.daynight-time');
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

  /**
   * Update toolbar display from the 24-hour sim clock.
   * @param {number} hour — 0..24 continuous (e.g. 14.5 = 2:30 PM)
   */
  setTimeDisplay(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.round((hour - Math.floor(hour)) * 60) % 60;
    const isPM = h >= 12;
    const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    const suffix = isPM ? 'PM' : 'AM';
    this._timeEl.textContent = `${h12}:${String(m).padStart(2, '0')} ${suffix}`;

    // Icon: sun (7-17), sunset/sunrise (5-7, 17-19), moon (19-5)
    if (hour >= 7 && hour < 17) {
      this._dayNightIcon.textContent = '\u2600\uFE0F'; // sun
      this._dayNightLabel.textContent = 'Day';
      this._dayNightBtn.classList.remove('active');
    } else if ((hour >= 5 && hour < 7) || (hour >= 17 && hour < 19)) {
      this._dayNightIcon.textContent = '\uD83C\uDF05'; // sunrise/sunset
      this._dayNightLabel.textContent = hour < 12 ? 'Dawn' : 'Dusk';
      this._dayNightBtn.classList.remove('active');
    } else {
      this._dayNightIcon.textContent = '\uD83C\uDF19'; // moon
      this._dayNightLabel.textContent = 'Night';
      this._dayNightBtn.classList.add('active');
    }
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
