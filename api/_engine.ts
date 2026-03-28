import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Star {
  id: number;
  proper?: string;
  ra: number;   // hours
  dec: number;  // degrees
  mag: number;
  [key: string]: unknown;
}

// ─── Data (loaded once per cold start) ───────────────────────────────────────

export const stars: Star[] = JSON.parse(
  readFileSync(join(__dirname, '../server/data/estrellas.json'), 'utf-8')
);

export const constellations: unknown = JSON.parse(
  readFileSync(join(__dirname, '../server/data/constellations.lines.json'), 'utf-8')
);

// ─── Time ─────────────────────────────────────────────────────────────────────

export function utcNow(): number {
  const now = new Date();
  return now.getTime() + now.getTimezoneOffset() * 60000;
}

export function julianDate(utcMs: number): number {
  return utcMs / 86400000 + 2440587.5;
}

export function greenwichMeanSiderealTime(utcMs: number): number {
  const D = julianDate(utcMs) - 2451545.0;
  const gmst = 280.46061837 + 360.98564736629 * D;
  return ((gmst % 360) + 360) % 360;
}

export function localSiderealTime(utcMs: number, lonDeg: number): number {
  return ((greenwichMeanSiderealTime(utcMs) + lonDeg) % 360 + 360) % 360;
}

// ─── Coordinates ─────────────────────────────────────────────────────────────

export function equatorialToHorizontal(
  raDeg: number, decDeg: number, latDeg: number, lstDeg: number
) {
  const latRad = (latDeg * Math.PI) / 180;
  let ha = lstDeg - raDeg;
  if (ha < 0) ha += 360;
  const haRad = (ha * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(sinAlt);
  const alt = (altRad * 180) / Math.PI;

  const cosAz =
    (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
    (Math.cos(altRad) * Math.cos(latRad));
  let az = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
  if (Math.sin(haRad) > 0) az = 360 - az;

  return { az, alt, x: az, y: 90 - alt };
}

// ─── Star search ─────────────────────────────────────────────────────────────

export function findNearestStar(
  catalog: Star[], clickAz: number, clickAlt: number,
  latDeg: number, lonDeg: number, toleranceDeg = 2, utcMs = utcNow()
): { star: Star; distance: number } | null {
  const lst = localSiderealTime(utcMs, lonDeg);
  let nearest: { star: Star; distance: number } | null = null;

  for (const star of catalog) {
    const pos = equatorialToHorizontal(star.ra * 15, star.dec, latDeg, lst);
    const d = Math.sqrt((clickAz - pos.az) ** 2 + (clickAlt - pos.alt) ** 2);
    if (d < toleranceDeg && (nearest === null || d < nearest.distance)) {
      nearest = { star, distance: d };
    }
  }
  return nearest;
}
