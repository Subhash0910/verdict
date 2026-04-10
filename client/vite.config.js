import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    // In dev: fixed string so SW cache name never changes between HMR restarts.
    // In prod: unique timestamp per build so stale caches are always evicted.
    __BUILD_TIME__: JSON.stringify(isProd ? Date.now().toString() : 'dev'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
})
