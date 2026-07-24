import { describe, it, expect } from 'vitest'
import {
  normalizeCustomColumnDefs,
  mergeColumnOptsWithCustom,
  wbsColumnOpts,
  formatIndustryPlanCell,
  MAX_CUSTOM_COLUMNS,
  isCustomColumnKey,
} from '../industryPlanGridColumns.js'
import {
  addIndustryPlanCustomColumn,
  updateIndustryPlanCustomColumn,
  deleteIndustryPlanCustomColumn,
} from '../industryPlanCustomColumnOps.js'

describe('industry plan custom columns (v190 Platform/Simulator)', () => {
  it('normalizeCustomColumnDefs caps and assigns stable cf_ ids', () => {
    const defs = normalizeCustomColumnDefs([
      { id: 'cf_abc', label: 'QA pack', type: 'text' },
      { id: 'bad', label: 'X', type: 'number' },
      { label: 'Flag', type: 'yes_no' },
    ])
    expect(defs[0]).toEqual({ id: 'cf_abc', label: 'QA pack', type: 'text' })
    expect(isCustomColumnKey(defs[1].id)).toBe(true)
    expect(defs[1].type).toBe('number')
    expect(defs[2].type).toBe('yes_no')
  })

  it('mergeColumnOptsWithCustom appends custom keys to optional pool', () => {
    const merged = mergeColumnOptsWithCustom(wbsColumnOpts(), [
      { id: 'cf_qa', label: 'QA pack ref', type: 'text' },
    ])
    expect(merged.optionalPool).toContain('cf_qa')
    expect(merged.labels.cf_qa).toBe('QA pack ref')
  })

  it('add / update / delete custom columns and strip values on delete', () => {
    let plan = {
      industry_code: 'CONSTRUCTION',
      ui: { custom_column_defs: [] },
      phases: [{ phase_number: 1, phase_name: 'Init' }],
      activities: [{ activity_name: 'Pour footing', phase_number: 1, custom_fields: {} }],
      deliverables: [],
      risks: [],
      milestones: [],
      roles: [],
    }

    const added = addIndustryPlanCustomColumn(plan, { label: 'QA pack ref', type: 'text' })
    expect(added.ok).toBe(true)
    plan = added.plan
    expect(plan.ui.custom_column_defs).toHaveLength(1)
    expect(plan.activities[0].custom_fields[added.id]).toBe('')

    plan = {
      ...plan,
      activities: [{
        ...plan.activities[0],
        custom_fields: { [added.id]: 'Foundation QA' },
      }],
    }

    const updated = updateIndustryPlanCustomColumn(plan, added.id, { label: 'QA ref', type: 'text' })
    expect(updated.ok).toBe(true)
    expect(updated.plan.ui.custom_column_defs[0].label).toBe('QA ref')

    const deleted = deleteIndustryPlanCustomColumn(updated.plan, added.id)
    expect(deleted.ok).toBe(true)
    expect(deleted.plan.ui.custom_column_defs).toHaveLength(0)
    expect(deleted.plan.activities[0].custom_fields[added.id]).toBeUndefined()
  })

  it('formatIndustryPlanCell renders custom field values', () => {
    const defs = [{ id: 'cf_x', label: 'Flag', type: 'yes_no' }]
    expect(formatIndustryPlanCell('cf_x', {
      row: { custom_fields: { cf_x: true } },
      customDefs: defs,
    })).toBe('Yes')
  })

  it('rejects add beyond MAX_CUSTOM_COLUMNS', () => {
    let plan = {
      ui: { custom_column_defs: [] },
      phases: [{ phase_name: 'P' }],
      activities: [],
      deliverables: [],
      risks: [],
      milestones: [],
      roles: [],
    }
    for (let i = 0; i < MAX_CUSTOM_COLUMNS; i += 1) {
      const r = addIndustryPlanCustomColumn(plan, { label: `C${i}`, type: 'text' })
      expect(r.ok).toBe(true)
      plan = r.plan
    }
    const over = addIndustryPlanCustomColumn(plan, { label: 'Too many', type: 'text' })
    expect(over.ok).toBe(false)
  })
})
