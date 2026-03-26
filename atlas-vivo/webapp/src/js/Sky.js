import Ubicacion from './Ubicacion.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import InputHandler from './InputHandler.js';
import SkyApi from './SkyApi.js';

/**
 * Orchestrates the sky chart.
 *
 * Responsibility: wiring — owns the sub-components and the catalog data,
 * drives the render loop, and exposes a minimal public API to SkyCanvas.vue.
 *
 * @param {HTMLCanvasElement} canvasElement
 * @param {{ onStarSelected?: (star) => void, onLocationResolved?: (loc) => void }} callbacks
 */
export default class Sky {
  constructor(canvasElement, { onStarSelected, onLocationResolved } = {}) {
    this._onStarSelected = onStarSelected ?? null;

    this.ubicacion = new Ubicacion({ onResolved: onLocationResolved });
    this.camera = new Camera();
    this.renderer = new Renderer(canvasElement, this.camera, this.ubicacion);
    this.input = new InputHandler(
      canvasElement,
      this.camera,
      this.#onStarClick.bind(this),
      this.#onWindowResize.bind(this)
    );

    this.canvas = canvasElement;
    this.stars = [];
    this.constellationLines = [];
  }

  async init() {
    this.ubicacion.pedirUbicacion();

    [this.stars, this.constellationLines] = await Promise.all([
      SkyApi.fetchStars(),
      SkyApi.fetchConstellations(),
    ]);

    this.#resize();
    this.input.attach();
    this.#animate();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  #resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.renderer.ctx.scale(dpr, dpr);
  }

  #onWindowResize() {
    this.#resize();
  }

  #animate() {
    this.renderer.render(this.stars, this.constellationLines);
    requestAnimationFrame(this.#animate.bind(this));
  }

  async #onStarClick(clickAz, clickAlt) {
    const result = await SkyApi.findNearestStar(
      clickAz,
      clickAlt,
      this.ubicacion.lat,
      this.ubicacion.lon
    );

    this._onStarSelected?.(result?.star ?? null);
  }
}
