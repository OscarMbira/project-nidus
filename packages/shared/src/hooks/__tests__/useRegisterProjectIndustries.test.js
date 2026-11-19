import { describe, it, expect, vi, beforeEach } from 'vitest'

const menuContext = vi.fn()
vi.mock('../../utils/consolidatedMenuData', () => ({ loadProjectMenuContext: (...a) => menuContext(...a) }))
const CATEGORIES = [
  { id: 'ind-fin', name: 'Banking & Financial Services' },
  { id: 'ind-con', name: 'Construction & Engineering' },
]
const inCalls = []
vi.mock('@nidus/supabase', () => ({
  platformDb: {
    from: () => ({
      select: () => ({
        in: (col, ids) => {
          inCalls.push(ids)
          return Promise.resolve({ data: CATEGORIES.filter((c) => ids.includes(c.id)), error: null })
        },
      }),
    }),
  },
}))

const { loadRegisterProjectIndustries, clearRegisterProjectIndustries } = await import('../useRegisterProjectIndustries.js')

beforeEach(() => {
  clearRegisterProjectIndustries()
  menuContext.mockReset()
  inCalls.length = 0
})

describe('loadRegisterProjectIndustries (v1342)', () => {
  it('returns the industry names of the project, per app', async () => {
    menuContext.mockResolvedValue({ industries: [{ industry_category_id: 'ind-fin' }, { industry_category_id: 'ind-con' }] })
    expect(await loadRegisterProjectIndustries('simulator', 'p1')).toEqual(['Banking & Financial Services', 'Construction & Engineering'])
    expect(menuContext).toHaveBeenCalledWith('simulator', 'p1')
  })

  it('no project or no industry → no names', async () => {
    expect(await loadRegisterProjectIndustries('platform', null)).toEqual([])
    menuContext.mockResolvedValue({ industries: [] })
    expect(await loadRegisterProjectIndustries('platform', 'p2')).toEqual([])
    expect(inCalls).toHaveLength(0)
  })

  it('caches per project until cleared', async () => {
    menuContext.mockResolvedValue({ industries: [{ industry_category_id: 'ind-fin' }] })
    await loadRegisterProjectIndustries('platform', 'p3')
    await loadRegisterProjectIndustries('platform', 'p3')
    expect(menuContext).toHaveBeenCalledTimes(1)
    clearRegisterProjectIndustries()
    await loadRegisterProjectIndustries('platform', 'p3')
    expect(menuContext).toHaveBeenCalledTimes(2)
  })

  it('the planner app reads like the Platform', async () => {
    menuContext.mockResolvedValue({ industries: [] })
    await loadRegisterProjectIndustries('planner', 'p4')
    expect(menuContext).toHaveBeenCalledWith('platform', 'p4')
  })
})
