import { defineConfig } from 'vitest/config'

// v1272: Ask Nidus eval scoring tests. Run: npx vitest run --config scripts/ai-eval/vitest.config.mjs
export default defineConfig({
  test: { environment: 'node', include: ['__tests__/**/*.test.mjs'] },
})
