import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDoc = {
  internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
  setFontSize: vi.fn(),
  text: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  setFont: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  getTextWidth: vi.fn((v) => String(v).length),
  addImage: vi.fn(),
  splitTextToSize: vi.fn((v) => [String(v)]),
  getNumberOfPages: vi.fn(() => 1),
  setPage: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  output: vi.fn(() => 'FAKE_PDF_BLOB'),
}

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function MockJsPDF() { return mockDoc }),
}))

const {
  exportRecordToPDF,
  generateRecordPdfBlob,
  getNumberedSectionInfo,
  parseFieldValue,
  splitMultiItemFieldText,
  fieldGuidanceLines,
  guidedCellValue,
  resolveBranding,
  BULLET,
} = await import('../exportUtils.js')

const sections = [
  { title: 'Overview', fields: [{ key: 'name', label: 'Name' }, { key: 'tags', label: 'Tags' }] },
]
const record = { name: 'Test Record', tags: ['a', 'b'] }

function list(items, intro = null) {
  return { intro, items }
}

describe('generateRecordPdfBlob (v853 — preview, no download)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a blob without calling save', async () => {
    const blob = await generateRecordPdfBlob(sections, record, 'Test')
    expect(blob).toBe('FAKE_PDF_BLOB')
    expect(mockDoc.save).not.toHaveBeenCalled()
    expect(mockDoc.output).toHaveBeenCalledWith('blob')
  })

  it('exportRecordToPDF still calls save and not output', async () => {
    await exportRecordToPDF(sections, record, 'Test')
    expect(mockDoc.save).toHaveBeenCalled()
    expect(mockDoc.output).not.toHaveBeenCalled()
  })

  it('renders the signatures field as a card grid — one bordered card per signatory with Role/Name/Date/Time labels', async () => {
    // Regression: v895 — the Signatures section must show each signatory as its own
    // card (image + labelled Role/Name/Date/Time), not a single stacked column.
    const signatureSections = [
      { title: 'Signatures', fields: [{ key: 'signatures', label: 'Signatures' }] },
    ]
    const assets = [
      { role_label: 'Project Manager', signer_label: 'Jane Doe', signed_at: '2026-08-16T10:26:03Z', url: null, mime_type: null },
      { role_label: 'Sponsor', signer_label: 'John Smith', signed_at: '2026-08-16T11:00:00Z', url: null, mime_type: null },
    ]
    await generateRecordPdfBlob(signatureSections, {}, 'Test', null, '—', { signatures: assets })

    // mockDoc.rect is also called once for the section title banner ('F' fill mode) —
    // count only the unfilled card-border rects.
    const cardBorderCalls = mockDoc.rect.mock.calls.filter((call) => call[4] !== 'F').length
    expect(cardBorderCalls).toBe(assets.length)

    const textCalls = mockDoc.text.mock.calls.map((call) => call[0])
    expect(textCalls.some((t) => String(t).includes('Role: Project Manager'))).toBe(true)
    expect(textCalls.some((t) => String(t).includes('Name: Jane Doe'))).toBe(true)
    expect(textCalls.some((t) => String(t).includes('Role: Sponsor'))).toBe(true)
    expect(textCalls.some((t) => String(t).includes('Name: John Smith'))).toBe(true)
    expect(textCalls.some((t) => String(t).startsWith('Date: '))).toBe(true)
    expect(textCalls.some((t) => String(t).startsWith('Time: '))).toBe(true)
  })

  it('draws a table field as a header row plus one row per entry, not as bullet text (v1331)', async () => {
    const tableSections = [{
      title: 'Risks',
      fields: [{
        key: 'risks_mitigations',
        label: 'Risks, Challenges and Mitigations',
        table: { headers: ['Risk', 'Consequence', 'Mitigation'], rows: [['Window overrun', 'Go-live delayed', 'Rehearse'], ['Low data quality', 'Rejected loads', 'Cleansing sprint']] },
      }],
    }]
    await generateRecordPdfBlob(tableSections, { risks_mitigations: 'Window overrun – Go-live delayed – Rehearse' }, 'Test')

    const textCalls = mockDoc.text.mock.calls.map((call) => call[0])
    expect(textCalls).toContainEqual(['Risk'])
    expect(textCalls).toContainEqual(['Mitigation'])
    expect(textCalls).toContainEqual(['Cleansing sprint'])
    expect(textCalls.some((t) => String(t).includes('Window overrun – Go-live delayed'))).toBe(false)
    // 3 header cells (filled + bordered) and 6 body cells (bordered).
    expect(mockDoc.rect.mock.calls.filter((call) => call[4] === 'FD').length).toBe(3)
    expect(mockDoc.rect.mock.calls.filter((call) => call[4] === undefined).length).toBe(6)
  })
})

describe('record PDF — keep with next (headings stay with their content)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const orderOf = (fn, match) => {
    const i = fn.mock.calls.findIndex((call) => match(call))
    return i === -1 ? null : fn.mock.invocationCallOrder[i]
  }

  it('moves a section heading to the next page when its first field would not fit under it', async () => {
    // 18 one-line fields leave the second section heading just enough room for itself, but not
    // for its first field — previously the heading stayed behind on its own.
    const filler = Array.from({ length: 18 }, (_, i) => ({ key: `f${i}`, label: `Field ${i}` }))
    const values = Object.fromEntries(filler.map((f) => [f.key, 'value']))
    const keepSections = [
      { title: 'Overview', fields: filler },
      { title: 'Scope', fields: [{ key: 'in_scope', label: 'In Scope' }] },
    ]
    await generateRecordPdfBlob(keepSections, { ...values, in_scope: 'Retail customers' }, 'Test')

    const pageBreak = orderOf(mockDoc.addPage, () => true)
    const heading = orderOf(mockDoc.text, (call) => call[0] === '2. Scope')
    const firstField = orderOf(mockDoc.text, (call) => Array.isArray(call[0]) && call[0][0] === '2.1 In Scope')
    expect(pageBreak).not.toBeNull()
    expect(pageBreak).toBeLessThan(heading)
    expect(heading).toBeLessThan(firstField)
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1)
  })

  it('keeps a table header row with its first row', async () => {
    const filler = Array.from({ length: 19 }, (_, i) => ({ key: `f${i}`, label: `Field ${i}` }))
    const values = Object.fromEntries(filler.map((f) => [f.key, 'value']))
    const tableSections = [{
      title: 'Plan',
      fields: [
        ...filler,
        { key: 'deliverables', label: 'Key Deliverables', table: { headers: ['Deliverable', 'Owner'], rows: [['Customer master', 'Nomvula Khumalo']] } },
      ],
    }]
    await generateRecordPdfBlob(tableSections, values, 'Test')

    const pageBreak = orderOf(mockDoc.addPage, () => true)
    const label = orderOf(mockDoc.text, (call) => Array.isArray(call[0]) && call[0][0] === '1.20 Key Deliverables')
    const header = orderOf(mockDoc.text, (call) => Array.isArray(call[0]) && call[0][0] === 'Deliverable')
    const firstRow = orderOf(mockDoc.text, (call) => Array.isArray(call[0]) && call[0][0] === 'Customer master')
    expect(pageBreak).toBeLessThan(label)
    expect(label).toBeLessThan(header)
    expect(header).toBeLessThan(firstRow)
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1)
  })
})

describe('record PDF — Detail | Value tables and linked record blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('draws single-value fields as one Detail | Value table without field numbers', async () => {
    const factSections = [{
      title: 'Health',
      fields: [
        { key: 'overall_rag', label: 'Overall RAG', fact: true },
        { key: 'schedule_rag', label: 'Schedule RAG', fact: true },
        { key: 'headline', label: 'Headline This Period' },
      ],
    }]
    await generateRecordPdfBlob(factSections, { overall_rag: 'Amber', schedule_rag: 'Green', headline: 'On track' }, 'Test')
    const textCalls = mockDoc.text.mock.calls.map((call) => call[0])
    expect(textCalls).toContainEqual(['Detail'])
    expect(textCalls).toContainEqual(['Value'])
    expect(textCalls).toContainEqual(['Overall RAG'])
    expect(textCalls).toContainEqual(['Amber'])
    // The long-text field keeps its heading, numbered 1.1 (the facts take no number).
    expect(textCalls).toContainEqual(['1.1 Headline This Period'])
  })

  it('draws a linked record as description, Detail | Value table, captioned bullets and a captioned table', async () => {
    const linkedSections = [{
      title: 'Related',
      fields: [{
        key: 'workstreams__w1',
        label: 'Customer and digital channels',
        blocks: [
          { type: 'text', text: 'Channels delivery.' },
          { type: 'table', headers: ['Detail', 'Value'], rows: [['Workstream Lead', 'Amina Diallo']] },
          { type: 'list', caption: 'Objectives', items: ['Single customer view'] },
          { type: 'table', caption: 'Key Deliverables', headers: ['Deliverable', 'Owner'], rows: [['Customer master', 'Nomvula Khumalo']] },
        ],
      }],
    }]
    await generateRecordPdfBlob(linkedSections, { workstreams__w1: 'flat text' }, 'Test')
    const textCalls = mockDoc.text.mock.calls.map((call) => call[0])
    expect(textCalls).toContainEqual(['1.1 Customer and digital channels'])
    expect(textCalls).toContain('Channels delivery.')
    expect(textCalls).toContainEqual(['Workstream Lead'])
    expect(textCalls).toContainEqual(['Amina Diallo'])
    expect(textCalls).toContain('Objectives')
    expect(textCalls).toContain('• Single customer view')
    expect(textCalls).toContain('Key Deliverables')
    expect(textCalls).toContainEqual(['Customer master'])
    expect(textCalls.some((t) => String(t).includes('flat text'))).toBe(false)
  })
})

describe('tableColumnFractions (v1331)', () => {
  it('sums to 1, gives long columns more room and every column at least a share', async () => {
    const { tableColumnFractions } = await import('../exportUtils.js')
    const fractions = tableColumnFractions(['Code', 'Description'], [['14901', 'Migration suspense for customer accounts and their accruals']])
    expect(fractions.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(fractions[1]).toBeGreaterThan(fractions[0])
    expect(fractions[0]).toBeGreaterThanOrEqual(0.09)
  })
})

describe('exported field-mapping helpers (v853 — reused by preview components)', () => {
  it('getNumberedSectionInfo numbers sections and fields', () => {
    const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections)
    expect(sectionTitles).toEqual(['1. Overview'])
    expect(flatNumberedFields.map((f) => f.label)).toEqual(['1.1 Name', '1.2 Tags'])
  })

  it('parseFieldValue distinguishes list vs scalar', () => {
    expect(parseFieldValue(['a', 'b'])).toEqual({ isList: true, intro: '', items: ['A', 'B'] })
    expect(parseFieldValue('hello')).toEqual({ isList: false, text: 'hello' })
  })

  it('parseFieldValue / splitMultiItemFieldText put numbered or bulleted items on separate lines', () => {
    const objectives =
      '1. Deliver agreed outcomes by target date. 2. Stay within approved budget envelope. 3. Meet quality acceptance criteria.'
    expect(splitMultiItemFieldText(objectives)).toEqual(
      list([
        '1. Deliver agreed outcomes by target date.',
        '2. Stay within approved budget envelope.',
        '3. Meet quality acceptance criteria.',
      ]),
    )
    expect(parseFieldValue(objectives)).toEqual({
      isList: true,
      intro: '',
      items: [
        '1. Deliver agreed outcomes by target date.',
        '2. Stay within approved budget envelope.',
        '3. Meet quality acceptance criteria.',
      ],
    })
    expect(parseFieldValue('• Alpha • Beta')).toEqual({
      isList: true,
      intro: '',
      items: ['• Alpha', '• Beta'],
    })
    expect(parseFieldValue('line one\nline two')).toEqual({
      isList: true,
      intro: '',
      items: ['Line one', 'Line two'],
    })
    expect(parseFieldValue('Just a sentence with 2. mid-number.')).toEqual({
      isList: false,
      text: 'Just a sentence with 2. mid-number.',
    })
  })

  it('splitMultiItemFieldText formats "Label — a, b, and c." as a professional bullet list', () => {
    expect(
      splitMultiItemFieldText('Communication channels — meetings, portals, email, reports.'),
    ).toEqual(list(['Meetings', 'Portals', 'Email', 'Reports']))
    expect(
      splitMultiItemFieldText('Information distribution — channels, formats, and timing.'),
    ).toEqual(list(['Channels', 'Formats', 'Timing']))
    expect(
      splitMultiItemFieldText('Escalation paths — when and how to escalate.'),
    ).toBeNull()
    expect(
      splitMultiItemFieldText('Authorise the project and communicate objectives, high-level scope, and PM authority.'),
    ).toBeNull()
  })

  it('splitMultiItemFieldText formats plain short comma lists (metrics / codes)', () => {
    expect(splitMultiItemFieldText('PV, EV, AC, CPI, SPI, EAC, VAC')).toEqual(
      list(['PV', 'EV', 'AC', 'CPI', 'SPI', 'EAC', 'VAC']),
    )
    expect(splitMultiItemFieldText('meetings, portals, email, reports')).toEqual(
      list(['Meetings', 'Portals', 'Email', 'Reports']),
    )
  })

  it('splitMultiItemFieldText keeps thousand-separated amounts as a single scalar (not bullets)', () => {
    // Regression: Business Case costs preview showed "420" / "000" as separate bullets.
    expect(splitMultiItemFieldText('420,000')).toBeNull()
    expect(splitMultiItemFieldText('85,000')).toBeNull()
    expect(splitMultiItemFieldText('$1,234.56')).toBeNull()
    expect(splitMultiItemFieldText('USD 85,000')).toBeNull()
    expect(splitMultiItemFieldText('1,234,567.89 ZAR')).toBeNull()
    expect(parseFieldValue('420,000')).toEqual({ isList: false, text: '420,000' })
    expect(parseFieldValue('85,000')).toEqual({ isList: false, text: '85,000' })
  })

  it('splitMultiItemFieldText formats arrow hierarchy chains one level per line', () => {
    expect(
      splitMultiItemFieldText('Category → Type → Role / Asset → Named resource'),
    ).toEqual(list(['Category', 'Type', 'Role / Asset', 'Named resource']))
    expect(splitMultiItemFieldText('L1 -> L2 -> L3')).toEqual(list(['L1', 'L2', 'L3']))
    expect(splitMultiItemFieldText('Cost > Schedule')).toBeNull()
  })

  it('splitMultiItemFieldText formats semicolon role lists one per line', () => {
    expect(
      splitMultiItemFieldText('Business Owner; Quality Lead; Project Manager'),
    ).toEqual(list(['Business Owner', 'Quality Lead', 'Project Manager']))
  })

  it('splitMultiItemFieldText formats semicolon success-criteria clauses one per line, up to 8 words', () => {
    // Regression: "no open critical risks at handover" is 6 words — previously rejected
    // by a wordCount > 5 guard, which left the whole "2.7 Success Criteria" field as one
    // unbroken sentence in exports instead of one clause per line.
    expect(
      splitMultiItemFieldText(
        'Sponsor acceptance; benefits realisation plan approved; no open critical risks at handover.',
      ),
    ).toEqual(
      list([
        'Sponsor acceptance',
        'Benefits realisation plan approved',
        'No open critical risks at handover',
      ]),
    )
  })

  it('splitMultiItemFieldText puts each "Label: clause." on its own line', () => {
    // Regression: "In scope: … Out of scope: …" rendered as one unbroken paragraph in
    // exports — each labelled clause should get its own line, keeping its own label.
    expect(
      splitMultiItemFieldText(
        'In scope: core deliverables listed in the business case. Out of scope: unrelated BAU changes.',
      ),
    ).toEqual(
      list([
        'In scope: core deliverables listed in the business case.',
        'Out of scope: unrelated BAU changes.',
      ]),
    )
    // A single label (no second clause) is left as plain text, not force-split.
    expect(
      splitMultiItemFieldText('Note: see section 2.6 for detail.'),
    ).toBeNull()
  })

  it('splitMultiItemFieldText formats Level N WBS guidance semicolon lists', () => {
    expect(
      splitMultiItemFieldText(
        'Level 1 - phases; Level 2 - major deliverables; Level 3+ - work packages suitable for estimating.',
      ),
    ).toEqual(
      list([
        'Level 1 - phases',
        'Level 2 - major deliverables',
        'Level 3+ - work packages suitable for estimating',
      ]),
    )
    expect(
      splitMultiItemFieldText(
        'Level 1 = phases; Level 2 = major deliverables; Level 3+ = work packages suitable for estimating.',
      ),
    ).toEqual(
      list([
        'Level 1 = phases',
        'Level 2 = major deliverables',
        'Level 3+ = work packages suitable for estimating',
      ]),
    )
  })

  it('treats "Define WBS elements:" as intro, not a bullet', () => {
    expect(
      splitMultiItemFieldText(
        'Define WBS elements: description — Owner — Acceptance criteria — Interfaces',
      ),
    ).toEqual(
      list(['Description', 'Owner', 'Acceptance criteria', 'Interfaces'], 'Define WBS elements'),
    )
    expect(
      parseFieldValue(
        'Define WBS elements: description — Owner — Acceptance criteria — Interfaces',
      ),
    ).toEqual({
      isList: true,
      intro: 'Define WBS elements',
      items: ['Description', 'Owner', 'Acceptance criteria', 'Interfaces'],
    })
    // Already line-broken / prior bad split — recover intro
    expect(
      splitMultiItemFieldText(
        'Define WBS elements\nDescription\nOwner\nAcceptance criteria\nInterfaces',
      ),
    ).toEqual(
      list(['Description', 'Owner', 'Acceptance criteria', 'Interfaces'], 'Define WBS elements'),
    )
    // Em-dash split left "Define WBS elements: description" as first line + trailing dashes
    expect(
      splitMultiItemFieldText(
        'Define WBS elements: description\nOwner—\nAcceptance criteria —\nInterfaces —',
      ),
    ).toEqual(
      list(['Description', 'Owner', 'Acceptance criteria', 'Interfaces'], 'Define WBS elements'),
    )
    // Array values (JSON document_data) must also promote the lead-in
    expect(
      parseFieldValue([
        'Define WBS elements',
        'Description',
        'Owner',
        'Acceptance criteria',
        'Interfaces',
      ]),
    ).toEqual({
      isList: true,
      intro: 'Define WBS elements',
      items: ['Description', 'Owner', 'Acceptance criteria', 'Interfaces'],
    })
    expect(
      splitMultiItemFieldText(
        'Acceptance criteria — testable conditions exist before planning for this deliverable.',
      ),
    ).toBeNull()
  })

  it('fieldGuidanceLines returns help/example lines', () => {
    expect(fieldGuidanceLines({ help: 'Enter a name', example: 'Bob' })).toEqual(['Enter a name', 'Example: Bob'])
    expect(fieldGuidanceLines({})).toEqual([])
  })

  it('guidedCellValue prefixes guidance and falls back to blank placeholder', () => {
    expect(guidedCellValue({ key: 'x' }, null, '—')).toBe('—')
    expect(guidedCellValue({ key: 'x', help: 'Help text' }, 'value', '—')).toBe('Help text\n\nvalue')
  })

  it('resolveBranding falls back to defaults', () => {
    const { footerText, headerHex } = resolveBranding(null)
    expect(footerText).toBe('Project Nidus')
    expect(headerHex).toBeTruthy()
  })

  it('resolveBranding uses organisation primary_color for section headers', () => {
    const { headerHex, footerText } = resolveBranding({
      primary_color: '#0F766E',
      app_display_name: 'Acme Org',
    })
    expect(headerHex).toBe('0F766E')
    expect(footerText).toBe('Acme Org')
  })

  it('BULLET is a single bullet character', () => {
    expect(BULLET).toBe('•')
  })
})
