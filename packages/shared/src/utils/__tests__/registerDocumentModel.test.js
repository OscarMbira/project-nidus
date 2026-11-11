import { describe, it, expect } from 'vitest'
import { buildRegisterDocumentModel, splitPair, splitParts, letterFor, fieldToItem } from '../registerDocumentModel'

const field = (field_key, field_label, field_type = 'text', field_group = null, extra = {}) => ({
  field_key, field_label, field_type, field_group, ...extra,
})

const REGISTER = {
  register_key: 'fin_migration_strategy',
  label: 'Migration Strategy',
  status_workflow: [{ key: 'draft', label: 'Draft' }, { key: 'approved', label: 'Approved' }],
  fields: [
    field('document_reference', 'Document Reference'),
    field('document_version', 'Document Version'),
    field('document_owner', 'Document Owner', 'user_picker'),
    field('migration_type', 'Migration Type', 'dropdown', null, { dropdown_options: [{ value: 'big_bang', label: 'Big bang' }] }),
    field('target_go_live_date', 'Target Go-Live', 'date'),
    field('purpose', 'Purpose', 'long_text', 'Executive Summary'),
    field('objectives', 'Objectives', 'multi_line', 'Executive Summary'),
    field('in_scope', 'In Scope', 'multi_line', 'Scope'),
    field('empty_note', 'Unused', 'text', 'Scope'),
    field('risks', 'Risks', 'multi_line', 'Risks'),
    field('user_comms', 'Customer Communication Required', 'boolean', 'Risks'),
    field('glossary', 'Glossary of Terms', 'multi_line', 'Glossary & Appendices'),
    field('appendices', 'Appendices', 'multi_line', 'Glossary & Appendices'),
    field('version_history', 'Version History', 'multi_line', 'Document Control'),
  ],
}

const RECORD = {
  id: 'rec-1',
  display_id: 'LRR-0042',
  title: 'Core Banking Data Migration Strategy',
  description: 'How data moves to the new core.',
  status: 'approved',
  field_values: {
    document_reference: 'DMS-001',
    document_version: '1.2',
    document_owner: 'A. Mensah',
    migration_type: 'big_bang',
    purpose: 'Para one.\nPara two.',
    objectives: 'Zero data loss\nGo live on time',
    in_scope: 'Customers',
    empty_note: '',
    user_comms: true,
    glossary: 'GL – General ledger\nKYC: Know your customer',
    appendices: 'Data mapping workbook – DM-WB-01',
    version_history: '1.0 – 01/09/2026 – A. Mensah – First draft\n1.2 – 20/10/2026 – B. Osei – Review comments',
  },
}

describe('helpers', () => {
  it('splits pairs on spaced dashes or a colon', () => {
    expect(splitPair('GL – General ledger')).toEqual(['GL', 'General ledger'])
    expect(splitPair('KYC: Know your customer')).toEqual(['KYC', 'Know your customer'])
    expect(splitPair('Just a term')).toEqual(['Just a term', ''])
  })
  it('keeps hyphenated dates whole when splitting parts', () => {
    expect(splitParts('1.0 – 2026-10-24 – Me – Draft')).toEqual(['1.0', '2026-10-24', 'Me', 'Draft'])
  })
  it('letters A..Z then AA', () => {
    expect([letterFor(0), letterFor(25), letterFor(26)]).toEqual(['A', 'Z', 'AA'])
  })
  it('omits blank fields and maps types', () => {
    expect(fieldToItem(field('x', 'X'), '', null)).toBeNull()
    expect(fieldToItem(field('x', 'X', 'multi_line'), 'a\nb', null)).toEqual({ label: 'X', kind: 'list', items: ['a', 'b'] })
    expect(fieldToItem(field('x', 'X', 'boolean'), false, null)).toEqual({ label: 'X', kind: 'text', text: 'No' })
  })
})

describe('buildRegisterDocumentModel', () => {
  const signatories = [
    { role_label: 'Project Manager', name: 'A. Mensah', status: 'signed', signed_at: '2026-10-20T10:00:00Z', signature_url: 'https://x/sig.png', is_mandatory: true },
    { role_label: 'Sponsor', name: 'B. Osei', status: 'pending', is_mandatory: true },
    { role_label: 'Head of IT', name: 'C. Darko', status: 'declined', decline_reason: 'Scope unclear', is_mandatory: false },
  ]
  const attachments = [
    { title: 'Process flow', file_name: 'flow.png', is_image: true, mime_type: 'image/png', url: 'https://x/flow.png', size_label: '12 KB' },
    { title: 'Mapping workbook', file_name: 'map.xlsx', is_image: false, url: 'https://x/map.xlsx' },
  ]
  const model = buildRegisterDocumentModel({
    register: REGISTER, record: RECORD, signatories, attachments, organisationName: 'Acme Bank', projectLabel: 'PRJ-01 — Core',
  })

  it('builds the cover from the document fields', () => {
    const labels = Object.fromEntries(model.cover.map((r) => [r.label, r.value]))
    expect(labels['Document Reference']).toBe('DMS-001')
    expect(labels.Version).toBe('1.2')
    expect(labels.Status).toBe('Approved')
    expect(labels.Organisation).toBe('Acme Bank')
    expect(model.title).toBe('Core Banking Data Migration Strategy')
  })

  it('puts other Details fields in document information, with option labels', () => {
    expect(model.information).toContainEqual({ label: 'Migration Type', value: 'Big bang' })
    expect(model.information.find((r) => r.label === 'Document Reference')).toBeUndefined()
  })

  it('splits version history into columns', () => {
    expect(model.versionHistory[1]).toEqual({ version: '1.2', date: '20/10/2026', author: 'B. Osei', change: 'Review comments' })
  })

  it('lists sign-off rows with status notes', () => {
    expect(model.signoff[0]).toMatchObject({ name: 'A. Mensah', role: 'Project Manager', signatureUrl: 'https://x/sig.png', note: '' })
    expect(model.signoff[1].note).toBe('Pending')
    expect(model.signoff[2].note).toBe('Declined — Scope unclear')
  })

  it('numbers sections, puts the glossary second and skips empty fields', () => {
    expect(model.sections.map((s) => `${s.number} ${s.title}`)).toEqual([
      '1 Executive Summary', '2 Glossary of Terms', '3 Scope', '4 Risks',
    ])
    expect(model.sections[1].glossary).toEqual([
      { term: 'GL', definition: 'General ledger' },
      { term: 'KYC', definition: 'Know your customer' },
    ])
    expect(model.sections[2].items.map((i) => i.label)).toEqual(['In Scope'])
    expect(model.sections[0].items[0]).toMatchObject({ number: '1.1', kind: 'paragraphs', items: ['Para one.', 'Para two.'] })
    expect(model.sections[3].items[0]).toMatchObject({ number: '4.1', label: 'Customer Communication Required', text: 'Yes' })
  })

  it('letters appendices and annexures', () => {
    expect(model.appendices).toEqual([{ letter: 'A', title: 'Data mapping workbook', reference: 'DM-WB-01' }])
    expect(model.annexures.map((a) => `${a.letter} ${a.title} ${a.isImage}`)).toEqual(['A Process flow true', 'B Mapping workbook false'])
  })

  it('builds a table of contents in document order', () => {
    const titles = model.toc.filter((t) => t.level === 1).map((t) => t.title)
    expect(titles).toEqual(['Document Control', '1  Executive Summary', '2  Glossary of Terms', '3  Scope', '4  Risks', 'Appendices', 'Annexures'])
    expect(model.toc).toContainEqual({ key: 'anxB', level: 2, title: 'Annexure B – Mapping workbook' })
  })

  it('omits glossary, appendices and annexures when empty', () => {
    const bare = buildRegisterDocumentModel({ register: REGISTER, record: { ...RECORD, field_values: { purpose: 'Only this' } } })
    expect(bare.sections.map((s) => s.title)).toEqual(['Executive Summary'])
    expect(bare.appendices).toEqual([])
    expect(bare.toc.map((t) => t.title)).toEqual(['Document Control', '1  Executive Summary', '1.1  Purpose'])
  })

  it('adds one numbered sub-section per linked record, with its introduction and rule bullets (v1332)', () => {
    const withLink = {
      ...REGISTER,
      fields: [...REGISTER.fields,
        field('products', 'Products in Scope', 'multi_line', 'Product Takeover'),
        field('product_takeover_details', 'Product Takeover Details', 'linked_records', 'Product Takeover', { dropdown_options: [{ value: 'fin_data_scope', label: 'Data Scope' }] }),
      ],
    }
    const linked = {
      product_takeover_details: {
        register: { status_workflow: [], fields: [field('exclusion_rules', 'Exclusion Rules (what will not be migrated)', 'multi_line')] },
        records: [{ id: 'r1', display_id: 'LREG-1', title: 'Loans and past dues', description: 'Loans not matured on the migration date.', field_values: { exclusion_rules: 'Matured loans' } }],
      },
    }
    const doc = buildRegisterDocumentModel({ register: withLink, record: { ...RECORD, field_values: { products: 'Loans' } }, linked })
    const section = doc.sections.find((s) => s.title === 'Product Takeover')
    expect(section.items.map((i) => i.label)).toEqual(['Products in Scope', 'Loans and past dues'])
    expect(section.items[1]).toMatchObject({ kind: 'linked', intro: 'Loans not matured on the migration date.', groups: [{ label: 'Exclusion Rules', kind: 'list', items: ['Matured loans'] }], number: '1.2' })
  })
})

describe('matched linked records (v1333)', () => {
  const register = {
    register_key: 'strategy', label: 'Strategy',
    fields: [
      { field_key: 'products', field_label: 'Products in Scope', field_type: 'multi_select', field_group: 'Product Takeover',
        dropdown_options: [{ value: 'loans', label: 'Loans' }, { value: 'cards', label: 'Cards' }, { value: 'accounts', label: 'Accounts' }] },
      { field_key: 'details', field_label: 'Product Takeover Details', field_type: 'linked_records', field_group: 'Product Takeover',
        dropdown_options: [{ value: 'scope', label: 'Data Scope', match_field: 'products', source_field: 'area' }] },
    ],
  }
  const source = {
    label: 'Data Scope',
    fields: [{ field_key: 'area', field_label: 'Product / Data Area', field_type: 'text' }, { field_key: 'rules', field_label: 'Inclusion Rules', field_type: 'multi_line' }],
    status_workflow: [],
  }
  const records = [
    { id: 'a', title: 'Customer accounts', description: 'All customer accounts move.', field_values: { area: 'accounts', rules: 'Closed accounts are not migrated' } },
    { id: 'l', title: 'LD Loans and Past Dues', description: 'Salary advance loans move.', field_values: { area: 'loans', rules: 'Only loans not matured' } },
    { id: 'x', title: 'Not selected', field_values: { area: 'treasury' } },
  ]
  const model = buildRegisterDocumentModel({
    register,
    record: { id: 'r', title: 'Strategy', field_values: { products: ['loans', 'cards', 'accounts'] } },
    linked: { details: { register: source, records } },
  })
  const items = model.sections[0].items

  it('shows one sub-section per selected product, in selected order, instead of the product list', () => {
    expect(items.map((i) => i.label)).toEqual(['LD Loans and Past Dues', 'Cards', 'Customer accounts'])
    expect(items[0]).toMatchObject({ number: '1.1', intro: 'Salary advance loans move.' })
    expect(items[0].items).toContain('Inclusion Rules: Only loans not matured')
  })

  it('notes products without details yet, and leaves out records for products not in scope', () => {
    expect(items[1].intro).toMatch(/not been captured in Data Scope yet/)
    expect(items.find((i) => i.label === 'Not selected')).toBeUndefined()
  })
})

describe('appendix numbering', () => {
  it('keeps an "Appendix N –" prefix as the appendix label', () => {
    const model = buildRegisterDocumentModel({
      register: { register_key: 'r', label: 'R', fields: [{ field_key: 'appendices', field_label: 'Appendices', field_type: 'table', field_group: 'Glossary & Appendices', dropdown_options: [{ value: 'title', label: 'Title' }, { value: 'reference', label: 'Reference / Link' }] }] },
      record: { id: '1', title: 'Doc', field_values: { appendices: 'Appendix 5 – Cutover timeline\tAnnexure A (attached)\nRACI matrix\tAnnexure D' } },
    })
    expect(model.appendices).toEqual([
      { letter: '5', title: 'Cutover timeline', reference: 'Annexure A (attached)' },
      { letter: 'B', title: 'RACI matrix', reference: 'Annexure D' },
    ])
  })
})

describe('linked record layout (v1334)', () => {
  it('splits single values into a facts table and lists into sub-headed groups', () => {
    const model = buildRegisterDocumentModel({
      register: {
        register_key: 's', label: 'S',
        fields: [{ field_key: 'd', field_label: 'Details', field_type: 'linked_records', field_group: 'Products', dropdown_options: [{ value: 'scope' }] }],
      },
      record: { id: 'r', title: 'S', field_values: {} },
      linked: {
        d: {
          register: {
            status_workflow: [{ key: 'ok', label: 'Rules Approved' }],
            fields: [
              { field_key: 'owner', field_label: 'Product / Data Owner', field_type: 'text' },
              { field_key: 'criteria', field_label: 'Scope Criteria (e.g. ranges)', field_type: 'multi_line' },
            ],
          },
          records: [{ id: 'c', title: 'Customers', description: 'All customers.', status: 'ok', field_values: { owner: 'Amina Diallo', criteria: 'Active customers\nOpen accounts' } }],
        },
      },
    })
    const item = model.sections[0].items[0]
    expect(item).toMatchObject({ kind: 'linked', label: 'Customers', intro: 'All customers.' })
    expect(item.facts).toEqual([{ label: 'Status', value: 'Rules Approved' }, { label: 'Product / Data Owner', value: 'Amina Diallo' }])
    expect(item.groups).toEqual([{ label: 'Scope Criteria', kind: 'list', items: ['Active customers', 'Open accounts'] }])
  })
})
