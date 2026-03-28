import type { IncomingMessage, ServerResponse } from 'http';
import { stars, findNearestStar } from '../_engine.js';

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

  const { clickAz, clickAlt, lat, lon, tolerance } = req.body;
  const result = findNearestStar(stars, clickAz, clickAlt, lat, lon, tolerance);
  res.end(JSON.stringify(result ?? null));
}
