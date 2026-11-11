import { describe, it, expect } from 'vitest'
import { groupRegisterFields, buildRegisterTabs, isFieldVisible, DETAILS_TAB, AUDIT_TAB, CUSTOM_FIELDS_TAB } from '../registerFieldGroups'

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

describe('conditional fields (visible_when, v1346)', () => {
  const cloud = { field: 'hosting_model', in: ['cloud', 'hybrid'] }
  const nonCloud = { field: 'hosting_model', in: ['on_premise', 'hybrid'] }
  const fields = [
    { field_key: 'hosting_model' },
    { field_key: 'site', visible_when: nonCloud },
    { field_key: 'cloud_provider', field_group: 'Cloud Setup', visible_when: cloud },
    { field_key: 'cpu_cores', field_group: 'Infrastructure', visible_when: nonCloud },
    { field_key: 'host_name', field_group: 'Connection Details', visible_when: nonCloud },
    { field_key: 'https_port', field_group: 'Connection Details' },
  ]
  const keys = ({ detailsFields, groups }) => ({
    details: detailsFields.map((f) => f.field_key),
    tabs: groups.map((g) => [g.label, g.fields.map((f) => f.field_key)]),
  })

  it('shows a field only while the controlling value matches (any value of a multi-select)', () => {
    expect(isFieldVisible({ field_key: 'x' }, {})).toBe(true)
    expect(isFieldVisible({ visible_when: cloud }, { hosting_model: 'cloud' })).toBe(true)
    expect(isFieldVisible({ visible_when: cloud }, { hosting_model: 'on_premise' })).toBe(false)
    expect(isFieldVisible({ visible_when: cloud }, {})).toBe(false)
    expect(isFieldVisible({ visible_when: cloud }, { hosting_model: ['on_premise', 'cloud'] })).toBe(true)
  })

  it('drops hidden fields and the tabs they leave empty', () => {
    expect(keys(groupRegisterFields(fields, { hosting_model: 'cloud' }))).toEqual({
      details: ['hosting_model'],
      tabs: [['Cloud Setup', ['cloud_provider']], ['Connection Details', ['https_port']]],
    })
    expect(keys(groupRegisterFields(fields, { hosting_model: 'on_premise' }))).toEqual({
      details: ['hosting_model', 'site'],
      tabs: [['Infrastructure', ['cpu_cores']], ['Connection Details', ['host_name', 'https_port']]],
    })
    expect(keys(groupRegisterFields(fields, {})).tabs).toEqual([['Connection Details', ['https_port']]])
  })

  it('shows every field when no values are given (register definition views)', () => {
    expect(groupRegisterFields(fields).groups.map((g) => g.label)).toEqual(['Cloud Setup', 'Infrastructure', 'Connection Details'])
  })
})
