import { generateUUID } from '../utils/Math.js';
import { SEED_DATA } from './SeedData.js';

const STORAGE_KEY = 'workrpg-data';

export class Store {
  constructor() {
    this._listeners = {};
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.people)) return parsed;
      }
    } catch { /* ignore */ }
    return JSON.parse(JSON.stringify({ people: SEED_DATA }));
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    this.emit('change');
  }

  // Event emitter
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
  }

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) cb(data);
  }

  // Queries
  getPeople() {
    return this._data.people;
  }

  getPerson(id) {
    return this._data.people.find(p => p.id === id);
  }

  // Mutations
  addPerson(person) {
    const newPerson = {
      id: generateUUID(),
      name: person.name || 'New Person',
      role: person.role || '',
      color: person.color || '#607D8B',
      tasks: person.tasks || []
    };
    this._data.people.push(newPerson);
    this._save();
    return newPerson;
  }

  updatePerson(id, changes) {
    const person = this.getPerson(id);
    if (!person) return;
    Object.assign(person, changes);
    this._save();
  }

  removePerson(id) {
    this._data.people = this._data.people.filter(p => p.id !== id);
    this._save();
  }

  addTask(personId, task) {
    const person = this.getPerson(personId);
    if (!person) return;
    const newTask = {
      id: generateUUID(),
      name: task.name || 'New Task',
      description: task.description || '',
      discoveryPercent: task.discoveryPercent ?? 50,
      executionPercent: task.executionPercent ?? 50,
      expectedDate: task.expectedDate || new Date().toISOString().split('T')[0],
      percentComplete: task.percentComplete ?? 0
    };
    person.tasks.push(newTask);
    this._save();
    return newTask;
  }

  updateTask(personId, taskId, changes) {
    const person = this.getPerson(personId);
    if (!person) return;
    const task = person.tasks.find(t => t.id === taskId);
    if (!task) return;
    Object.assign(task, changes);
    this._save();
  }

  removeTask(personId, taskId) {
    const person = this.getPerson(personId);
    if (!person) return;
    person.tasks = person.tasks.filter(t => t.id !== taskId);
    this._save();
  }

  resetToSeed() {
    this._data = JSON.parse(JSON.stringify({ people: SEED_DATA }));
    this._save();
  }
}
