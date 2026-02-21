export class Tooltip {
  constructor(container) {
    this.el = document.createElement('div');
    this.el.className = 'tooltip';
    container.appendChild(this.el);
  }

  show(text, x, y) {
    this.el.textContent = text;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y - 10}px`;
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }
}
