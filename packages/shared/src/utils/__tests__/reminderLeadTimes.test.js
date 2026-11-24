import { describe, expect, it } from 'vitest'
import { countOverrides, effectiveLeadDays, leadDaysError, leadTimeChanges, leadTimeFormFromItems } from '../reminderLeadTimes'

const items = [
  { record_type: 'risk_review', label: 'Risk reviews', default_lead_days: 3, lead_days: null },
  { record_type: 'milestone_due', label: 'Milestones', default_lead_days: 7, lead_days: 10 },
]

describe('reminderLeadTimes', () => {
  it('builds the form: empty for the default, the override as text', () => {
    expect(leadTimeFormFromItems(items)).toEqual({ risk_review: '', milestone_due: '10' })
    expect(leadTimeFormFromItems(null)).toEqual({})
  })

  it('validates whole days from 0 to 365, empty allowed', () => {
    expect(leadDaysError('')).toBeNull()
    expect(leadDaysError('0')).toBeNull()
    expect(leadDaysError('365')).toBeNull()
    expect(leadDaysError('366')).toMatch(/365/)
    expect(leadDaysError('2.5')).toMatch(/whole days/)
    expect(leadDaysError('-1')).toMatch(/whole days/)
  })

  it('returns only changed types, with null meaning back to the default', () => {
    expect(leadTimeChanges(items, { risk_review: '', milestone_due: '10' })).toEqual([])
    expect(leadTimeChanges(items, { risk_review: '5', milestone_due: '' })).toEqual([
      { record_type: 'risk_review', lead_days: 5 },
      { record_type: 'milestone_due', lead_days: null },
    ])
    expect(leadTimeChanges(items, { unknown_type: '4' })).toEqual([])
  })

  it('shows the lead time in force and counts overrides', () => {
    expect(effectiveLeadDays(items[0], '')).toBe(3)
    expect(effectiveLeadDays(items[0], '1')).toBe(1)
    expect(effectiveLeadDays(items[1], 'x')).toBe(7)
    expect(countOverrides(items)).toBe(1)
  })
})
