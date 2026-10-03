import { describe, it, expect } from 'vitest'
import {
  splitMultiValue,
  normalizeContactImportRows,
  validateContactImportRows,
  getContactImportLegendRows,
  getContactImportTemplateRows,
  buildCsvTemplateWithEmbeddedLegend,
  extractJsonContactRows,
  CONTACT_IMPORT_LEGEND,
} from '../projectContactsBulkService'

describe('projectContactsBulkService', () => {
  it('exposes a legend with one entry per import field', () => {
    const legend = getContactImportLegendRows()
    expect(legend.length).toBe(CONTACT_IMPORT_LEGEND.length)
    expect(legend[0]).toHaveProperty('field', 'contact_name')
    expect(legend[0]).toHaveProperty('required', 'Yes')
    expect(legend[0]).toHaveProperty('data_type')
    expect(legend[0]).toHaveProperty('max_length')
  })

  it('embeds DATA DICTIONARY in the CSV template text', () => {
    const csv = buildCsvTemplateWithEmbeddedLegend(
      getContactImportTemplateRows(),
      getContactImportLegendRows(),
    )
    expect(csv).toContain('# DATA DICTIONARY')
    expect(csv).toMatch(/# contact_name,/)
    expect(csv).toContain('contact_name,role_title,organisation')
    expect(csv).toContain('Ada Lovelace')
  })

  it('extractJsonContactRows reads CONTACTS / contacts', () => {
    expect(extractJsonContactRows({ CONTACTS: [{ contact_name: 'A' }] })).toEqual([{ contact_name: 'A' }])
    expect(extractJsonContactRows({ contacts: [{ contact_name: 'B' }] })).toEqual([{ contact_name: 'B' }])
    expect(extractJsonContactRows([{ contact_name: 'C' }])).toEqual([{ contact_name: 'C' }])
  })
  it('splitMultiValue splits on semicolon and newlines', () => {
    expect(splitMultiValue('a@b.com; c@d.com')).toEqual(['a@b.com', 'c@d.com'])
    expect(splitMultiValue('a@b.com\nc@d.com')).toEqual(['a@b.com', 'c@d.com'])
  })

  it('normalizeContactImportRows aliases name/role and defaults primary', () => {
    const [row] = normalizeContactImportRows([
      {
        name: 'Ada',
        role: 'Analyst',
        email: 'ada@example.com; other@example.com',
        phone: '+263771234567',
      },
    ])
    expect(row.contact_name).toBe('Ada')
    expect(row.role_title).toBe('Analyst')
    expect(row.emails).toEqual(['ada@example.com', 'other@example.com'])
    expect(row.primary_email).toBe('ada@example.com')
    expect(row.primary_phone).toBe('+263771234567')
  })

  it('splits addresses and defaults primary_address to the first line', () => {
    const [row] = normalizeContactImportRows([
      { contact_name: 'Ada', address: '1 Example Street; 2 Sample Road' },
    ])
    expect(row.addresses).toEqual(['1 Example Street', '2 Sample Road'])
    expect(row.address).toBe('1 Example Street\n2 Sample Road')
    expect(row.primary_address).toBe('1 Example Street')
  })

  it('validateContactImportRows skips invalid emails', () => {
    const normalized = normalizeContactImportRows([
      { contact_name: 'Bad', email: 'not-an-email' },
      { contact_name: 'Good', email: 'good@example.com' },
    ])
    const { ready, skipped } = validateContactImportRows(normalized, [])
    expect(ready).toHaveLength(1)
    expect(ready[0].contact_name).toBe('Good')
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reasons.some((r) => /email/i.test(r))).toBe(true)
  })

  it('flags possible duplicate as anomaly but keeps row ready', () => {
    const normalized = normalizeContactImportRows([
      { contact_name: 'Ada', organisation: 'Org', email: 'ada@example.com' },
    ])
    const { ready, anomalies } = validateContactImportRows(
      normalized,
      [{ contact_name: 'Ada', organisation: 'Org' }],
      { roleLabels: [] },
    )
    expect(ready).toHaveLength(1)
    expect(anomalies.some((a) => a.kind === 'possible_duplicate')).toBe(true)
  })

  it('corrects primary_email not in list and flags anomaly', () => {
    const normalized = normalizeContactImportRows([
      {
        contact_name: 'Ada',
        email: 'ada@example.com',
        primary_email: 'wrong@example.com',
      },
    ])
    expect(normalized[0].primary_email).toBe('ada@example.com')
    expect(normalized[0]._flags.primaryEmailCorrected).toBe(true)
    const { anomalies, ready } = validateContactImportRows(normalized, [])
    expect(ready).toHaveLength(1)
    expect(anomalies.some((a) => a.kind === 'primary_email_corrected')).toBe(true)
  })

  it('flags role_will_create when role missing from catalog', () => {
    const normalized = normalizeContactImportRows([
      { contact_name: 'Ada', role_title: 'New Role', email: 'ada@example.com' },
    ])
    const { anomalies, ready } = validateContactImportRows(normalized, [], {
      roleLabels: ['Analyst'],
    })
    expect(ready).toHaveLength(1)
    expect(anomalies.some((a) => a.kind === 'role_will_create')).toBe(true)
  })
})
