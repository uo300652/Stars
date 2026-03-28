import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Application } from 'express';

/**
 * Mounts proxy middleware for external services.
 * Each service is enabled only when its URL env var is set.
 *
 * Current services:
 *   STAR_ENGINE_URL  — when star-engine runs as its own HTTP service
 *   AUTH_SERVICE_URL — future user-auth module
 *
 * If STAR_ENGINE_URL is not set, /api/engine requests fall through
 * to the local engine router which uses star-engine as a library.
 */
export function mountProxies(app: Application): void {
  if (process.env.STAR_ENGINE_URL) {
    app.use(
      '/api/engine',
      createProxyMiddleware({
        target: process.env.STAR_ENGINE_URL,
        changeOrigin: true,
      })
    );
  }

  if (process.env.AUTH_SERVICE_URL) {
    app.use(
      '/api/auth',
      createProxyMiddleware({
        target: process.env.AUTH_SERVICE_URL,
        changeOrigin: true,
      })
    );
  }
}
