import {
  equatorialToHorizontal,
  localSiderealTime,
  utcNow,
} from '@atlas-vivo/star-engine';

/**
 * Draws the sky onto a canvas.
 *
 * Responsibility: rendering only — reads camera state and catalog data, never
 * mutates them. Coordinate projection is delegated to @atlas-vivo/star-engine.
 */
export default class Renderer {
  constructor(canvas, camera, ubicacion) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.ubicacion = ubicacion;
  }

  // ─── Coordinate Projection ──────────────────────────────────────────────────

  /**
   * Projects equatorial coordinates to canvas world space (Az/Alt + x/y).
   *
   * @param {number}  ra       - Right Ascension (hours when esGrados=false, degrees otherwise)
   * @param {number}  dec      - Declination in degrees
   * @param {boolean} esGrados - Pass true when ra is already in degrees (constellation data)
   */
  #project(ra, dec, esGrados = false) {
    const raDeg = esGrados ? ra : ra * 15;
    const lst = localSiderealTime(utcNow(), this.ubicacion.lon);
    return equatorialToHorizontal(raDeg, dec, this.ubicacion.lat, lst);
  }

  // ─── Draw calls ─────────────────────────────────────────────────────────────

  #clear() {
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  #drawGrid() {
    const { ctx, canvas, camera } = this;
    ctx.save();
    ctx.font = '10px Arial';

    // Altitude lines (almucantars)
    for (let alt = -90; alt <= 90; alt += 15) {
      const y = (90 - alt) * camera.scale + camera.offsetY;
      ctx.strokeStyle = alt === 0 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${alt}°`, 10, y - 2);
    }

    // Azimuth lines and cardinal points
    const cardinales = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (let az = 0; az < 360; az += 30) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = -1; i <= 1; i++) {
        const x = (az + i * camera.skyWidth) * camera.scale + camera.offsetX;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        if (cardinales[az]) {
          ctx.fillStyle = 'white';
          ctx.fillText(cardinales[az], x + 5, 90 * camera.scale + camera.offsetY - 5);
        }
      }
    }

    ctx.restore();
  }

  #drawGround() {
    const { ctx, canvas, camera } = this;
    const horizonY = 90 * camera.scale + camera.offsetY;
    if (horizonY > canvas.height) return;

    ctx.save();
    const grad = ctx.createLinearGradient(0, horizonY, 0, canvas.height);
    grad.addColorStop(0, 'rgba(10, 10, 20, 0.9)');
    grad.addColorStop(1, '#000000');

    ctx.fillStyle = grad;
    ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(canvas.width, horizonY);
    ctx.stroke();
    ctx.restore();
  }

  #drawStars(stars) {
    const { ctx, camera } = this;
    stars.forEach(star => {
      const pos = this.#project(star.ra, star.dec);
      const radius = Math.max(0.2, (6.5 - star.mag) * (camera.scale * 0.05));
      const opacity = pos.alt > -5 ? 1 : 0.1;

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

      for (let i = -1; i <= 1; i++) {
        const px = (pos.x + i * camera.skyWidth) * camera.scale + camera.offsetX;
        const py = pos.y * camera.scale + camera.offsetY;

        if (px > -10 && px < this.canvas.width + 10) {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  #drawConstellations(lines) {
    const { ctx, camera } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    ctx.lineWidth = 1.5;

    lines.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const segmentos = Array.isArray(coords[0][0]) ? coords : [coords];

      segmentos.forEach(segmento => {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          let prevX = null;

          segmento.forEach((punto, index) => {
            const pos = this.#project(punto[0], punto[1], true);
            const px = (pos.x + i * camera.skyWidth) * camera.scale + camera.offsetX;
            const py = pos.y * camera.scale + camera.offsetY;

            // Anti-tear: cut the line when it wraps across the 360°/0° boundary
            const saltoDetectado = prevX !== null && Math.abs(pos.x - prevX) > 180;

            if (index === 0 || saltoDetectado) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }

            prevX = pos.x;
          });

          ctx.stroke();
        }
      });
    });

    ctx.restore();
  }

  // ─── Public ─────────────────────────────────────────────────────────────────

  render(stars, constellationLines) {
    this.#clear();
    this.#drawGrid();
    this.#drawConstellations(constellationLines);
    this.#drawStars(stars);
    this.#drawGround();
  }
}
