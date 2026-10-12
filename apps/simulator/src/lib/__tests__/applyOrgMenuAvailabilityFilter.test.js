import { describe, it, expect } from 'vitest'
import { applyOrgMenuAvailabilityFilter } from '../useMenu'

describe('applyOrgMenuAvailabilityFilter (v918/v924 Phase 10)', () => {
  it('narrows menuIds to whatever the org-availability RPC allows', () => {
    const result = applyOrgMenuAvailabilityFilter(['a', 'b', 'c'], ['a', 'c'])
    expect(result).toEqual(['a', 'c'])
  })

  it('accepts a Set for availableIds, same as an array', () => {
    const result = applyOrgMenuAvailabilityFilter(['a', 'b'], new Set(['b']))
    expect(result).toEqual(['b'])
  })

  it('keeps every id when all are available (role still gates on top — this only narrows)', () => {
    const result = applyOrgMenuAvailabilityFilter(['a', 'b'], ['a', 'b', 'z'])
    expect(result).toEqual(['a', 'b'])
  })

  it('fails open — returns the original array unchanged when the filter would empty it', () => {
    const input = ['a', 'b']
    const result = applyOrgMenuAvailabilityFilter(input, [])
    expect(result).toBe(input)
  })

  it('fails open when none of the ids are in the available set', () => {
    const input = ['a', 'b']
    const result = applyOrgMenuAvailabilityFilter(input, ['z'])
    expect(result).toBe(input)
  })

  it('handles an empty menuIds input without throwing (caller already guards this, belt-and-braces here)', () => {
    const result = applyOrgMenuAvailabilityFilter([], ['a'])
    expect(result).toEqual([])
  })
})
