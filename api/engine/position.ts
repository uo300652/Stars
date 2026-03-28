import type { IncomingMessage, ServerResponse } from 'http';
import {
  utcNow,
  localSiderealTime,
  equatorialToHorizontal,
} from '@atlas-vivo/star-engine';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  const { ra, dec, lat, lon } = JSON.parse(await readBody(req));
  const now = utcNow();
  const lst = localSiderealTime(now, lon);
  const raDeg = ra * 15;
  const position = equatorialToHorizontal(raDeg, dec, lat, lst);
  res.end(JSON.stringify(position));
}
