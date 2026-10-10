import { describe, it, expect, vi } from 'vitest'
import { uniqueObjectiveReviews } from '../eprObjectivesReviewService'

vi.mock('../supabaseClient', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))

describe('uniqueObjectiveReviews', () => {
  it('keeps the first row for each objective area', () => {
    const rows = uniqueObjectiveReviews([
      { id: '1', objective_area: 'time', performance_rating: 'met' },
      { id: '2', objective_area: 'cost', performance_rating: 'met' },
      { id: '3', objective_area: 'time', performance_rating: 'exceeded' },
      { id: '4', objective_area: 'scope', performance_rating: 'met' },
    ])

    expect(rows.map((row) => row.id)).toEqual(['1', '2', '4'])
  })
})
