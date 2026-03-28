import type { IncomingMessage, ServerResponse } from 'http';
import { utcNow, localSiderealTime, equatorialToHorizontal } from '../_engine';

export default function handler(req: IncomingMessage & { body: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  const { ra, dec, lat, lon } = req.body;
  const now = utcNow();
  const lst = localSiderealTime(now, lon);
  const position = equatorialToHorizontal(ra * 15, dec, lat, lst);
  res.end(JSON.stringify(position));
}
