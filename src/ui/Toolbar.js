export class Toolbar {
  constructor(container) {
    this._editorCallbacks = [];

    this.el = document.createElement('div');
    this.el.className = 'toolbar';
    this.el.innerHTML = `
      <div class="toolbar-title">WORK RPG</div>
      <div class="toolbar-spacer"></div>
      <button class="toolbar-btn" data-action="editor">Team Editor</button>
    `;
    container.appendChild(this.el);

    this.editorBtn = this.el.querySelector('[data-action="editor"]');
    this.editorBtn.addEventListener('click', () => {
      this.editorBtn.classList.toggle('active');
      for (const cb of this._editorCallbacks) cb();
    });
  }

  onToggleEditor(cb) {
    this._editorCallbacks.push(cb);
  }
}
