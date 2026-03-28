/**
 * Wires DOM events to camera actions and sky interactions.
 *
 * Responsibility: input only — translates raw browser events into pan, zoom,
 * and star-click intents. Never draws or fetches data.
 *
 * Supports both mouse (desktop) and touch (mobile):
 *   - Single finger / mouse drag  → pan
 *   - Two-finger pinch            → zoom
 *   - Tap / click (no drag)       → star lookup
 *   - Mouse wheel                 → zoom
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

    this.isDragging    = false;
    this.lastX         = 0;
    this.lastY         = 0;
    this._dragStartX   = 0;
    this._dragStartY   = 0;
    this._lastPinchDist = null;  // distance between two fingers for pinch zoom

    // Bind once so the same references can be removed in detach()
    this._onMouseDown  = this.#onMouseDown.bind(this);
    this._onMouseMove  = this.#onMouseMove.bind(this);
    this._onMouseUp    = this.#onMouseUp.bind(this);
    this._onWheel      = this.#onWheel.bind(this);
    this._onClick      = this.#onClick.bind(this);
    this._onTouchStart = this.#onTouchStart.bind(this);
    this._onTouchMove  = this.#onTouchMove.bind(this);
    this._onTouchEnd   = this.#onTouchEnd.bind(this);
    this._onResize     = this.onResize;
    this._onBlur       = () => { this.isDragging = false; };
  }

  attach() {
    this.canvas.addEventListener('mousedown',  this._onMouseDown);
    this.canvas.addEventListener('wheel',      this._onWheel, { passive: false });
    this.canvas.addEventListener('click',      this._onClick);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    this.canvas.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);
    window.addEventListener('resize',    this._onResize);
    window.addEventListener('blur',      this._onBlur);
  }

  detach() {
    this.canvas.removeEventListener('mousedown',  this._onMouseDown);
    this.canvas.removeEventListener('wheel',      this._onWheel);
    this.canvas.removeEventListener('click',      this._onClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove',  this._onTouchMove);
    this.canvas.removeEventListener('touchend',   this._onTouchEnd);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup',   this._onMouseUp);
    window.removeEventListener('resize',    this._onResize);
    window.removeEventListener('blur',      this._onBlur);
  }

  // ─── Mouse handlers ─────────────────────────────────────────────────────────

  #onMouseDown(e) {
    this.isDragging  = true;
    this.lastX       = e.clientX;
    this.lastY       = e.clientY;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
  }

  #onMouseMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    const degsPerPx = this.camera.fov / this.canvas.clientHeight;
    // drag right → decrease az (reveals West); drag down → increase alt (reveals sky above)
    this.camera.pan(-dx * degsPerPx, dy * degsPerPx);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  #onMouseUp() {
    this.isDragging = false;
  }

  #onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.camera.zoom(factor);
  }

  async #onClick(e) {
    // Suppress clicks that followed a drag (displacement > 8 px)
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;
    if (dx * dx + dy * dy > 64) return;
    await this.#fireTap(e.clientX, e.clientY);
  }

  // ─── Touch handlers ─────────────────────────────────────────────────────────

  #onTouchStart(e) {
    e.preventDefault();  // stops browser also firing mouse events
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.isDragging    = true;
      this.lastX         = t.clientX;
      this.lastY         = t.clientY;
      this._dragStartX   = t.clientX;
      this._dragStartY   = t.clientY;
      this._lastPinchDist = null;
    } else if (e.touches.length === 2) {
      this.isDragging     = false;
      this._lastPinchDist = this.#pinchDist(e);
    }
  }

  #onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - this.lastX;
      const dy = t.clientY - this.lastY;
      const degsPerPx = this.camera.fov / this.canvas.clientHeight;
      this.camera.pan(-dx * degsPerPx, dy * degsPerPx);
      this.lastX = t.clientX;
      this.lastY = t.clientY;
    } else if (e.touches.length === 2) {
      const dist = this.#pinchDist(e);
      if (this._lastPinchDist !== null && dist > 0) {
        this.camera.zoom(dist / this._lastPinchDist);
      }
      this._lastPinchDist = dist;
    }
  }

  #onTouchEnd(e) {
    e.preventDefault();
    if (e.changedTouches.length === 1 && this._lastPinchDist === null) {
      const t = e.changedTouches[0];
      const dx = t.clientX - this._dragStartX;
      const dy = t.clientY - this._dragStartY;
      // Only fire star lookup when the finger didn't move (tap, not drag)
      if (dx * dx + dy * dy <= 64) {
        this.#fireTap(t.clientX, t.clientY);
      }
    }
    this.isDragging     = false;
    this._lastPinchDist = null;
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  #pinchDist(e) {
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  async #fireTap(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { az: clickAz, alt: clickAlt } = this.camera.screenToSky(
      clientX - rect.left,
      clientY - rect.top,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    await this.onStarClick(clickAz, clickAlt);
  }
}
