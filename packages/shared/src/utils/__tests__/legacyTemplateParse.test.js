import { describe, expect, it } from 'vitest'
import {
  suggestColumnMapping,
  scheduleRowsToBundle,
  validateScheduleBundle,
  validateStructuredListRows,
  sheetNameToRaidItemType,
  slugIndustryCode,
  LIST_TYPE_FIELDS,
} from '../legacyTemplateParse.js'

describe('legacyTemplateParse', () => {
  it('suggests schedule column mapping from aliases', () => {
    const mapping = suggestColumnMapping(
      ['Phase', 'Activity', 'Duration', 'Resource'],
      ['phase_name', 'activity_name', 'typical_duration', 'resource_type'],
    )
    expect(mapping.Phase).toBe('phase_name')
    expect(mapping.Activity).toBe('activity_name')
    expect(mapping.Duration).toBe('typical_duration')
    expect(mapping.Resource).toBe('resource_type')
  })

  it('builds a schedule bundle from mapped rows', () => {
    const rows = [
      {
        phase_name: 'Discovery',
        activity_name: 'Kick-off',
        typical_duration: '2d',
        resource_type: 'PM',
      },
      {
        phase_name: 'Discovery',
        milestone_name: 'Approved',
        typical_duration: '1d',
      },
    ]
    const bundle = scheduleRowsToBundle(rows)
    expect(bundle.phases).toHaveLength(1)
    expect(bundle.activities).toHaveLength(1)
    expect(bundle.milestones).toHaveLength(1)
    expect(validateScheduleBundle(bundle).valid).toBe(true)
  })

  it('validates structured list rows per type', () => {
    const ok = validateStructuredListRows('risk_register', [
      { title: 'Scope creep', likelihood: 'high', impact: 'high' },
    ])
    expect(ok.valid).toBe(true)
    expect(ok.validRows).toHaveLength(1)

    const bad = validateStructuredListRows('budget', [{ notes: 'missing line' }])
    expect(bad.valid).toBe(false)
  })

  it('maps RAID sheet names to item_type', () => {
    expect(sheetNameToRaidItemType('Risks')).toBe('risk')
    expect(sheetNameToRaidItemType('Assumptions')).toBe('assumption')
    expect(sheetNameToRaidItemType('Issues Log')).toBe('issue')
    expect(sheetNameToRaidItemType('Dependencies')).toBe('dependency')
  })

  it('exposes canonical fields for each list type', () => {
    expect(LIST_TYPE_FIELDS.raid_log).toContain('item_type')
    expect(LIST_TYPE_FIELDS.stakeholder_register).toContain('stakeholder_name')
  })

  it('slugs industry codes', () => {
    expect(slugIndustryCode('My Schedule!')).toMatch(/^my_schedule_/)
  })
})
