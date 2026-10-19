// v1272 Phase 2 — Import Mapper tool: 20-row limit and reply validation.
import { describe, expect, it } from 'vitest'
import { buildMapperPrompt, limitSample, MAX_SAMPLE_ROWS, validateMapperReply } from '../importMapper.js'

const dictionary = [
  { key: 'contact_name', label: 'Name', required: true, type: 'Text', allowed: [], aliases: ['name'] },
  { key: 'contact_type', label: 'Type', required: false, type: 'Enum', allowed: ['internal', 'client', 'vendor', 'other'], aliases: [] },
  { key: 'email', label: 'Email', required: false, type: 'Text', allowed: [], aliases: [] },
]

describe('limitSample', () => {
  it('never passes more than 20 rows to the model', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ A: `v${i}`, B: 'x'.repeat(500) }))
    const s = limitSample({ headers: ['A', 'B'], rows })
    expect(s.rows).toHaveLength(MAX_SAMPLE_ROWS)
    expect(s.rows[0].B).toHaveLength(200)
    expect(JSON.parse(buildMapperPrompt({ templateLabel: 'Contacts', dictionary, ...s }).user).first_rows).toHaveLength(20)
  })
})

describe('validateMapperReply', () => {
  it('keeps valid targets, drops unknown and repeated ones, and only converts to allowed values', () => {
    const reply = {
      columns: [
        { source: 'Full Name', target: 'contact_name', confidence: 'high' },
        { source: 'Kind', target: 'contact_type', confidence: 'medium', conversions: { Supplier: 'vendor', Staff: 'employee' } },
        { source: 'Mail', target: 'made_up', confidence: 'high' },
        { source: 'Name again', target: 'contact_name', confidence: 'low' },
      ],
    }
    const out = validateMapperReply(reply, dictionary, ['Full Name', 'Kind', 'Mail', 'Name again', 'Unlisted'])
    expect(out.columns.map((c) => c.target)).toEqual(['contact_name', 'contact_type', null, null, null])
    expect(out.columns[1].conversions).toEqual({ supplier: 'vendor' })
    expect(out.missing_required).toEqual([])
  })
  it('reports required fields nothing maps to', () => {
    expect(validateMapperReply({ columns: [] }, dictionary, ['X']).missing_required).toEqual(['contact_name'])
  })
})
