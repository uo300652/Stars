import { equatorialToHorizontal, localSiderealTime, utcNow } from './coordinates';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single entry from the HYG star catalog (estrellas.json). */
export interface Star {
  id: number;
  /** Common name, if any (e.g. "Sirius"). Absent for unnamed stars. */
  proper?: string;
  /** Right Ascension in **hours** (0–24) */
  ra: number;
  /** Declination in degrees (–90 to +90) */
  dec: number;
  /** Apparent visual magnitude (lower = brighter) */
  mag: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Finds the nearest star to a point on the sky clicked by the user.
 *
 * The search is done in Az/Alt space using a simple Euclidean distance,
 * which is accurate enough for interactive selection within a few degrees.
 *
 * @param stars        - Full star catalog
 * @param clickAz      - Azimuth of the click in degrees
 * @param clickAlt     - Altitude of the click in degrees
 * @param latDeg       - Observer latitude in degrees
 * @param lonDeg       - Observer longitude in degrees
 * @param toleranceDeg - Maximum search radius in degrees (default 2°)
 * @param utcMs        - UTC timestamp in ms (defaults to now)
 *
 * @returns The closest matching star and its angular distance, or null if none
 *          is within the tolerance radius.
 */
export function findNearestStar(
  stars: Star[],
  clickAz: number,
  clickAlt: number,
  latDeg: number,
  lonDeg: number,
  toleranceDeg: number = 2,
  utcMs: number = utcNow()
): { star: Star; distance: number } | null {
  const lst = localSiderealTime(utcMs, lonDeg);
  let nearest: { star: Star; distance: number } | null = null;

  for (const star of stars) {
    const raDeg = star.ra * 15; // hours → degrees
    const pos = equatorialToHorizontal(raDeg, star.dec, latDeg, lst);

    const dx = clickAz - pos.az;
    const dy = clickAlt - pos.alt;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < toleranceDeg && (nearest === null || distance < nearest.distance)) {
      nearest = { star, distance };
    }
  }

  return nearest;
}
