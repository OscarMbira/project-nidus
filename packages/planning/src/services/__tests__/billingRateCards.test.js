/** v1359 (B2, B9) — rate-card dates and roles reach the rate engine. */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: {}, simDb: {} }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({ getCurrentUserAccountId: async () => null }))
vi.mock('@nidus/shared/services/regionalFormatSettingsService', () => ({ loadResolvedRegionalFormatSettings: async () => null }))

const { cardLinesWithDates, groupCardsByScope } = await import('../billingData.js')
const { resolveRate } = await import('../../engine/billing.js')

const scopeOf = (card) => card.scope

describe('rate cards by date and role', () => {
  it('gives every line its card dates', () => {
    const lines = cardLinesWithDates({ effective_from: '2027-01-01', effective_to: null, rate_card_lines: [{ rate: 160 }] })
    expect(lines[0]).toMatchObject({ rate: 160, effective_from: '2027-01-01', effective_to: null })
  })

  it('uses this year\'s card before its end date and next year\'s card after its start date', () => {
    const cards = groupCardsByScope([
      { scope: 'organisation', effective_from: '2026-01-01', effective_to: '2026-12-31', rate_card_lines: [{ work_category: 'design', unit: 'hour', rate: 150 }] },
      { scope: 'organisation', effective_from: '2027-01-01', effective_to: null, rate_card_lines: [{ work_category: 'design', unit: 'hour', rate: 165 }] },
    ], scopeOf)
    expect(cards).toHaveLength(1)
    expect(resolveRate({ workCategory: 'design', onDate: '2026-11-30', cards })?.rate).toBe(150)
    expect(resolveRate({ workCategory: 'design', onDate: '2027-02-01', cards })?.rate).toBe(165)
    expect(resolveRate({ workCategory: 'design', onDate: '2025-06-01', cards })).toBeNull()
  })

  it('applies a role line when the person has that role, and a person line before either', () => {
    const cards = groupCardsByScope([
      { scope: 'client', effective_from: '2026-01-01', rate_card_lines: [{ role_name: 'project_manager', unit: 'hour', rate: 140 }, { unit: 'hour', rate: 100 }] },
      { scope: 'project', effective_from: '2026-01-01', rate_card_lines: [{ user_id: 'u-lead', unit: 'hour', rate: 200 }] },
    ], scopeOf)
    expect(resolveRate({ personId: 'u-pm', role: 'project_manager', onDate: '2026-06-01', cards })?.rate).toBe(140)
    expect(resolveRate({ personId: 'u-dev', role: 'team_member', onDate: '2026-06-01', cards })?.rate).toBe(100)
    expect(resolveRate({ personId: 'u-lead', role: 'project_manager', onDate: '2026-06-01', cards })?.rate).toBe(200)
  })
})
