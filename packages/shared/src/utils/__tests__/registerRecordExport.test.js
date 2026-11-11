import { describe, it, expect } from 'vitest'
import { buildRegisterRecordExport } from '../registerRecordExport'

const register = {
  register_key: 'fin_transformation_overview',
  status_workflow: [{ key: 'published', label: 'Published' }],
  fields: [
    { field_key: 'transformation_type', field_label: 'Transformation Type', field_type: 'dropdown', field_group: null,
      dropdown_options: [{ value: 'core_banking_replacement', label: 'Core Banking Replacement' }] },
    { field_key: 'executive_sponsor', field_label: 'Executive Sponsor', field_type: 'user_picker', field_group: 'Governance' },
    { field_key: 'in_scope', field_label: 'In Scope', field_type: 'multi_line', field_group: 'In Scope' },
  ],
}
const record = {
  id: 'r1',
  display_id: 'LREG-2026-002',
  title: 'Core Banking Modernisation Programme',
  status: 'published',
  description: 'Replace the core',
  field_values: { transformation_type: 'core_banking_replacement', executive_sponsor: 'Grace Moyo', in_scope: 'Deposits\nLending', cf__x: true },
}
const customFields = [{ field_key: 'cf__x', field_label: 'Regulator Notified', field_type: 'boolean' }]

describe('buildRegisterRecordExport', () => {
  it('builds sections that follow the record tabs', () => {
    const { sections } = buildRegisterRecordExport({ register, record, customFields })
    expect(sections.map((s) => s.title)).toEqual(['Details', 'Governance', 'In Scope', 'Custom Fields'])
    expect(sections[0].fields.map((f) => f.key)).toEqual(['display_id', 'title', 'status', 'transformation_type', 'description'])
  })

  it('marks single-value fields as facts (one Detail | Value table) and puts them first in each section', () => {
    const { sections } = buildRegisterRecordExport({ register, record, customFields })
    expect(sections[0].fields.filter((f) => f.fact).map((f) => f.key)).toEqual(['display_id', 'title', 'status', 'transformation_type'])
    expect(sections[0].fields.find((f) => f.key === 'description').fact).toBeUndefined()
    expect(sections.find((s) => s.title === 'Governance').fields[0]).toMatchObject({ key: 'executive_sponsor', fact: true })
    expect(sections.find((s) => s.title === 'In Scope').fields[0].fact).toBeUndefined()
    expect(sections.find((s) => s.title === 'Custom Fields').fields[0]).toMatchObject({ key: 'cf__x', fact: true })
  })

  it('gives each linked record document blocks: description, Detail | Value table, captioned lists and tables', () => {
    const withLink = {
      ...register,
      fields: [...register.fields, { field_key: 'workstreams', field_label: 'Workstreams', field_type: 'linked_records', field_group: 'Related',
        dropdown_options: [{ value: 'ict_workstreams', label: 'Workstreams' }] }],
    }
    const linked = {
      workstreams: {
        register: {
          label: 'Workstreams',
          status_workflow: [{ key: 'in_progress', label: 'In Progress' }],
          fields: [
            { field_key: 'workstream_lead', field_label: 'Workstream Lead', field_type: 'user_picker' },
            { field_key: 'objectives', field_label: 'Objectives', field_type: 'multi_line' },
            { field_key: 'key_deliverables', field_label: 'Key Deliverables', field_type: 'table',
              dropdown_options: [{ value: 'deliverable', label: 'Deliverable' }, { value: 'owner', label: 'Owner' }] },
          ],
        },
        records: [{ id: 'w1', display_id: 'LREG-9', title: 'Customer and digital channels', description: 'Channels delivery.', status: 'in_progress',
          field_values: { workstream_lead: 'Amina Diallo', objectives: 'Single customer view\nCustomer deduplication', key_deliverables: 'Customer master\tNomvula Khumalo' } }],
      },
    }
    const out = buildRegisterRecordExport({ register: withLink, record, linked })
    const field = out.sections.find((s) => s.title === 'Related').fields[0]
    expect(field.label).toBe('Customer and digital channels')
    expect(field.blocks).toEqual([
      { type: 'text', text: 'Channels delivery.' },
      { type: 'table', headers: ['Detail', 'Value'], rows: [['Status', 'In Progress'], ['Workstream Lead', 'Amina Diallo']] },
      { type: 'list', caption: 'Objectives', items: ['Single customer view', 'Customer deduplication'], plain: false },
      { type: 'table', caption: 'Key Deliverables', headers: ['Deliverable', 'Owner'], rows: [['Customer master', 'Nomvula Khumalo']] },
    ])
    // The flat exports (Excel, CSV, XML, JSON) keep the text.
    expect(out.record.workstreams__w1).toContain('Workstream Lead: Amina Diallo')
  })

  it('exports readable values and a safe file name', () => {
    const out = buildRegisterRecordExport({ register, record, customFields })
    expect(out.record).toMatchObject({
      display_id: 'LREG-2026-002',
      status: 'Published',
      transformation_type: 'Core Banking Replacement',
      in_scope: 'Deposits\nLending',
      cf__x: 'Yes',
    })
    expect(out.baseFilename).toBe('fin_transformation_overview_LREG-2026-002')
  })

  it('formats amounts with the regional settings', () => {
    const withBudget = {
      ...register,
      fields: [...register.fields, { field_key: 'approved_budget', field_label: 'Approved Budget', field_type: 'currency', field_group: 'Timeline & Finance' }],
    }
    const out = buildRegisterRecordExport({
      register: withBudget,
      record: { ...record, field_values: { ...record.field_values, approved_budget: 18500000 } },
      settings: { currency_code: 'USD', locale: 'en-US', decimal_places: 2 },
    })
    expect(out.record.approved_budget).toBe('$18,500,000.00')
  })

  it('omits the Custom Fields section when there are none', () => {
    const { sections } = buildRegisterRecordExport({ register, record })
    expect(sections.map((s) => s.title)).not.toContain('Custom Fields')
  })

  it('expands a linked-records field into one field per source record: introduction then rule lines (v1332)', () => {
    const withLink = {
      ...register,
      fields: [
        ...register.fields,
        { field_key: 'products_in_scope', field_label: 'Products in Scope', field_type: 'multi_line', field_group: 'Product Takeover' },
        { field_key: 'product_takeover_details', field_label: 'Product Takeover Details', field_type: 'linked_records', field_group: 'Product Takeover',
          dropdown_options: [{ value: 'fin_data_scope', label: 'Data Scope' }] },
      ],
    }
    const linked = {
      product_takeover_details: {
        register: {
          label: 'Data Scope',
          status_workflow: [{ key: 'rules_approved', label: 'Rules Approved' }],
          fields: [
            { field_key: 'inclusion_rules', field_label: 'Inclusion Rules (what will be migrated)', field_type: 'multi_line' },
            { field_key: 'estimated_record_count', field_label: 'Estimated Record Count', field_type: 'number' },
          ],
        },
        records: [
          { id: 'b', display_id: 'LREG-2', title: 'Customer accounts', description: 'Current and savings accounts.', status: 'rules_approved',
            field_values: { inclusion_rules: 'Open accounts\nRestricted accounts with balances' } },
          { id: 'a', display_id: 'LREG-1', title: 'Customers', description: 'All active customers.', status: 'rules_approved',
            field_values: { estimated_record_count: 1400000 } },
        ],
      },
    }
    const out = buildRegisterRecordExport({ register: withLink, record, linked })
    const section = out.sections.find((s) => s.title === 'Product Takeover')
    expect(section.fields.map((f) => f.label)).toEqual(['Products in Scope', 'Customers', 'Customer accounts'])
    expect(out.record.product_takeover_details__b).toBe(
      'Current and savings accounts.:\nStatus: Rules Approved\nInclusion Rules: Open accounts\nInclusion Rules: Restricted accounts with balances',
    )
    expect(out.record.product_takeover_details__a).toMatch(/Estimated Record Count: 1\D?400\D?000/)
    expect(out.record).not.toHaveProperty('product_takeover_details')
  })

  it('gives table fields their headers and rows for the layout exports, and lines for the flat ones (v1331)', () => {
    const withTables = {
      ...register,
      fields: [
        ...register.fields,
        { field_key: 'risks_mitigations', field_label: 'Risks, Challenges and Mitigations', field_type: 'table', field_group: 'Risks',
          dropdown_options: [{ value: 'risk', label: 'Risk' }, { value: 'consequence', label: 'Consequence' }, { value: 'mitigation', label: 'Mitigation' }] },
        { field_key: 'mock_runs_planned', field_label: 'Mock Migrations Planned', field_type: 'table', field_group: 'Data Takeover',
          dropdown_options: [{ value: 'mock', label: 'Mock' }, { value: 'date', label: 'Date', type: 'date' }, { value: 'scope', label: 'Scope' }] },
        { field_key: 'glossary', field_label: 'Glossary of Terms', field_type: 'table', field_group: 'Glossary & Appendices',
          dropdown_options: [{ value: 'term', label: 'Term' }, { value: 'definition', label: 'Definition' }] },
      ],
    }
    const out = buildRegisterRecordExport({
      register: withTables,
      record: {
        ...record,
        field_values: {
          ...record.field_values,
          risks_mitigations: 'Window overrun\tGo-live delayed\tRehearse three times',
          mock_runs_planned: 'Mock 1 – 2026-09-12 – Static data',
        },
      },
    })
    const fields = out.sections.flatMap((s) => s.fields)
    const risks = fields.find((f) => f.key === 'risks_mitigations')
    expect(risks.table).toEqual({ headers: ['Risk', 'Consequence', 'Mitigation'], rows: [['Window overrun', 'Go-live delayed', 'Rehearse three times']] })
    expect(fields.find((f) => f.key === 'mock_runs_planned').table.rows[0][0]).toBe('Mock 1')
    expect(fields.find((f) => f.key === 'glossary').table).toBeUndefined()
    expect(out.record.risks_mitigations).toBe('Window overrun – Go-live delayed – Rehearse three times')
  })
})
