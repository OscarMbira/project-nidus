import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// v1239: same test environment as the apps and packages/shared (jsdom, setup, globals,
// placeholder Supabase env — tests never issue real queries).
export default defineConfig({
  plugins: [react()],
  // Screens import the context by package id (federation singleton); resolve it to this source.
  resolve: { alias: { '@nidus/planning': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    env: {
      VITE_SUPABASE_URL: 'https://test-placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-not-real',
    },
  },
})
