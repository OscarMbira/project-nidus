import { describe, it, expect } from 'vitest'
import {
  applySchemaFieldOverrides,
  applyTieredSchemaFieldOverrides,
  buildFieldOverrideMap,
  getFieldLabelForOrg,
  getFieldTypeForOrg,
  isFieldEnabledForOrg,
  isFieldRequiredForOrg,
  listCatalogFields,
  mergeOverrideChain,
} from '../formTemplateFieldOverrides.js'

describe('formTemplateFieldOverrides', () => {
  const schema = {
    title: 'Test',
    sections: [
      {
        key: 'general',
        title: 'General',
        fields: [
          { key: 'a', label: 'A', type: 'text' },
          { key: 'b', label: 'B', type: 'text', required: true },
        ],
      },
    ],
  }

  it('buildFieldOverrideMap defaults missing keys to enabled via isFieldEnabledForOrg', () => {
    const map = buildFieldOverrideMap([
      { section_key: 'general', field_key: 'b', is_enabled: false },
    ])
    expect(isFieldEnabledForOrg(map, 'general', 'a')).toBe(true)
    expect(isFieldEnabledForOrg(map, 'general', 'b')).toBe(false)
  })

  it('applySchemaFieldOverrides removes disabled fields', () => {
    const map = buildFieldOverrideMap([
      { section_key: 'general', field_key: 'b', is_enabled: false },
    ])
    const filtered = applySchemaFieldOverrides(schema, map)
    expect(filtered.sections[0].fields.map((f) => f.key)).toEqual(['a'])
  })

  it('listCatalogFields returns flat field list', () => {
    const list = listCatalogFields(schema)
    expect(list).toHaveLength(2)
    expect(list[0].fieldKey).toBe('a')
  })

  describe('required override', () => {
    it('isFieldRequiredForOrg falls back to baseRequired when no override row exists', () => {
      const map = buildFieldOverrideMap([])
      expect(isFieldRequiredForOrg(map, 'general', 'b', true)).toBe(true)
      expect(isFieldRequiredForOrg(map, 'general', 'a', false)).toBe(false)
    })

    it('isFieldRequiredForOrg falls back to baseRequired when override row has is_required = null', () => {
      const map = buildFieldOverrideMap([{ section_key: 'general', field_key: 'b', is_required: null }])
      expect(isFieldRequiredForOrg(map, 'general', 'b', true)).toBe(true)
    })

    it('isFieldRequiredForOrg honours an explicit override over baseRequired', () => {
      const map = buildFieldOverrideMap([{ section_key: 'general', field_key: 'b', is_required: false }])
      expect(isFieldRequiredForOrg(map, 'general', 'b', true)).toBe(false)

      const map2 = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      expect(isFieldRequiredForOrg(map2, 'general', 'a', false)).toBe(true)
    })

    it('applySchemaFieldOverrides merges the effective required flag onto surviving fields', () => {
      const map = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', is_required: true },
        { section_key: 'general', field_key: 'b', is_required: false },
      ])
      const merged = applySchemaFieldOverrides(schema, map)
      const byKey = Object.fromEntries(merged.sections[0].fields.map((f) => [f.key, f]))
      expect(byKey.a.required).toBe(true)
      expect(byKey.b.required).toBe(false)
    })
  })

  describe('org-added local fields', () => {
    const additions = [
      {
        section_key: 'general',
        field_key: 'custom_note',
        field_definition: { key: 'custom_note', label: 'Custom Note', type: 'text', required: true },
      },
    ]

    it('appends local fields to their section, after the master fields, tagged is_local', () => {
      const merged = applySchemaFieldOverrides(schema, new Map(), additions)
      const keys = merged.sections[0].fields.map((f) => f.key)
      expect(keys).toEqual(['a', 'b', 'custom_note'])
      expect(merged.sections[0].fields[2].is_local).toBe(true)
    })

    it('a local field is dropped when disabled via the same override map used for master fields', () => {
      const map = buildFieldOverrideMap([{ section_key: 'general', field_key: 'custom_note', is_enabled: false }])
      const merged = applySchemaFieldOverrides(schema, map, additions)
      const keys = merged.sections[0].fields.map((f) => f.key)
      expect(keys).toEqual(['a', 'b'])
    })

    it('an addition targeting a non-existent section is silently skipped, not errored', () => {
      const orphan = [{ section_key: 'missing', field_key: 'x', field_definition: { key: 'x', label: 'X', type: 'text' } }]
      expect(() => applySchemaFieldOverrides(schema, new Map(), orphan)).not.toThrow()
    })
  })

  describe('mergeOverrideChain (Phase 5 tiered ratchet)', () => {
    it('with no overrides anywhere, a field stays at its base state', () => {
      const merged = mergeOverrideChain([buildFieldOverrideMap([]), buildFieldOverrideMap([])])
      expect(merged.get('general::b')).toBeUndefined()
    })

    it('a descendant tier can disable a field while it is not required', () => {
      const org = buildFieldOverrideMap([])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: false }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a')).toEqual({
        enabled: false, required: null, label: null, type: null, options: null, minLength: null, maxLength: null,
      })
    })

    it('once an ancestor requires a field, a descendant cannot disable it', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: false }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a')).toEqual({
        enabled: true, required: true, label: null, type: null, options: null, minLength: null, maxLength: null,
      })
    })

    it('once an ancestor requires a field, a descendant cannot un-require it', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: false }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a').required).toBe(true)
    })

    it('a descendant tier can still make an optional field required (tightening is always allowed)', () => {
      const org = buildFieldOverrideMap([])
      const programme = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const merged = mergeOverrideChain([org, programme])
      expect(merged.get('general::a').required).toBe(true)
    })

    it('a descendant tier can re-enable a field an ancestor disabled (only required is one-way)', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: false }])
      const project = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: true }])
      const merged = mergeOverrideChain([org, project])
      expect(merged.get('general::a').enabled).toBe(true)
    })

    it('three-tier chain: org requires, portfolio cannot loosen, project adds a required field of its own', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const portfolio = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', is_enabled: false },
        { section_key: 'general', field_key: 'b', is_required: false },
      ])
      const project = buildFieldOverrideMap([{ section_key: 'general', field_key: 'b', is_required: true }])
      const merged = mergeOverrideChain([org, portfolio, project])
      expect(merged.get('general::a')).toEqual({
        enabled: true, required: true, label: null, type: null, options: null, minLength: null, maxLength: null,
      })
      expect(merged.get('general::b').required).toBe(true)
    })
  })

  describe('label/type override (v815)', () => {
    it('getFieldLabelForOrg falls back to baseLabel when no override row exists', () => {
      const map = buildFieldOverrideMap([])
      expect(getFieldLabelForOrg(map, 'general', 'a', 'A')).toBe('A')
    })

    it('getFieldLabelForOrg honours an explicit label override', () => {
      const map = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', label_override: 'Impediment ID' }])
      expect(getFieldLabelForOrg(map, 'general', 'a', 'A')).toBe('Impediment ID')
    })

    it('getFieldTypeForOrg falls back to baseType/baseOptions when no override row exists', () => {
      const map = buildFieldOverrideMap([])
      expect(getFieldTypeForOrg(map, 'general', 'a', 'text', undefined)).toEqual({ type: 'text', options: undefined })
    })

    it('getFieldTypeForOrg honours an explicit type override', () => {
      const map = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', field_type_override: 'date' }])
      expect(getFieldTypeForOrg(map, 'general', 'a', 'text', undefined)).toEqual({ type: 'date', options: undefined })
    })

    it('getFieldTypeForOrg carries options_override when overriding to select', () => {
      const map = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', field_type_override: 'select', options_override: ['Open', 'Closed'] },
      ])
      expect(getFieldTypeForOrg(map, 'general', 'a', 'text', undefined)).toEqual({ type: 'select', options: ['Open', 'Closed'] })
    })

    it('applySchemaFieldOverrides merges effective label and type onto surviving fields', () => {
      const map = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', label_override: 'Impediment ID' },
        { section_key: 'general', field_key: 'b', field_type_override: 'date' },
      ])
      const merged = applySchemaFieldOverrides(schema, map)
      const byKey = Object.fromEntries(merged.sections[0].fields.map((f) => [f.key, f]))
      expect(byKey.a.label).toBe('Impediment ID')
      expect(byKey.b.type).toBe('date')
    })

    it('mergeOverrideChain: closest (leaf-most) non-null tier wins for label/type — no ratchet', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', label_override: 'Org Label' }])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', label_override: 'Portfolio Label' }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a').label).toBe('Portfolio Label')
    })

    it('mergeOverrideChain: a descendant tier can freely revert to an ancestor by leaving its own override null', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', field_type_override: 'date' }])
      const portfolio = buildFieldOverrideMap([])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a').type).toBe('date')
    })

    it('mergeOverrideChain: switching type away from select drops stale options from an earlier tier', () => {
      const org = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', field_type_override: 'select', options_override: ['Open', 'Closed'] },
      ])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', field_type_override: 'text' }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a')).toEqual({
        enabled: true, required: null, label: null, type: 'text', options: null, minLength: null, maxLength: null,
      })
    })

    it('applyTieredSchemaFieldOverrides applies the merged label/type onto the schema', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', label_override: 'Org Label' }])
      const project = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', field_type_override: 'date' }])
      const merged = applyTieredSchemaFieldOverrides(schema, [org, project], [])
      const fieldA = merged.sections[0].fields.find((f) => f.key === 'a')
      expect(fieldA.label).toBe('Org Label')
      expect(fieldA.type).toBe('date')
    })

    it('listCatalogFields exposes baseType/baseOptions alongside baseRequired', () => {
      const list = listCatalogFields(schema)
      expect(list[0].baseType).toBe('text')
      expect(list[0].baseOptions).toBeUndefined()
    })
  })

  describe('applyTieredSchemaFieldOverrides', () => {
    it('merges the chain and applies the ratchet onto the schema', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: false }])
      const merged = applyTieredSchemaFieldOverrides(schema, [org, portfolio], [])
      const fieldA = merged.sections[0].fields.find((f) => f.key === 'a')
      expect(fieldA.required).toBe(true)
    })

    it('appends additions in chain order, tagged with their owning scope', () => {
      const additions = [
        {
          section_key: 'general',
          field_key: 'portfolio_note',
          field_definition: { key: 'portfolio_note', label: 'Portfolio Note', type: 'text' },
          scope_entity_type: 'portfolio',
          scope_entity_id: 'p-1',
        },
        {
          section_key: 'general',
          field_key: 'project_note',
          field_definition: { key: 'project_note', label: 'Project Note', type: 'text' },
          scope_entity_type: 'project',
          scope_entity_id: 'proj-1',
        },
      ]
      const merged = applyTieredSchemaFieldOverrides(schema, [new Map(), new Map()], additions)
      const keys = merged.sections[0].fields.map((f) => f.key)
      expect(keys).toEqual(['a', 'b', 'portfolio_note', 'project_note'])
      const portfolioField = merged.sections[0].fields.find((f) => f.key === 'portfolio_note')
      expect(portfolioField.owner_scope_entity_type).toBe('portfolio')
      expect(portfolioField.owner_scope_entity_id).toBe('p-1')
    })

    it('an org-wide (account-scoped) addition is tagged with a null owner scope', () => {
      const additions = [
        {
          section_key: 'general',
          field_key: 'org_note',
          field_definition: { key: 'org_note', label: 'Org Note', type: 'text' },
          scope_entity_type: 'account',
          scope_entity_id: 'org-1',
        },
      ]
      const merged = applyTieredSchemaFieldOverrides(schema, [new Map()], additions)
      const orgField = merged.sections[0].fields.find((f) => f.key === 'org_note')
      expect(orgField.owner_scope_entity_type).toBeNull()
    })
  })

  describe('min/max length override (v847)', () => {
    it('buildFieldOverrideMap reads min/max length overrides', () => {
      const map = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 5, max_length_override: 100 },
      ])
      expect(map.get('general::a').minLength).toBe(5)
      expect(map.get('general::a').maxLength).toBe(100)
    })

    it('mergeOverrideChain tightens min up and max down across tiers', () => {
      const org = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 5, max_length_override: 100 },
      ])
      const project = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 10, max_length_override: 50 },
      ])
      const merged = mergeOverrideChain([org, project])
      expect(merged.get('general::a').minLength).toBe(10)
      expect(merged.get('general::a').maxLength).toBe(50)
    })

    it('mergeOverrideChain ignores a descendant attempt to loosen (client-side merge still takes tighter)', () => {
      const org = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 10, max_length_override: 50 },
      ])
      const project = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 3, max_length_override: 200 },
      ])
      const merged = mergeOverrideChain([org, project])
      expect(merged.get('general::a').minLength).toBe(10)
      expect(merged.get('general::a').maxLength).toBe(50)
    })

    it('applyTieredSchemaFieldOverrides merges lengths onto fields including master base', () => {
      const schemaWithBase = {
        sections: [{
          key: 'general',
          title: 'General',
          fields: [{ key: 'a', label: 'A', type: 'text', minLength: 2, maxLength: 200 }],
        }],
      }
      const org = buildFieldOverrideMap([
        { section_key: 'general', field_key: 'a', min_length_override: 5, max_length_override: 100 },
      ])
      const merged = applyTieredSchemaFieldOverrides(schemaWithBase, [org], [])
      const fieldA = merged.sections[0].fields.find((f) => f.key === 'a')
      expect(fieldA.minLength).toBe(5)
      expect(fieldA.maxLength).toBe(100)
    })

    it('local addition field_definition lengths survive apply', () => {
      const additions = [{
        section_key: 'general',
        field_key: 'note',
        field_definition: { key: 'note', label: 'Note', type: 'textarea', minLength: 10, maxLength: 500 },
      }]
      const merged = applySchemaFieldOverrides(schema, new Map(), additions)
      const note = merged.sections[0].fields.find((f) => f.key === 'note')
      expect(note.minLength).toBe(10)
      expect(note.maxLength).toBe(500)
    })
  })
})
