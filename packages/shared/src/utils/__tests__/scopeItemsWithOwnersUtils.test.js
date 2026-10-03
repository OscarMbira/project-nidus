import { describe, it, expect } from 'vitest'
import {
  parseScopeItemsWithOwners,
  serializeScopeItemsWithOwners,
  formatScopeItemsWithOwnersForDisplay,
} from '../scopeItemsWithOwnersUtils.js'

describe('scopeItemsWithOwnersUtils', () => {
  it('round-trips scope items with owners as JSON', () => {
    const rows = [
      { item: 'Retail cost reduction', owner_user_id: 'u1', owner_name: 'Ada Lovelace' },
      { item: 'NPS uplift', owner_user_id: 'u2', owner_name: 'Grace Hopper' },
    ]
    const stored = serializeScopeItemsWithOwners(rows)
    expect(JSON.parse(stored)).toEqual(rows)
    expect(parseScopeItemsWithOwners(stored)).toEqual(rows)
  })

  it('parses legacy plain scope lines without owners', () => {
    expect(parseScopeItemsWithOwners('Scope A\nScope B')).toEqual([
      { item: 'Scope A', owner_user_id: '', owner_name: '' },
      { item: 'Scope B', owner_user_id: '', owner_name: '' },
    ])
  })

  it('formats items for display', () => {
    const stored = serializeScopeItemsWithOwners([
      { item: 'Retail', owner_user_id: 'u1', owner_name: 'Ada' },
    ])
    expect(formatScopeItemsWithOwnersForDisplay(stored)).toBe('Retail (Owner: Ada)')
  })
})
