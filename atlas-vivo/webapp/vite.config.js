import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Resolve the star-engine package directly to its TypeScript source so
      // Vite transpiles it on-the-fly without a separate build step.
      '@atlas-vivo/star-engine': fileURLToPath(
        new URL('../star-engine/src/index.ts', import.meta.url)
      ),
    },
  },
  server: {
    host: true,
    allowedHosts: [
      'seo-representatives-similar-knock.trycloudflare.com',
        'corn-playback-hindu-peer.trycloudflare.com'
    ],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
