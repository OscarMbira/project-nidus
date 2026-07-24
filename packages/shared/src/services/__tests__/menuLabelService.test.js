import { describe, it, expect, vi } from 'vitest'
import { getMenuLabel } from '../menuLabelService.js'

function mockDb(returnRow) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: returnRow, error: null })
  const eq2 = vi.fn(() => ({ maybeSingle }))
  const eq1 = vi.fn(() => ({ eq: eq2 }))
  const select = vi.fn(() => ({ eq: eq1 }))
  return { from: vi.fn(() => ({ select })) }
}

describe('getMenuLabel', () => {
  it('returns the fallback when db or menuCode is missing', async () => {
    expect(await getMenuLabel(null, 'plat_tpl_library', 'Fallback')).toBe('Fallback')
    expect(await getMenuLabel({}, null, 'Fallback')).toBe('Fallback')
  })

  it('returns the DB menu_label when found', async () => {
    const db = mockDb({ menu_label: 'Renamed by PMO Admin' })
    const result = await getMenuLabel(db, 'plat_tpl_library', 'Fallback')
    expect(result).toBe('Renamed by PMO Admin')
    expect(db.from).toHaveBeenCalledWith('menu_items')
  })

  it('returns the fallback when no row is found', async () => {
    const db = mockDb(null)
    const result = await getMenuLabel(db, 'plat_tpl_library', 'Fallback')
    expect(result).toBe('Fallback')
  })

  it('returns the fallback if the query throws (never breaks the page)', async () => {
    const db = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('boom') } }) }) }) }) }
    const result = await getMenuLabel(db, 'plat_tpl_library', 'Fallback')
    expect(result).toBe('Fallback')
  })
})
