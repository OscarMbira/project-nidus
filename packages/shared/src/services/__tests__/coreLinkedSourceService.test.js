import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls = []
function client(rows) {
  const make = (table) => {
    const q = { table, filters: [] }
    calls.push(q)
    const chain = {
      select: () => chain,
      eq: (col, val) => { q.filters.push(['eq', col, val]); return chain },
      in: (col, val) => { q.filters.push(['in', col, val]); return chain },
      order: () => Promise.resolve({ data: rows, error: null }),
    }
    return chain
  }
  return { from: vi.fn(make) }
}

const platformDb = client([])
vi.mock('@nidus/supabase', () => ({ platformDb }))
vi.mock('../requirementExtrasService', () => ({
  loadRequirementNfrAreas: vi.fn(async () => [{ value: 'performance', label: 'Performance' }]),
}))

const { loadCoreLinkedSource } = await import('../coreLinkedSourceService.js')

const nfr = { field_key: 'nfr', field_type: 'linked_records', dropdown_options: [{ value: 'core:requirements', label: 'Requirements register', category: 'non_functional', group_by: 'nfr_area_key' }] }

describe('loadCoreLinkedSource (v1338 D3)', () => {
  beforeEach(() => { calls.length = 0 })

  it('reads the Simulator table by practice project and groups by area', async () => {
    const simDb = client([{ id: '1', requirement_code: 'NFR-1', name: 'Fast', category: 'non_functional', nfr_area_key: 'performance' }])
    const [data, error] = await loadCoreLinkedSource(simDb, nfr, 'pp-1')
    expect(error).toBeNull()
    expect(calls[0].filters).toEqual(expect.arrayContaining([['eq', 'practice_project_id', 'pp-1'], ['eq', 'category', 'non_functional']]))
    expect(data.blocks.map((b) => b.title)).toEqual(['Performance'])
    expect(data.register.label).toBe('Requirements register')
  })

  it('reads the Platform table by project and filters several categories with in()', async () => {
    const other = { ...nfr, dropdown_options: [{ value: 'core:requirements', category: 'technical,regulatory' }] }
    await loadCoreLinkedSource(platformDb, other, 'p-1')
    expect(calls[0].filters).toEqual(expect.arrayContaining([['eq', 'project_id', 'p-1'], ['in', 'category', ['technical', 'regulatory']]]))
  })

  it('returns no blocks without a project, and an error for an unknown core source', async () => {
    expect((await loadCoreLinkedSource(platformDb, nfr, null))[0].blocks).toEqual([])
    const unknown = { ...nfr, dropdown_options: [{ value: 'core:unknown' }] }
    expect((await loadCoreLinkedSource(platformDb, unknown, 'p-1'))[1]).toMatch(/Unknown linked source/)
  })
})
