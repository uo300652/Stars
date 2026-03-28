import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import {
  utcNow,
  julianDate,
  greenwichMeanSiderealTime,
  localSiderealTime,
} from '@atlas-vivo/star-engine';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { searchParams } = new URL(req.url!, `http://${req.headers.host}`);
  const lon = parseFloat(searchParams.get('lon') ?? '0') || 0;
  const now = utcNow();

  res.end(JSON.stringify({
    utcMs: now,
    julianDate: julianDate(now),
    gmst: greenwichMeanSiderealTime(now),
    lst: localSiderealTime(now, lon),
  }));
}
