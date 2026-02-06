/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: ["index.html", "auth-callback.html"],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    watch: {
      // Use polling for Docker file watching
      usePolling: true,
      interval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/tsconfig*.json',
        '**/.git/**',
        '**/vite.config.ts',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
