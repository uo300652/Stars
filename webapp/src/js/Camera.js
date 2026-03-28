/**
 * Owns the viewport state for the sky canvas.
 *
 * Responsibility: 3-D spherical camera — direction, FOV, and projection math.
 * No drawing, no DOM events.
 *
 * Coordinate convention:
 *   Az   0° = North  → world +Z
 *   Az  90° = East   → world +X
 *   Alt 90° = Zenith → world +Y
 *
 * When looking North (az=0°, alt=0°): screen-right = East, screen-up = Zenith.
 */

const DEG = Math.PI / 180;

function toVec3(azDeg, altDeg) {
  const az = azDeg * DEG, alt = altDeg * DEG;
  return {
    x: Math.cos(alt) * Math.sin(az),
    y: Math.sin(alt),
    z: Math.cos(alt) * Math.cos(az),
  };
}

function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return len > 1e-10 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 1, z: 0 };
}

export default class Camera {
  constructor() {
    this.az  = 180;  // look direction azimuth in degrees (0 = North)
    this.alt = 25;   // look direction altitude in degrees (0 = horizon)
    this.fov = 90;   // vertical field of view in degrees
    this.minFov = 1;
    this.maxFov = 70;
  }

  // Computes the orthonormal camera basis (right, up, forward) from az/alt.
  #basis() {
    const WORLD_UP = { x: 0, y: 1, z: 0 };
    const forward = toVec3(this.az, this.alt);
    // right = worldUp × forward → points East when looking North
    let right = normalize(cross(WORLD_UP, forward));
    // Gimbal-lock fallback when looking near zenith or nadir
    if (Math.abs(this.alt) > 88) {
      right = toVec3(this.az + 90, 0);
    }
    const up = normalize(cross(forward, right));
    return { forward, right, up };
  }

  /**
   * Rotates the look direction.
   * Altitude is clamped to ±85° to avoid gimbal flip.
   * @param {number} dAzDeg  - Change in azimuth (positive = clockwise / East)
   * @param {number} dAltDeg - Change in altitude (positive = upward)
   */
  pan(dAzDeg, dAltDeg) {
    this.az  = ((this.az + dAzDeg) % 360 + 360) % 360;
    this.alt = Math.max(-85, Math.min(85, this.alt + dAltDeg));
  }

  /**
   * Narrows or widens the field of view.
   * factor > 1 = zoom in (smaller FOV, stars look bigger)
   * factor < 1 = zoom out
   */
  zoom(factor) {
    this.fov = Math.max(this.minFov, Math.min(this.maxFov, this.fov / factor));
  }

  /**
   * Projects a sky position (az/alt) to canvas pixel coordinates.
   * Returns null when the point is behind the camera.
   *
   * @param {number} azDeg    - Azimuth in degrees
   * @param {number} altDeg   - Altitude in degrees
   * @param {number} canvasW  - Canvas CSS width in pixels
   * @param {number} canvasH  - Canvas CSS height in pixels
   * @returns {{ x: number, y: number } | null}
   */
  project(azDeg, altDeg, canvasW, canvasH) {
    const { forward, right, up } = this.#basis();
    const star = toVec3(azDeg, altDeg);
    const cz = dot(star, forward);
    if (cz <= 0) return null;
    const cx = dot(star, right);
    const cy = dot(star, up);
    const focal = (canvasH / 2) / Math.tan((this.fov / 2) * DEG);
    return {
      x: canvasW / 2 + (cx / cz) * focal,
      y: canvasH / 2 - (cy / cz) * focal,
    };
  }

  /**
   * Reverse-projects a canvas pixel position to a sky direction.
   * Used to determine which star was clicked.
   *
   * @param {number} sx       - Screen x in CSS pixels
   * @param {number} sy       - Screen y in CSS pixels
   * @param {number} canvasW  - Canvas CSS width
   * @param {number} canvasH  - Canvas CSS height
   * @returns {{ az: number, alt: number }}
   */
  screenToSky(sx, sy, canvasW, canvasH) {
    const { forward, right, up } = this.#basis();
    const focal = (canvasH / 2) / Math.tan((this.fov / 2) * DEG);
    const cx = (sx - canvasW / 2) / focal;
    const cy = (canvasH / 2 - sy) / focal;
    const ray = normalize({
      x: forward.x + cx * right.x + cy * up.x,
      y: forward.y + cx * right.y + cy * up.y,
      z: forward.z + cx * right.z + cy * up.z,
    });
    const altRad = Math.asin(Math.max(-1, Math.min(1, ray.y)));
    const azRad  = Math.atan2(ray.x, ray.z);
    return {
      az:  ((azRad / DEG % 360) + 360) % 360,
      alt: altRad / DEG,
    };
  }
}
