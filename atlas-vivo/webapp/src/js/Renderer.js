import {
  equatorialToHorizontal,
  localSiderealTime,
  utcNow,
} from '@atlas-vivo/star-engine';

/**
 * Draws the sky onto a canvas using perspective (rectilinear) projection.
 *
 * Responsibility: rendering only — reads camera state and catalog data, never
 * mutates them. Coordinate projection is delegated to @atlas-vivo/star-engine
 * (equatorial → horizontal) and Camera (horizontal → screen).
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
   * Converts equatorial coordinates to local horizontal (az/alt).
   * @param {number}  ra       - Right Ascension in hours (or degrees when esGrados=true)
   * @param {number}  dec      - Declination in degrees
   * @param {boolean} esGrados - true when ra is already in degrees (constellation data)
   * @returns {{ az: number, alt: number }}
   */
  #toHorizontal(ra, dec, esGrados = false) {
    const raDeg = esGrados ? ra : ra * 15;
    const lst = localSiderealTime(utcNow(), this.ubicacion.lon);
    return equatorialToHorizontal(raDeg, dec, this.ubicacion.lat, lst);
  }

  /** Returns the canvas CSS dimensions used for all projection math. */
  #dims() {
    return { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
  }

  // ─── Draw calls ─────────────────────────────────────────────────────────────

  #clear() {
    const { w, h } = this.#dims();
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, w, h);
  }

  #drawGrid() {
    const { ctx, camera } = this;
    const { w, h } = this.#dims();
    ctx.save();
    ctx.font = '10px Arial';

    // Altitude circles (almucantars)
    for (let alt = -75; alt <= 90; alt += 15) {
      ctx.strokeStyle = alt === 0
        ? 'rgba(0, 255, 0, 0.5)'
        : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      let first = true;
      for (let az = 0; az <= 360; az += 2) {
        const p = camera.project(az, alt, w, h);
        if (!p) { first = true; continue; }
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Label near the camera's look direction (always visible on screen)
      if (alt !== 0) {
        const lp = camera.project(camera.az, alt, w, h);
        if (lp) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(`${alt}°`, lp.x + 4, lp.y - 2);
        }
      }
    }

    // Azimuth meridians and cardinal labels
    const cardinales = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (let az = 0; az < 360; az += 30) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      let first = true;
      for (let alt = -80; alt <= 80; alt += 5) {
        const p = camera.project(az, alt, w, h);
        if (!p) { first = true; continue; }
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      if (cardinales[az]) {
        const cp = camera.project(az, 2, w, h);
        if (cp) {
          ctx.fillStyle = 'white';
          ctx.fillText(cardinales[az], cp.x + 3, cp.y - 3);
        }
      }
    }

    ctx.restore();
  }

  #drawGround() {
    const { ctx, camera } = this;
    const { w, h } = this.#dims();

    // Sample 360 points along the horizon (slightly below alt=0 to avoid gaps)
    const pts = [];
    for (let az = 0; az < 360; az += 1) {
      const p = camera.project(az, -0.1, w, h);
      if (p) pts.push(p);
    }

    if (pts.length === 0) return;

    // Sort left-to-right so the polygon traces the horizon curve correctly
    pts.sort((a, b) => a.x - b.x);

    const topY = Math.min(...pts.map(p => p.y));
    const grad = ctx.createLinearGradient(0, topY, 0, h);
    grad.addColorStop(0, 'rgba(10, 10, 20, 0.9)');
    grad.addColorStop(1, '#000000');

    ctx.save();

    // Ground polygon: bottom-left corner → horizon curve → bottom-right corner
    ctx.beginPath();
    ctx.moveTo(Math.min(pts[0].x, 0), h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(Math.max(pts[pts.length - 1].x, w), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  #drawStars(stars) {
    const { ctx, camera } = this;
    const { w, h } = this.#dims();

    stars.forEach(star => {
      const { az, alt } = this.#toHorizontal(star.ra, star.dec);
      if (alt < -10) return;  // well below horizon — skip

      const pos = camera.project(az, alt, w, h);
      if (!pos) return;  // behind camera

      // Stars are point sources: base size depends on magnitude, not on zoom.
      // A small zoom-dependent bonus keeps them visible at wide FOV without
      // making them enormous discs at narrow FOV.
      const base   = Math.max(0.8, (6.5 - star.mag) * 1.1);
      const bonus  = Math.max(0, (6.5 - star.mag) * (h / camera.fov) * 0.04);
      const radius = Math.min(base + bonus, base * 1.5);
      const opacity = alt > -5 ? 1 : 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  #drawConstellations(lines) {
    const { ctx, camera } = this;
    const { w, h } = this.#dims();

    ctx.save();
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    ctx.lineWidth = 1.5;

    lines.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const segments = Array.isArray(coords[0][0]) ? coords : [coords];

      segments.forEach(segment => {
        ctx.beginPath();
        let penDown = false;

        segment.forEach(punto => {
          const { az, alt } = this.#toHorizontal(punto[0], punto[1], true);
          const pos = camera.project(az, alt, w, h);

          if (!pos) {
            penDown = false;  // behind camera: lift pen to avoid cross-screen lines
            return;
          }
          if (!penDown) {
            ctx.moveTo(pos.x, pos.y);
            penDown = true;
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        });

        ctx.stroke();
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
