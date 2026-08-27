/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to the backend during local dev (backend = Story 1.2+).
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      // Only the bootstrap is excluded from the gate. The rest are non-source
      // files that `src/**` sweeps in as zero-line noise in the HTML report.
      exclude: ['src/main.tsx', '**/.gitkeep', '**/*.css'],
      reportOnFailure: true,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
