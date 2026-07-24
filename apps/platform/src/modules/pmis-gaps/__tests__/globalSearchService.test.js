import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: vi.fn() },
  },
  simDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: vi.fn() },
  },
}))

import { searchGlobal, entityRoute } from '../services/globalSearchService'

function chain(resolved) {
  const chainObj = {
    select: vi.fn(() => chainObj),
    or: vi.fn(() => chainObj),
    ilike: vi.fn(() => chainObj),
    eq: vi.fn(() => chainObj),
    not: vi.fn(() => chainObj),
    order: vi.fn(() => chainObj),
    limit: vi.fn(() => Promise.resolve(resolved)),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }
  return chainObj
}

describe('globalSearchService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('entityRoute maps known entity types', () => {
    expect(entityRoute('project', 'abc')).toBe('/platform/projects/abc')
    expect(entityRoute('task', 't1')).toBe('/platform/tasks/t1')
    expect(entityRoute('unknown', 'x')).toBe('/platform/dashboard')
  })

  it('searchGlobal returns empty for blank query', async () => {
    const result = await searchGlobal('')
    expect(result.results).toEqual([])
    expect(result.categories).toEqual({})
  })

  it('searchGlobal uses search_index when available', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'search_index') {
        return chain({
          data: [
            {
              entity_type: 'project',
              entity_id: 'p1',
              title: 'Alpha Project',
              keywords: 'alpha',
              project_id: null,
            },
          ],
          error: null,
        })
      }
      return chain({ data: [], error: null })
    })

    const { results } = await searchGlobal('alpha')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Alpha Project')
  })
})
