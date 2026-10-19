// v1272 Phase 2 — Import Mapper client helpers.
import { describe, expect, it } from 'vitest'
import {
  applyMapping,
  autoMatch,
  dictionaryFromColumns,
  headerSignature,
  missingRequired,
  needsMapping,
  parseCsvText,
  sampleValues,
  unconvertedValues,
} from '../importMapping.js'

const dictionary = dictionaryFromColumns([
  { field: 'contact_name', required: 'Yes', data_type: 'Text', allowed_values: 'Any non-blank text', aliases: 'name, full_name' },
  { field: 'contact_type', required: 'No', data_type: 'Enum', allowed_values: 'internal | client | vendor | other', aliases: 'type' },
  { key: 'email', label: 'Email', required: false, aliases: ['e-mail'] },
])

describe('dictionaryFromColumns', () => {
  it('reads rule 71 legends and template column lists alike', () => {
    expect(dictionary[0]).toMatchObject({ key: 'contact_name', required: true, allowed: [], aliases: ['name', 'full_name'] })
    expect(dictionary[1].allowed).toEqual(['internal', 'client', 'vendor', 'other'])
    expect(dictionary[2].aliases).toEqual(['e-mail'])
  })
})

describe('matching', () => {
  it('matches template names and aliases, ignoring case and punctuation', () => {
    expect(autoMatch(['Full Name', 'TYPE', 'E-mail', 'Notes'], dictionary)).toEqual({ 'Full Name': 'contact_name', TYPE: 'contact_type', 'E-mail': 'email', Notes: null })
  })
  it('needs mapping only when required fields are missing or most columns are unknown', () => {
    expect(needsMapping(['contact_name', 'email'], dictionary)).toBe(false)
    expect(needsMapping(['Person', 'Company', 'Mail'], dictionary)).toBe(true)
    expect(missingRequired({ Person: null }, dictionary)).toEqual(['contact_name'])
  })
  it('gives the same signature for the same layout in any order or case', () => {
    expect(headerSignature(['B col', 'A'])).toBe(headerSignature(['a', 'B Col']))
    expect(headerSignature(['A'])).not.toBe(headerSignature(['B']))
  })
})

describe('applyMapping', () => {
  const rows = [{ Person: 'Ann', Kind: 'Supplier', Extra: 'x' }, { Person: 'Bo', Kind: 'Client', Extra: '' }]
  const mapping = { Person: 'contact_name', Kind: 'contact_type', Extra: null }
  it('re-keys rows, converts values and drops unmapped columns', () => {
    expect(applyMapping(rows, mapping, { contact_type: { supplier: 'vendor' } })).toEqual([
      { contact_name: 'Ann', contact_type: 'vendor' },
      { contact_name: 'Bo', contact_type: 'Client' },
    ])
  })
  it('lists values that still do not fit an enum field', () => {
    expect(unconvertedValues(rows, 'Kind', dictionary[1], { contact_type: { supplier: 'vendor' } })).toEqual([])
    expect(unconvertedValues([{ Kind: 'Partner' }], 'Kind', dictionary[1])).toEqual(['Partner'])
    expect(sampleValues(rows, 'Kind')).toEqual(['Supplier', 'Client'])
  })
})

describe('parseCsvText', () => {
  it('skips # dictionary lines and keeps quoted commas', () => {
    const { headers, rows } = parseCsvText('# DATA DICTIONARY\n# contact_name,Yes\nName,Notes\n"Lee, Ann","a ""b"""\n')
    expect(headers).toEqual(['Name', 'Notes'])
    expect(rows).toEqual([{ Name: 'Lee, Ann', Notes: 'a "b"' }])
  })
})
