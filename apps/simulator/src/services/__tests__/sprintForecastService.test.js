import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { computeSprintForecast } from '../sprintForecastService'

function chainResult(sprintsData, storiesData) {
  mockFrom.mockImplementation((table) => {
    if (table === 'sprints') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: sprintsData, error: null }),
            }),
          }),
        }),
      }
    }
    if (table === 'user_stories') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                neq: () => Promise.resolve({ data: storiesData, error: null }),
              }),
            }),
          }),
        }),
      }
    }
    return {}
  })
}

describe('computeSprintForecast', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('computes avg velocity and sprints remaining', async () => {
    chainResult(
      [
        { status: 'completed', velocity: 10, completed_story_points: 10 },
        { status: 'completed', velocity: 12, completed_story_points: 12 },
        { status: 'completed', velocity: 8, completed_story_points: 8 },
      ],
      [{ story_points: 5 }, { story_points: 7 }],
    )
    const r = await computeSprintForecast('p1', { lastNSprints: 3 })
    expect(r.avgVelocity).toBe(10)
    expect(r.remainingPoints).toBe(12)
    expect(r.sprintsRemaining).toBe(2)
  })
})
