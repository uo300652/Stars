import { readFileSync } from 'fs';
import { join } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { findNearestStar, type Star } from '@atlas-vivo/star-engine';

const stars: Star[] = JSON.parse(
  readFileSync(join(__dirname, '../../server/data/estrellas.json'), 'utf-8')
);

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
