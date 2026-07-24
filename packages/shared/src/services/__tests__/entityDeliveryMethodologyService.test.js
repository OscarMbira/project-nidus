import { describe, expect, it, vi } from 'vitest'
import { resolveEntityDeliveryMethodology } from '../entityDeliveryMethodologyService.js'

function mockDb(handlers) {
  return {
    from(table) {
      const h = handlers[table] || (() => ({ data: null }))
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => h(),
                limit: () => ({
                  then: undefined,
                  // for links query returning array via await on builder - simplify:
                }),
              }
            },
          }
        },
      }
    },
  }
}

describe('resolveEntityDeliveryMethodology', () => {
  it('returns portfolio track when specific', async () => {
    const db = {
      from(table) {
        expect(table).toBe('portfolios')
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { delivery_methodology_track: 'agile' } }),
            }),
          }),
        }
      },
    }
    const track = await resolveEntityDeliveryMethodology(db, {
      entityType: 'portfolio',
      entityId: 'p1',
      schema: 'public',
    })
    expect(track).toBe('agile')
  })

  it('skips hybrid and walks to portfolio from programme', async () => {
    const db = {
      from(table) {
        if (table === 'programmes') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    delivery_methodology_track: 'hybrid',
                    portfolio_id: 'port-1',
                  },
                }),
              }),
            }),
          }
        }
        if (table === 'portfolios') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { delivery_methodology_track: 'standards_based' },
                }),
              }),
            }),
          }
        }
        throw new Error(table)
      },
    }
    const track = await resolveEntityDeliveryMethodology(db, {
      entityType: 'programme',
      entityId: 'prg-1',
    })
    expect(track).toBe('standards_based')
  })

  it('returns null when nothing flagged', async () => {
    const db = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { delivery_methodology_track: null } }),
            }),
          }),
        }
      },
    }
    const track = await resolveEntityDeliveryMethodology(db, {
      entityType: 'portfolio',
      entityId: 'p1',
    })
    expect(track).toBe(null)
  })
})
