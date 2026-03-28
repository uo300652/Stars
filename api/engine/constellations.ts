import { readFileSync } from 'fs';
import { join } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const data = JSON.parse(
  readFileSync(join(__dirname, '../../server/data/constellations.lines.json'), 'utf-8')
);

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
