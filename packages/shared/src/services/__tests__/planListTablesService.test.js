import { describe, it, expect, vi } from 'vitest'
import {
  planListConfig, rowsFromLegacyJson, splitPlanLists, toDbRows, savePlanLists, loadPlanLists,
} from '../planListTablesService.js'

describe('rowsFromLegacyJson — old JSON values still show as rows', () => {
  const risks = planListConfig('project', 'key_risks')
  const budget = planListConfig('stage', 'budget_breakdown')
  const resources = planListConfig('stage', 'resource_allocation')

  it('reads arrays of objects through column aliases', () => {
    expect(rowsFromLegacyJson(risks, [{ risk: 'Late delivery', rating: 'High', mitigation: 'Second supplier' }]))
      .toEqual([{ risk_title: 'Late delivery', impact: 'High', owner: '', response: 'Second supplier' }])
  })

  it('reads arrays of text as the first column', () => {
    expect(rowsFromLegacyJson(planListConfig('project', 'quality_gates'), ['Design sign-off']))
      .toEqual([{ gate_name: 'Design sign-off', gate_date: '', criteria: '' }])
  })

  it('reads { key: amount } maps as category + amount', () => {
    expect(rowsFromLegacyJson(budget, { staff: 400000, suppliers: 650000 })).toEqual([
      { category: 'staff', amount: '400000', notes: '' },
      { category: 'suppliers', amount: '650000', notes: '' },
    ])
  })

  it('reads { key: object } maps with the key as the work package', () => {
    expect(rowsFromLegacyJson(resources, { wp1: { resource_id: 'Trainer', allocation: '50%' } }))
      .toEqual([{ work_package: 'wp1', resource: 'Trainer', allocation: '50%' }])
  })

  it('accepts JSON text and ignores empty or invalid values', () => {
    expect(rowsFromLegacyJson(risks, '[{"risk_title":"A"}]')).toHaveLength(1)
    expect(rowsFromLegacyJson(risks, 'not json')).toEqual([])
    expect(rowsFromLegacyJson(risks, null)).toEqual([])
    expect(rowsFromLegacyJson(risks, [{}])).toEqual([])
  })
})

describe('splitPlanLists / toDbRows', () => {
  it('takes the list keys out of the plan payload', () => {
    const { plan, lists } = splitPlanLists('stage', { plan_title: 'Stage 2', key_risks: [{ risk_title: 'X' }], dependencies: [] })
    expect(plan).toEqual({ plan_title: 'Stage 2' })
    expect(Object.keys(lists)).toEqual(['key_risks', 'dependencies'])
  })

  it('leaves lists that were not in the payload alone', () => {
    expect(splitPlanLists('project', { plan_title: 'P' }).lists).toEqual({})
  })

  it('adds the parent id and order, parses amounts and drops blank rows', () => {
    expect(toDbRows('project', 'budget_breakdown', 'p1', [
      { category: 'Staff', amount: '1,200.50', notes: '' },
      { category: '', amount: '', notes: '' },
    ])).toEqual([{ project_plan_id: 'p1', sort_order: 1, category: 'Staff', amount: 1200.5, notes: null }])
  })
})

describe('savePlanLists / loadPlanLists', () => {
  const chain = (result) => {
    const q = { delete: vi.fn(() => q), eq: vi.fn(() => q), insert: vi.fn(() => Promise.resolve(result)), select: vi.fn(() => q), order: vi.fn(() => Promise.resolve(result)), then: (r) => Promise.resolve(result).then(r) }
    return q
  }

  it('replaces the rows of each list given', async () => {
    const q = chain({ error: null, data: [] })
    const db = { from: vi.fn(() => q) }
    await savePlanLists(db, 'stage', 's1', { dependencies: [{ dependency: 'Racking delivered', dependency_type: 'External', notes: '' }] })
    expect(db.from).toHaveBeenCalledWith('stage_plan_dependencies')
    expect(q.delete).toHaveBeenCalled()
    expect(q.insert).toHaveBeenCalledWith([{ stage_plan_id: 's1', sort_order: 1, dependency: 'Racking delivered', dependency_type: 'External', notes: null }])
  })

  it('loads every list of a plan in order', async () => {
    const db = { from: vi.fn(() => chain({ error: null, data: [{ id: 'x', gate_name: 'Pilot exit', gate_date: '2027-03-01', criteria: null }] })) }
    const lists = await loadPlanLists(db, 'project', 'p1')
    expect(Object.keys(lists)).toEqual(['key_risks', 'quality_gates', 'budget_breakdown'])
    expect(lists.quality_gates).toEqual([{ gate_name: 'Pilot exit', gate_date: '2027-03-01', criteria: '' }])
  })
})
