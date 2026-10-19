import { defineConfig } from 'vitest/config'

// v1272: unit tests for the pure AI modules shared by the edge functions (no Deno APIs needed).
// Run: npx vitest run --config supabase/functions/vitest.config.js
export default defineConfig({
  test: {
    environment: 'node',
    include: ['_shared/ai/__tests__/**/*.test.js'],
  },
})
