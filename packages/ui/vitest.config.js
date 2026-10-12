import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nidus/shared/hooks': path.resolve(__dirname, '../shared/src/hooks'),
      '@nidus/shared/utils': path.resolve(__dirname, '../shared/src/utils'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // v1240: components that import @nidus/supabase now run from this package (not the app
    // copies), and the client validates its URL at import time — placeholders, no real queries.
    env: {
      VITE_SUPABASE_URL: 'https://test-placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-not-real',
    },
  },
})
