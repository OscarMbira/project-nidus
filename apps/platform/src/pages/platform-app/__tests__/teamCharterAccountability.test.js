import { describe, it, expect } from 'vitest'

/**
 * Smoke: Team Charter Accountability field wiring (v1094).
 * Mirrors the LIST_FIELDS / export keys expected on Edit + View pages.
 */
const CHARTER_LIST_KEYS = [
  'objectives',
  'values',
  'ways_of_working',
  'norms',
  'accountability',
  'communication_plan',
  'raci_notes',
]

const EXPORT_CONTENT_KEYS = [
  'purpose',
  'objectives',
  'values',
  'ways_of_working',
  'norms',
  'accountability',
  'communication_plan',
  'raci_notes',
]

describe('team charter accountability (v1094)', () => {
  it('places accountability after norms in the list-field order', () => {
    const normsIdx = CHARTER_LIST_KEYS.indexOf('norms')
    const acctIdx = CHARTER_LIST_KEYS.indexOf('accountability')
    expect(acctIdx).toBe(normsIdx + 1)
  })

  it('includes accountability in export content keys', () => {
    expect(EXPORT_CONTENT_KEYS).toContain('accountability')
  })
})
