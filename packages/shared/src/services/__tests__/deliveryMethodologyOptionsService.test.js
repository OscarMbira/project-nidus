import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDeliveryMethodologyOptionsCache,
  listDeliveryMethodologyOptions,
} from '../deliveryMethodologyOptionsService.js'

describe('listDeliveryMethodologyOptions', () => {
  beforeEach(() => {
    clearDeliveryMethodologyOptionsCache()
    vi.stubGlobal('sessionStorage', {
      store: {},
      getItem(k) { return this.store[k] ?? null },
      setItem(k, v) { this.store[k] = String(v) },
      removeItem(k) { delete this.store[k] },
    })
  })

  it('returns primary options and caches them', async () => {
    const rows = [
      { code: 'hybrid', label: 'Hybrid (all tracks)', description: '', display_order: 10, is_legacy: false },
      { code: 'Hybrid', label: 'Hybrid (legacy)', description: '', display_order: 110, is_legacy: true },
    ]
    const db = {
      from(table) {
        expect(table).toBe('delivery_methodology_options')
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: rows, error: null }),
            }),
          }),
        }
      },
    }

    const primary = await listDeliveryMethodologyOptions(db)
    expect(primary).toHaveLength(1)
    expect(primary[0].code).toBe('hybrid')

    const withLegacy = await listDeliveryMethodologyOptions(db, { includeLegacy: true })
    expect(withLegacy).toHaveLength(2)
  })

  it('throws when the query fails', async () => {
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: { message: 'boom' } }),
          }),
        }),
      }),
    }
    await expect(listDeliveryMethodologyOptions(db)).rejects.toEqual({ message: 'boom' })
  })
})
