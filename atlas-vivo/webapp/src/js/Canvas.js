import Ubicacion from './Ubicacion.js';
import {
  equatorialToHorizontal,
  localSiderealTime,
  utcNow,
  findNearestStar,
} from '@atlas-vivo/star-engine';

/**
 * Manages the star-chart canvas.
 *
 * Responsibility: rendering only — pan, zoom, draw calls, and event wiring.
 * All astronomical math is delegated to @atlas-vivo/star-engine.
 */
export default class Canvas {
  constructor(canvasElement) {
    this.ubicacion = new Ubicacion();
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Logical sky world: 360° Azimuth (X) × 180° Altitude (Y)
    this.skyWidth = 360;
    this.skyHeight = 180;

    this.stars = [];
    this.lineasData = [];

    this.scale = 5;
    this.offsetX = 0;
    this.offsetY = 0;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this.minScale = 2;
    this.maxScale = 50;

    this.addListeners();
  }

  async init() {
    await this.ubicacion.pedirUbicacion();
    await this.cargarEstrellas();
    await this.cargarConstelaciones();
    this.resize();
    this.animate();
  }

  // ─── Coordinate Projection ────────────────────────────────────────────────

  /**
   * Projects a star's equatorial coordinates (RA/Dec) to canvas world space.
   * Delegates all math to star-engine.
   *
   * @param {number} ra       - Right Ascension (hours if esGrados=false, degrees if true)
   * @param {number} dec      - Declination in degrees
   * @param {boolean} esGrados - Pass true when ra is already in degrees (constellation data)
   */
  convertirPosicion(ra, dec, esGrados = false) {
    const raDeg = esGrados ? ra : ra * 15;
    const lst = localSiderealTime(utcNow(), this.ubicacion.lon);
    return equatorialToHorizontal(raDeg, dec, this.ubicacion.lat, lst);
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  limpiar() {
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dibujarRejilla() {
    this.ctx.save();
    this.ctx.font = '10px Arial';

    // Altitude lines (almucantars)
    for (let alt = -90; alt <= 90; alt += 15) {
      const y = (90 - alt) * this.scale + this.offsetY;
      this.ctx.strokeStyle = alt === 0 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillText(`${alt}°`, 10, y - 2);
    }

    // Azimuth lines and cardinal points
    const cardinales = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (let az = 0; az < 360; az += 30) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = -1; i <= 1; i++) {
        const x = (az + i * this.skyWidth) * this.scale + this.offsetX;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        if (cardinales[az]) {
          this.ctx.fillStyle = 'white';
          this.ctx.fillText(cardinales[az], x + 5, 90 * this.scale + this.offsetY - 5);
        }
      }
    }
    this.ctx.restore();
  }

  dibujarSuelo() {
    const horizonY = 90 * this.scale + this.offsetY;
    if (horizonY > this.canvas.height) return;

    this.ctx.save();
    const grad = this.ctx.createLinearGradient(0, horizonY, 0, this.canvas.height);
    grad.addColorStop(0, 'rgba(10, 10, 20, 0.9)');
    grad.addColorStop(1, '#000000');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, horizonY, this.canvas.width, this.canvas.height - horizonY);

    this.ctx.strokeStyle = '#004400';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(this.canvas.width, horizonY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  dibujarEstrellas() {
    this.stars.forEach(star => {
      const pos = this.convertirPosicion(star.ra, star.dec, false);
      const radius = Math.max(0.2, (6.5 - star.mag) * (this.scale * 0.05));
      const opacity = pos.alt > -5 ? 1 : 0.1;

      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

      for (let i = -1; i <= 1; i++) {
        const px = (pos.x + i * this.skyWidth) * this.scale + this.offsetX;
        const py = pos.y * this.scale + this.offsetY;

        if (px > -10 && px < this.canvas.width + 10) {
          this.ctx.beginPath();
          this.ctx.arc(px, py, radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    });
  }

  dibujarConstelaciones() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    this.ctx.lineWidth = 1.5;

    this.lineasData.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const segmentos = Array.isArray(coords[0][0]) ? coords : [coords];

      segmentos.forEach(segmento => {
        for (let i = -1; i <= 1; i++) {
          this.ctx.beginPath();
          let prevX = null;

          segmento.forEach((punto, index) => {
            const pos = this.convertirPosicion(punto[0], punto[1], true);
            const px = (pos.x + i * this.skyWidth) * this.scale + this.offsetX;
            const py = pos.y * this.scale + this.offsetY;

            // Anti-tear: cut the line when it wraps across the 360°/0° boundary
            const saltoDetectado = prevX !== null && Math.abs(pos.x - prevX) > 180;

            if (index === 0 || saltoDetectado) {
              this.ctx.moveTo(px, py);
            } else {
              this.ctx.lineTo(px, py);
            }

            prevX = pos.x;
          });

          this.ctx.stroke();
        }
      });
    });

    this.ctx.restore();
  }

  // ─── Render Loop ──────────────────────────────────────────────────────────

  render() {
    this.limpiar();
    this.dibujarRejilla();
    this.dibujarConstelaciones();
    this.dibujarEstrellas();
    this.dibujarSuelo();
  }

  animate() {
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  zoomAt(x, y, factor) {
    const prevScale = this.scale;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.offsetX = x - (x - this.offsetX) * (this.scale / prevScale);
    this.offsetY = y - (y - this.offsetY) * (this.scale / prevScale);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  addListeners() {
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Pixels → world coordinates (Az/Alt)
      const clickAz = (mouseX - this.offsetX) / this.scale;
      const clickAlt = 90 - (mouseY - this.offsetY) / this.scale;

      const result = findNearestStar(
        this.stars,
        clickAz,
        clickAlt,
        this.ubicacion.lat,
        this.ubicacion.lon
      );

      if (result) {
        const star = result.star;
        console.log(`Estrella encontrada: ${star.proper || 'Sin nombre (HR ' + star.id + ')'}`);
        console.log(`Magnitud: ${star.mag}`);
      } else {
        console.log('No hay ninguna estrella cerca de esa posición.');
      }
    });

    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoomAt(e.offsetX, e.offsetY, factor);
    }, { passive: false });

    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;

      this.offsetX += dx;
      this.offsetY += dy;

      // Infinite horizontal scroll: wrap at 360°
      const worldWidth = this.skyWidth * this.scale;
      this.offsetX = ((this.offsetX % worldWidth) + worldWidth) % worldWidth;

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => (this.isDragging = false));
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────

  async cargarEstrellas() {
    const res = await fetch('/estrellas.json');
    this.stars = await res.json();
  }

  async cargarConstelaciones() {
    const res = await fetch('/constellations.lines.json');
    const data = await res.json();
    this.lineasData = data.features || [];
  }
}
