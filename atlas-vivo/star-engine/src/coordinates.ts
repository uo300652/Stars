// ─── Time Utilities ───────────────────────────────────────────────────────────

/**
 * Returns the current time as a UTC timestamp in milliseconds.
 * Equivalent to what the browser's Date gives us, corrected to UTC.
 */
export function utcNow(): number {
  const now = new Date();
  return now.getTime() + now.getTimezoneOffset() * 60000;
}

/**
 * Converts a UTC timestamp (ms since Unix epoch) to a Julian Date.
 */
export function julianDate(utcMs: number): number {
  return utcMs / 86400000 + 2440587.5;
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in degrees.
 */
export function greenwichMeanSiderealTime(utcMs: number): number {
  const D = julianDate(utcMs) - 2451545.0; // days since J2000.0
  const gmst = 280.46061837 + 360.98564736629 * D;
  return ((gmst % 360) + 360) % 360;
}

/**
 * Calculates Local Sidereal Time (LST) in degrees.
 *
 * @param utcMs  - UTC time in milliseconds since Unix epoch
 * @param lonDeg - Observer longitude in degrees (East positive, West negative)
 */
export function localSiderealTime(utcMs: number, lonDeg: number): number {
  const gmst = greenwichMeanSiderealTime(utcMs);
  return ((gmst + lonDeg) % 360 + 360) % 360;
}

// ─── Coordinate Types ─────────────────────────────────────────────────────────

/**
 * The result of projecting an equatorial star position into the local sky
 * and then into the flat 2-D canvas world used by the renderer.
 */
export interface SkyPosition {
  /** Azimuth in degrees (0–360, North = 0, East = 90) */
  az: number;
  /** Altitude in degrees (–90 below horizon to +90 at zenith) */
  alt: number;
  /** Canvas world X — equals az (0–360 horizontal axis) */
  x: number;
  /** Canvas world Y — equals (90 − alt), so zenith = 0, horizon = 90 */
  y: number;
}

// ─── Coordinate Transformation ────────────────────────────────────────────────

/**
 * Converts equatorial coordinates (Right Ascension / Declination) to local
 * horizontal coordinates (Azimuth / Altitude) using standard spherical
 * trigonometry, then maps the result to canvas world space.
 *
 * @param raDeg  - Right Ascension in **degrees** (0–360)
 * @param decDeg - Declination in degrees (–90 to +90)
 * @param latDeg - Observer latitude in degrees
 * @param lstDeg - Local Sidereal Time in degrees (use {@link localSiderealTime})
 */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number
): SkyPosition {
  const latRad = (latDeg * Math.PI) / 180;

  // Hour Angle: how far the object has moved past the meridian
  let ha = lstDeg - raDeg;
  if (ha < 0) ha += 360;
  const haRad = (ha * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;

  // Altitude (elevation above horizon)
  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(sinAlt);
  const alt = (altRad * 180) / Math.PI;

  // Azimuth (compass bearing, N = 0)
  const cosAz =
    (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
    (Math.cos(altRad) * Math.cos(latRad));
  let az = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
  if (Math.sin(haRad) > 0) az = 360 - az;

  return { az, alt, x: az, y: 90 - alt };
}
