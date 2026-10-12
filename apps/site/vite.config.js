import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

/**
 * v1241 — Nidus brand site (apex domain). Static, no sign-in, no app shell.
 * @nidus/* resolve to packages/* (no alias overrides, CLAUDE.md rule 34.3).
 */
export default defineConfig({
  plugins: [react()],
  envDir: repoRoot,
  publicDir: path.resolve(repoRoot, 'public'),
  server: { port: 5177, strictPort: true },
  preview: { port: 5177, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
})
