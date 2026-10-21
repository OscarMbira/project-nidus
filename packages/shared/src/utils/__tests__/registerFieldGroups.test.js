import { describe, it, expect } from 'vitest'
import { groupRegisterFields, buildRegisterTabs, DETAILS_TAB, AUDIT_TAB, CUSTOM_FIELDS_TAB } from '../registerFieldGroups'

describe('groupRegisterFields', () => {
  it('puts ungrouped fields on the Details tab and keeps their order', () => {
    const fields = [{ field_key: 'a' }, { field_key: 'b', field_group: '  ' }, { field_key: 'c', field_group: null }]
    const { detailsFields, groups } = groupRegisterFields(fields)
    expect(detailsFields.map((f) => f.field_key)).toEqual(['a', 'b', 'c'])
    expect(groups).toEqual([])
  })

  it('creates one group per label, ordered by first appearance', () => {
    const fields = [
      { field_key: 'type' },
      { field_key: 'start', field_group: 'Schedule & Progress' },
      { field_key: 'deliv', field_group: 'Deliverables' },
      { field_key: 'rag', field_group: 'Schedule & Progress' },
    ]
    const { detailsFields, groups } = groupRegisterFields(fields)
    expect(detailsFields.map((f) => f.field_key)).toEqual(['type'])
    expect(groups.map((g) => g.label)).toEqual(['Schedule & Progress', 'Deliverables'])
    expect(groups[0].value).toBe('group-schedule-progress')
    expect(groups[0].fields.map((f) => f.field_key)).toEqual(['start', 'rag'])
  })

  it('handles missing input', () => {
    expect(groupRegisterFields(undefined)).toEqual({ detailsFields: [], groups: [] })
  })
})

describe('buildRegisterTabs', () => {
  it('wraps groups between Details and Audit details', () => {
    const tabs = buildRegisterTabs([{ value: 'group-x', label: 'X', fields: [] }])
    expect(tabs).toEqual([
      { value: DETAILS_TAB, label: 'Details' },
      { value: 'group-x', label: 'X' },
      { value: AUDIT_TAB, label: 'Audit details' },
    ])
  })

  it('puts Custom Fields just before Audit details when asked', () => {
    const tabs = buildRegisterTabs([{ value: 'group-x', label: 'X', fields: [] }], { includeCustomFields: true })
    expect(tabs.map((t) => t.value)).toEqual([DETAILS_TAB, 'group-x', CUSTOM_FIELDS_TAB, AUDIT_TAB])
  })
})
