import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // escucha en todas las interfaces (0.0.0.0)
    allowedHosts: [
      'seo-representatives-similar-knock.trycloudflare.com'
    ]
  },
  plugins: [vue()],
})
