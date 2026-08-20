import { describe, it, expect } from 'vitest'
import {
  applyGuidanceToSchema,
  buildDefaultValuesMap,
  buildFieldDefaultMap,
  buildGuidanceValuesMap,
  isEmptyDefaultValue,
  isEmptyGuidanceText,
  listDefaultContentEntries,
  listDefaultEntriesFromValues,
} from '../formTemplateFieldDefaults.js'

describe('formTemplateFieldDefaults', () => {
  const schema = {
    sections: [
      {
        key: 'general',
        fields: [
          { key: 'a', label: 'A', type: 'text' },
          { key: 'b', label: 'B', type: 'text' },
        ],
      },
    ],
  }

  it('detects empty default values without treating false or zero as empty', () => {
    expect(isEmptyDefaultValue(null)).toBe(true)
    expect(isEmptyDefaultValue('')).toBe(true)
    expect(isEmptyDefaultValue('   ')).toBe(true)
    expect(isEmptyDefaultValue([])).toBe(true)
    expect(isEmptyDefaultValue(0)).toBe(false)
    expect(isEmptyDefaultValue(false)).toBe(false)
  })

  it('detects empty guidance text', () => {
    expect(isEmptyGuidanceText(null)).toBe(true)
    expect(isEmptyGuidanceText('')).toBe(true)
    expect(isEmptyGuidanceText('  ')).toBe(true)
    expect(isEmptyGuidanceText('Help')).toBe(false)
  })

  it('builds a default map from non-empty rows', () => {
    const map = buildFieldDefaultMap([
      { section_key: 'general', field_key: 'a', default_value: 'Alpha' },
      { section_key: 'general', field_key: 'b', default_value: '' },
    ])

    expect(map.get('general::a')).toBe('Alpha')
    expect(map.has('general::b')).toBe(false)
  })

  it('builds renderer values only for fields in the supplied schema', () => {
    const values = buildDefaultValuesMap([
      { section_key: 'general', field_key: 'a', default_value: 'Alpha' },
      { section_key: 'general', field_key: 'disabled', default_value: 'Skip me' },
    ], schema)

    expect(values).toEqual({ a: 'Alpha' })
  })

  it('falls back to schema field.sample when no org default exists', () => {
    const withSample = {
      sections: [{
        key: 'general',
        fields: [
          { key: 'a', label: 'A', type: 'text', sample: 'From schema' },
          { key: 'b', label: 'B', type: 'text' },
        ],
      }],
    }
    expect(buildDefaultValuesMap([], withSample)).toEqual({ a: 'From schema' })
    expect(buildDefaultValuesMap([], withSample, { fallbackToSchemaSample: false })).toEqual({})
  })

  it('org default wins over schema sample', () => {
    const withSample = {
      sections: [{
        key: 'general',
        fields: [{ key: 'a', label: 'A', type: 'text', sample: 'Schema' }],
      }],
    }
    expect(buildDefaultValuesMap(
      [{ section_key: 'general', field_key: 'a', default_value: 'Org' }],
      withSample,
    )).toEqual({ a: 'Org' })
  })

  it('leaves fields absent when neither org default nor schema sample exists', () => {
    expect(buildDefaultValuesMap([], schema)).toEqual({})
    expect(buildDefaultValuesMap(
      [{ section_key: 'general', field_key: 'a', default_value: '   ' }],
      schema,
    )).toEqual({})
  })

  it('FormNew-style path: empty org defaults + curated F001 sample pre-fills purpose', () => {
    const f001Like = {
      sections: [{
        key: 'general',
        fields: [
          {
            key: 'purpose',
            label: 'Purpose',
            type: 'long_text',
            sample: 'Implement a unified Digital Workplace Platform…',
            help: 'Summarise why this project exists.',
          },
          { key: 'sponsor', label: 'Sponsor', type: 'text' },
        ],
      }],
    }
    const values = buildDefaultValuesMap([], f001Like)
    const guidance = buildGuidanceValuesMap([], f001Like)
    expect(values).toEqual({ purpose: 'Implement a unified Digital Workplace Platform…' })
    expect(guidance).toEqual({ purpose: 'Summarise why this project exists.' })
    expect(values.sponsor).toBeUndefined()
  })

  it('falls back to schema field.help for guidance when no org guidance exists', () => {
    const withHelp = {
      sections: [{
        key: 'general',
        fields: [
          { key: 'a', label: 'A', type: 'text', help: 'Schema help' },
          { key: 'b', label: 'B', type: 'text' },
        ],
      }],
    }
    expect(buildGuidanceValuesMap([], withHelp)).toEqual({ a: 'Schema help' })
    expect(buildGuidanceValuesMap([], withHelp, { fallbackToSchemaHelp: false })).toEqual({})
  })

  it('builds guidance values and applies them as field.help', () => {
    const rows = [
      { section_key: 'general', field_key: 'a', guidance_text: 'Explain A', default_value: 'Sample A' },
    ]
    expect(buildGuidanceValuesMap(rows, schema)).toEqual({ a: 'Explain A' })
    const withHelp = applyGuidanceToSchema(schema, rows)
    expect(withHelp.sections[0].fields[0].help).toBe('Explain A')
    expect(withHelp.sections[0].fields[1].help).toBeUndefined()
  })

  it('lists non-empty values for enabled schema fields', () => {
    const entries = listDefaultEntriesFromValues({ a: 'Alpha', b: '' }, schema)

    expect(entries).toEqual([
      { sectionKey: 'general', fieldKey: 'a', value: 'Alpha' },
    ])
  })

  it('lists sample + guidance save entries including clear when both empty', () => {
    const entries = listDefaultContentEntries(
      { a: 'Sample', b: '' },
      { a: 'Help A', b: '' },
      schema,
    )

    expect(entries).toEqual([
      {
        sectionKey: 'general',
        fieldKey: 'a',
        label: 'A',
        value: 'Sample',
        guidanceText: 'Help A',
        clear: false,
      },
      {
        sectionKey: 'general',
        fieldKey: 'b',
        label: 'B',
        value: null,
        guidanceText: null,
        clear: true,
      },
    ])
  })
})
