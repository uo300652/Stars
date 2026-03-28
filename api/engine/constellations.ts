import type { IncomingMessage, ServerResponse } from 'http';
import { constellations } from '../_engine';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(constellations));
}
