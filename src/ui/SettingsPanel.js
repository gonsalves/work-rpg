import { CONFIG } from '../utils/Config.js';

const SETTINGS_KEY = 'workrpg-settings';
const TEMPLATE_URL = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit';

export class SettingsPanel {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {Function} opts.onSave — called with { dataSource, sheetId } when user saves
   */
  constructor(container, opts) {
    this._onSave = opts.onSave;
    this.isOpen = false;

    this.el = document.createElement('div');
    this.el.className = 'settings-panel';
    container.appendChild(this.el);
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
    const saved = SettingsPanel.loadSettings();
    const dataSource = saved.dataSource || CONFIG.DATA_SOURCE;
    const sheetId = saved.sheetId || CONFIG.GOOGLE_SHEET_ID;
    const isSheet = dataSource === 'google-sheets';

    this.el.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
      </div>
      <div class="settings-content">
        <div class="form-group">
          <label>Data Source</label>
          <div class="settings-radio-group">
            <label class="settings-radio">
              <input type="radio" name="dataSource" value="seed" ${!isSheet ? 'checked' : ''} />
              <span>Demo Data</span>
            </label>
            <label class="settings-radio">
              <input type="radio" name="dataSource" value="google-sheets" ${isSheet ? 'checked' : ''} />
              <span>Google Sheet</span>
            </label>
          </div>
        </div>

        <div class="settings-sheet-fields" style="${isSheet ? '' : 'display:none;'}">
          <div class="form-group">
            <label>Google Sheet ID</label>
            <input type="text" name="sheetId" value="${sheetId}" placeholder="Paste sheet ID from URL" />
            <div class="settings-hint">
              From the URL: docs.google.com/spreadsheets/d/<strong>THIS_PART</strong>/edit
            </div>
          </div>
          <div class="form-group">
            <a class="settings-template-link" href="${TEMPLATE_URL}" target="_blank" rel="noopener">
              Open template spreadsheet &rarr;
            </a>
            <div class="settings-hint">
              Copy this sheet, publish it (File &rarr; Share &rarr; Publish to web), then paste the sheet ID above.
            </div>
          </div>
        </div>

        <div class="settings-status" style="display:none;"></div>

        <div class="btn-row">
          <button class="btn btn-primary" data-action="save">Save</button>
          <button class="btn btn-ghost" data-action="cancel">Cancel</button>
        </div>
      </div>
    `;

    // Toggle sheet fields visibility on radio change
    const radios = this.el.querySelectorAll('[name="dataSource"]');
    const sheetFields = this.el.querySelector('.settings-sheet-fields');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        sheetFields.style.display = r.value === 'google-sheets' && r.checked ? '' : 'none';
      });
    });

    // Save
    this.el.querySelector('[data-action="save"]').addEventListener('click', () => {
      const selected = this.el.querySelector('[name="dataSource"]:checked').value;
      const id = this.el.querySelector('[name="sheetId"]').value.trim();

      // Validate
      if (selected === 'google-sheets' && !id) {
        this.el.querySelector('[name="sheetId"]').style.borderColor = '#C0A090';
        this._showStatus('Please enter a Sheet ID.', 'error');
        return;
      }

      // Persist
      const settings = { dataSource: selected, sheetId: id };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Update runtime config
      CONFIG.DATA_SOURCE = selected;
      CONFIG.GOOGLE_SHEET_ID = id;

      this._showStatus('Syncing...', 'loading');

      if (this._onSave) {
        this._onSave(settings);
      }

      // Close after brief delay
      setTimeout(() => {
        this.isOpen = false;
        this.el.classList.remove('open');
      }, 600);
    });

    // Cancel
    this.el.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      this.isOpen = false;
      this.el.classList.remove('open');
    });
  }

  _showStatus(msg, type) {
    const el = this.el.querySelector('.settings-status');
    el.style.display = '';
    el.className = 'settings-status ' + (type || '');
    el.textContent = msg;
  }

  showSyncResult(success) {
    if (!this.el.querySelector('.settings-status')) return;
    if (success) {
      this._showStatus('Synced successfully!', 'success');
    } else {
      this._showStatus('Sync failed — check Sheet ID and publish settings.', 'error');
    }
  }

  static loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  }
}
