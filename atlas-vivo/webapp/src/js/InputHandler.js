/**
 * Wires DOM events to camera actions and sky interactions.
 *
 * Responsibility: input only — translates raw browser events into pan, zoom,
 * and star-click intents. Never draws or fetches data.
 */
export default class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Camera}            camera
   * @param {function}          onStarClick - async (clickAz, clickAlt) => void
   * @param {function}          onResize    - () => void
   */
  constructor(canvas, camera, onStarClick, onResize) {
    this.canvas = canvas;
    this.camera = camera;
    this.onStarClick = onStarClick;
    this.onResize = onResize;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    // Bind once so the same references can be removed in detach()
    this._onMouseDown = this.#onMouseDown.bind(this);
    this._onMouseMove = this.#onMouseMove.bind(this);
    this._onMouseUp = this.#onMouseUp.bind(this);
    this._onWheel = this.#onWheel.bind(this);
    this._onClick = this.#onClick.bind(this);
    this._onResize = this.onResize;
  }

  attach() {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('click', this._onClick);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);
  }

  detach() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  #onMouseDown(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  #onMouseMove(e) {
    if (!this.isDragging) return;
    this.camera.pan(e.clientX - this.lastX, e.clientY - this.lastY);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  #onMouseUp() {
    this.isDragging = false;
  }

  #onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.camera.zoomAt(e.offsetX, e.offsetY, factor);
  }

  async #onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Pixels → world coordinates (Az / Alt)
    const clickAz = (mouseX - this.camera.offsetX) / this.camera.scale;
    const clickAlt = 90 - (mouseY - this.camera.offsetY) / this.camera.scale;

    await this.onStarClick(clickAz, clickAlt);
  }
}
