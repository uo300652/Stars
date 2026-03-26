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
    this._dragStartX = 0;
    this._dragStartY = 0;

    // Bind once so the same references can be removed in detach()
    this._onMouseDown = this.#onMouseDown.bind(this);
    this._onMouseMove = this.#onMouseMove.bind(this);
    this._onMouseUp = this.#onMouseUp.bind(this);
    this._onWheel = this.#onWheel.bind(this);
    this._onClick = this.#onClick.bind(this);
    this._onResize = this.onResize;
    this._onBlur = () => { this.isDragging = false; };
  }

  attach() {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('click', this._onClick);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('blur', this._onBlur);
  }

  detach() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('blur', this._onBlur);
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  #onMouseDown(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
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
    // Suppress clicks that followed a drag (displacement > 8px)
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;
    if (dx * dx + dy * dy > 64) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Raw az can be negative or > 360 when the user has panned and clicks on a
    // wrapped copy of the sky (the renderer draws i = -1 and i = +1 copies).
    // Normalize to [0, 360) so the server finds the same star the user sees.
    const rawAz   = (mouseX - this.camera.offsetX) / this.camera.scale;
    const clickAz = ((rawAz % 360) + 360) % 360;
    const clickAlt = 90 - (mouseY - this.camera.offsetY) / this.camera.scale;

    await this.onStarClick(clickAz, clickAlt);
  }
}
