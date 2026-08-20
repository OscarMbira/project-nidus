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
