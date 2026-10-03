/**
 * Unit tests for getMenuItemIndustryPackMap (v930 pack-grouped sidebar menu).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Each table gets its own queued list of {data, error} results, consumed in call order.
// A chain object supports select/eq/order/in/maybeSingle (all return itself) and is thenable,
// resolving to the next queued result for that table when awaited.
const tableResults = new Map()

function queueResult(table, result) {
  if (!tableResults.has(table)) tableResults.set(table, [])
  tableResults.get(table).push(result)
}

function makeChain(table) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    maybeSingle: () => chain,
    then: (resolve) => {
      const queue = tableResults.get(table) || []
      const result = queue.shift() || { data: null, error: null }
      return Promise.resolve(result).then(resolve)
    },
  }
  return chain
}

const mockFrom = vi.fn((table) => makeChain(table))

vi.mock('../supabase/supabaseClient', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import { getMenuItemIndustryPackMap, getProjectIndustryCategoryIds } from '../organisationIndustryService'

describe('getMenuItemIndustryPackMap (v930)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults.clear()
  })

  it('returns empty sections/map when no account id is given', async () => {
    const result = await getMenuItemIndustryPackMap(null)
    expect(result).toEqual({ success: true, data: { sections: [], menuCodeToPack: new Map() }, error: null })
  })

  it('returns empty when the account has no industries selected', async () => {
    queueResult('account_industries', { data: [], error: null })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })

    const result = await getMenuItemIndustryPackMap('acct-1')
    expect(result.success).toBe(true)
    expect(result.data.sections).toEqual([])
    expect(result.data.menuCodeToPack.size).toBe(0)
  })

  it('excludes Cross-Industry from sections — Cross-Industry-only account returns empty', async () => {
    queueResult('account_industries', {
      data: [{ industry_category_id: 'cross-industry-id', is_primary: true }],
      error: null,
    })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })

    const result = await getMenuItemIndustryPackMap('acct-1')
    expect(result.data.sections).toEqual([])
  })

  it('builds one section for one real industry, keyed by menu_code', async () => {
    queueResult('account_industries', {
      data: [{ industry_category_id: 'banking-id', is_primary: true }],
      error: null,
    })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queueResult('industry_packs', {
      data: [{ id: 'banking-pack-id', industry_category_id: 'banking-id', pack_name: 'Banking' }],
      error: null,
    })
    queueResult('industry_pack_menu_items', {
      data: [
        { industry_pack_id: 'banking-pack-id', menu_items: { menu_code: 'pmo_banking_reg_filings' } },
      ],
      error: null,
    })

    const result = await getMenuItemIndustryPackMap('acct-1')
    expect(result.success).toBe(true)
    expect(result.data.sections).toEqual([
      { packId: 'banking-pack-id', industryCategoryId: 'banking-id', packName: 'Banking', isPrimary: true },
    ])
    expect(result.data.menuCodeToPack.get('pmo_banking_reg_filings')).toBe('banking-pack-id')
  })

  it('orders sections primary-first for a multi-industry account', async () => {
    queueResult('account_industries', {
      data: [
        { industry_category_id: 'banking-id', is_primary: true },
        { industry_category_id: 'construction-id', is_primary: false },
      ],
      error: null,
    })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queueResult('industry_packs', {
      data: [
        { id: 'construction-pack-id', industry_category_id: 'construction-id', pack_name: 'Construction' },
        { id: 'banking-pack-id', industry_category_id: 'banking-id', pack_name: 'Banking' },
      ],
      error: null,
    })
    queueResult('industry_pack_menu_items', { data: [], error: null })

    const result = await getMenuItemIndustryPackMap('acct-1')
    expect(result.data.sections.map((s) => s.packName)).toEqual(['Banking', 'Construction'])
    expect(result.data.sections[0].isPrimary).toBe(true)
    expect(result.data.sections[1].isPrimary).toBe(false)
  })

  it('surfaces errors without throwing', async () => {
    queueResult('account_industries', { data: null, error: { message: 'boom' } })
    queueResult('industry_categories', { data: null, error: null })

    const result = await getMenuItemIndustryPackMap('acct-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })
})

describe('getProjectIndustryCategoryIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults.clear()
  })

  it('uses project_industries when the project has rows', async () => {
    queueResult('project_industries', {
      data: [
        { industry_category_id: 'ind-a' },
        { industry_category_id: 'ind-b' },
      ],
      error: null,
    })

    const result = await getProjectIndustryCategoryIds('proj-1')
    expect(result).toEqual({ success: true, data: ['ind-a', 'ind-b'], error: null })
  })

  it('falls back to projects.industry_category_id when the junction is empty', async () => {
    queueResult('project_industries', { data: [], error: null })
    queueResult('projects', { data: { industry_category_id: 'ind-a' }, error: null })

    const result = await getProjectIndustryCategoryIds('proj-1')
    expect(result).toEqual({ success: true, data: ['ind-a'], error: null })
  })

  it('falls back to the project column when the junction query fails', async () => {
    queueResult('project_industries', { data: null, error: { message: 'relation does not exist' } })
    queueResult('projects', { data: { industry_category_id: 'ind-a' }, error: null })

    const result = await getProjectIndustryCategoryIds('proj-1')
    expect(result).toEqual({ success: true, data: ['ind-a'], error: null })
  })

  it('returns an empty list when neither source has an industry', async () => {
    queueResult('project_industries', { data: [], error: null })
    queueResult('projects', { data: { industry_category_id: null }, error: null })

    const result = await getProjectIndustryCategoryIds('proj-1')
    expect(result).toEqual({ success: true, data: [], error: null })
  })
})
