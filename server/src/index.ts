import express from 'express';
import cors from 'cors';
import { mountProxies } from './proxy/config.js';
import engineRouter from './routes/engine.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// Proxies are mounted first so that if STAR_ENGINE_URL is set,
// /api/engine requests are forwarded to the external service
// instead of being handled locally.
mountProxies(app);

// Local routes — active when the service URL env var is not set
app.use('/api/engine', engineRouter);

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
