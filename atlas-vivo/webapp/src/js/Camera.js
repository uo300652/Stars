/**
 * Owns the viewport state for the sky canvas.
 *
 * Responsibility: pan and zoom math only — no drawing, no DOM events.
 */
export default class Camera {
  constructor() {
    this.skyWidth = 360;
    this.skyHeight = 180;

    this.scale = 5;
    this.offsetX = 0;
    this.offsetY = 0;

    this.minScale = 2;
    this.maxScale = 50;
  }

  pan(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;

    // Infinite horizontal scroll: wrap at the 360°/0° boundary
    const worldWidth = this.skyWidth * this.scale;
    this.offsetX = ((this.offsetX % worldWidth) + worldWidth) % worldWidth;
  }

  zoomAt(x, y, factor) {
    const prevScale = this.scale;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.offsetX = x - (x - this.offsetX) * (this.scale / prevScale);
    this.offsetY = y - (y - this.offsetY) * (this.scale / prevScale);
  }
}
