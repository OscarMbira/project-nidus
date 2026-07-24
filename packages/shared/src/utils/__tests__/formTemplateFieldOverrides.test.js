import { describe, it, expect } from 'vitest'
import {
  applySchemaFieldOverrides,
  applyTieredSchemaFieldOverrides,
  buildFieldOverrideMap,
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
      expect(merged.get('general::a')).toEqual({ enabled: false, required: null })
    })

    it('once an ancestor requires a field, a descendant cannot disable it', () => {
      const org = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_required: true }])
      const portfolio = buildFieldOverrideMap([{ section_key: 'general', field_key: 'a', is_enabled: false }])
      const merged = mergeOverrideChain([org, portfolio])
      expect(merged.get('general::a')).toEqual({ enabled: true, required: true })
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
      expect(merged.get('general::a')).toEqual({ enabled: true, required: true })
      expect(merged.get('general::b').required).toBe(true)
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
})
