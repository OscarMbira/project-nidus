/** v1359 (B1) — currency options: mapping, active-only query, session cache. */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('../useRegionalFormatSettings.js', () => ({ useRegionalFormatSettings: () => null }))

const { CURRENCY_CACHE_KEY, loadCurrencyOptions, toCurrencyOptions } = await import('../useCurrencyOptions.js')

function fakeDb(rows) {
  const calls = []
  const q = {
    select: (c) => { calls.push(['select', c]); return q },
    eq: (k, v) => { calls.push(['eq', k, v]); return q },
    order: () => Promise.resolve({ data: rows, error: null }),
  }
  return { calls, from: (t) => { calls.push(['from', t]); return q } }
}

beforeEach(() => sessionStorage.clear())

describe('currency options', () => {
  it('maps codes to upper-case values with readable labels', () => {
    expect(toCurrencyOptions([{ code: 'gbp', name: 'Pound Sterling' }, { code: null }])).toEqual([{ value: 'GBP', label: 'GBP — Pound Sterling' }])
  })

  it('reads only active, not deleted currencies, then serves the tab cache', async () => {
    const db = fakeDb([{ code: 'EGP', name: 'Egyptian Pound' }, { code: 'AED', name: 'UAE Dirham' }])
    const first = await loadCurrencyOptions(db)
    expect(first.map((o) => o.value)).toEqual(['EGP', 'AED'])
    expect(db.calls).toContainEqual(['from', 'currencies'])
    expect(db.calls).toContainEqual(['eq', 'is_active', true])
    expect(db.calls).toContainEqual(['eq', 'is_deleted', false])
    expect(JSON.parse(sessionStorage.getItem(CURRENCY_CACHE_KEY))).toHaveLength(2)
    const again = fakeDb([])
    expect(await loadCurrencyOptions(again)).toEqual(first)
    expect(again.calls).toHaveLength(0)
  })
})
