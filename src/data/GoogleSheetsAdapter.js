import { DataAdapter } from './DataAdapter.js';
import { CONFIG } from '../utils/Config.js';
import { PALETTE } from '../utils/Colors.js';

/**
 * Reads data from a published Google Sheet (CSV export, no API key needed).
 *
 * Expected sheet structure:
 *   "People" sheet:     Name, Role, Color
 *   "Tasks" sheet:      Name, Description, Assignee, Category, Discovery%, Execution%, Complete%, Due Date, Milestone
 *   "Milestones" sheet: Name
 *
 * Sheet must be published to the web (File → Share → Publish to web → CSV).
 * Set CONFIG.GOOGLE_SHEET_ID to the sheet's ID.
 */
export class GoogleSheetsAdapter extends DataAdapter {
  constructor() {
    super();
    this._people = [];
    this._tasks = [];
    this._milestones = [];
    this._resourceTypes = [];
  }

  async sync() {
    const sheetId = CONFIG.GOOGLE_SHEET_ID;
    if (!sheetId) {
      console.warn('GoogleSheetsAdapter: No GOOGLE_SHEET_ID configured.');
      return;
    }

    try {
      const [peopleRows, taskRows, milestoneRows] = await Promise.all([
        this._fetchSheet(sheetId, 'People'),
        this._fetchSheet(sheetId, 'Tasks'),
        this._fetchSheet(sheetId, 'Milestones'),
      ]);

      this._parsePeople(peopleRows);
      this._parseMilestones(milestoneRows);
      this._parseTasks(taskRows);
    } catch (err) {
      console.error('GoogleSheetsAdapter: sync failed', err);
    }
  }

  async _fetchSheet(sheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch sheet "${sheetName}": ${resp.status}`);
    const text = await resp.text();
    return this._parseCSV(text);
  }

  _parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      // Simple CSV parse (handles quoted fields with commas)
      const row = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  }

  _parsePeople(rows) {
    // First row is header: Name, Role, Color
    this._people = [];
    for (let i = 1; i < rows.length; i++) {
      const [name, role, color] = rows[i];
      if (!name) continue;
      this._people.push({
        id: this._slugId(name),
        name,
        role: role || '',
        color: color || PALETTE.AVATAR_COLORS[i % PALETTE.AVATAR_COLORS.length],
      });
    }
  }

  _parseMilestones(rows) {
    // First row is header: Name
    this._milestones = [];
    for (let i = 1; i < rows.length; i++) {
      const [name] = rows[i];
      if (!name) continue;
      this._milestones.push({
        id: this._slugId(name),
        name,
        taskIds: [], // Populated when tasks are parsed
      });
    }
  }

  _parseTasks(rows) {
    // Header: Name, Description, Assignee, Category, Discovery%, Execution%, Complete%, Due Date, Milestone
    this._tasks = [];
    const categories = new Set();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [name, description, assigneeName, category, disc, exec, complete, dueDate, milestoneName] = row;
      if (!name) continue;

      const assignee = this._people.find(p => p.name.toLowerCase() === (assigneeName || '').toLowerCase());
      const milestone = milestoneName
        ? this._milestones.find(m => m.name.toLowerCase() === milestoneName.toLowerCase())
        : null;

      const taskId = this._slugId(name + '-' + (assigneeName || ''));
      const discoveryPercent = this._parseNum(disc, 50);
      const executionPercent = this._parseNum(exec, 100 - discoveryPercent);

      if (category) categories.add(category);

      const task = {
        id: taskId,
        name,
        description: description || '',
        assigneeId: assignee ? assignee.id : '',
        category: category || '',
        discoveryPercent,
        executionPercent,
        percentComplete: this._parseNum(complete, 0),
        expectedDate: dueDate || '',
        milestoneId: milestone ? milestone.id : null,
      };

      this._tasks.push(task);

      // Link task to milestone
      if (milestone && !milestone.taskIds.includes(taskId)) {
        milestone.taskIds.push(taskId);
      }
    }

    this._resourceTypes = [...categories];
  }

  _parseNum(str, fallback) {
    const n = parseInt(str, 10);
    return isNaN(n) ? fallback : Math.max(0, Math.min(100, n));
  }

  _slugId(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async fetchPeople() { return this._people; }
  async fetchTasks() { return this._tasks; }
  async fetchMilestones() { return this._milestones; }
  async fetchResourceTypes() { return this._resourceTypes; }
}
