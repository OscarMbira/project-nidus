import { mergeConfig } from 'vitest/config'
import base from './vitest.config.js'

// v1239 Slice 9.2 — timing checks, run alone (no file parallelism): `pnpm test:perf`.
export default mergeConfig(base, {
  test: {
    include: ['src/engine/**/*.test.js', 'src/components/**/*.perf.test.jsx'],
    fileParallelism: false,
    env: { PLANNING_PERF: '1' },
  },
})
