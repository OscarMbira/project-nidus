import { describe, it, expect } from 'vitest'
import { compareSortValues } from '../../../hooks/useSortableTable'

/** v345 — client-side sort behaviour used by My Team / Sim My Team tables */
describe('simTeamService UI (v345)', () => {
  it('compares allocation percentages numerically when sorting members', () => {
    expect(compareSortValues(50, 100, true)).toBeLessThan(0)
    expect(compareSortValues(100, 50, false)).toBeLessThan(0)
  })
})
