import { Router } from 'express';
import {
  equatorialToHorizontal,
  localSiderealTime,
  utcNow,
  julianDate,
  greenwichMeanSiderealTime,
  findNearestStar,
  type Star,
} from '@atlas-vivo/star-engine';

const router = Router();

/**
 * GET /api/engine/time?lon=<degrees>
 * Returns current UTC time and derived sidereal times for an observer longitude.
 */
router.get('/time', (req, res) => {
  const lon = parseFloat(req.query.lon as string) || 0;
  const now = utcNow();
  res.json({
    utcMs: now,
    julianDate: julianDate(now),
    gmst: greenwichMeanSiderealTime(now),
    lst: localSiderealTime(now, lon),
  });
});

/**
 * POST /api/engine/position
 * Converts equatorial coordinates to local sky position (Az/Alt + canvas x/y).
 * Body: { ra: number (hours), dec: number (deg), lat: number (deg), lon: number (deg) }
 */
router.post('/position', (req, res) => {
  const { ra, dec, lat, lon } = req.body as {
    ra: number;
    dec: number;
    lat: number;
    lon: number;
  };

  const now = utcNow();
  const lst = localSiderealTime(now, lon);
  const raDeg = ra * 15; // hours → degrees
  const position = equatorialToHorizontal(raDeg, dec, lat, lst);
  res.json(position);
});

/**
 * POST /api/engine/find-star
 * Finds the nearest star to a clicked sky position.
 * Body: { stars: Star[], clickAz, clickAlt, lat, lon, tolerance? }
 */
router.post('/find-star', (req, res) => {
  const { stars, clickAz, clickAlt, lat, lon, tolerance } = req.body as {
    stars: Star[];
    clickAz: number;
    clickAlt: number;
    lat: number;
    lon: number;
    tolerance?: number;
  };

  const result = findNearestStar(stars, clickAz, clickAlt, lat, lon, tolerance);
  res.json(result ?? null);
});

export default router;
