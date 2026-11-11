import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildRegisterDocumentModel } from '../registerDocumentModel'
import { buildRegisterDocumentWordBlob } from '../registerDocumentWord'
import { buildRegisterDocumentPdf } from '../registerDocumentPdf'

const model = buildRegisterDocumentModel({
  register: {
    register_key: 'fin_cutover_plan',
    label: 'Cutover Plan',
    status_workflow: [{ key: 'draft', label: 'Draft' }],
    fields: [
      { field_key: 'document_reference', field_label: 'Document Reference', field_type: 'text' },
      { field_key: 'purpose', field_label: 'Purpose', field_type: 'long_text', field_group: 'Introduction' },
      { field_key: 'steps', field_label: 'Activity Runsheet', field_type: 'multi_line', field_group: 'Timeline' },
      { field_key: 'glossary', field_label: 'Glossary', field_type: 'multi_line', field_group: 'Glossary & Appendices' },
      { field_key: 'appendices', field_label: 'Appendices', field_type: 'multi_line', field_group: 'Glossary & Appendices' },
    ],
  },
  record: {
    id: 'r1',
    title: 'Weekend Cutover Plan',
    status: 'draft',
    field_values: {
      document_reference: 'CP-01',
      purpose: 'Move to the new system.',
      steps: '1 – Freeze – Ops – Fri 18:00\n2 – Final load – Data – Fri 20:00',
      glossary: 'PNR – Point of no return',
      appendices: 'Runsheet – RS-01',
    },
  },
  signatories: [{ role_label: 'Sponsor', name: 'B. Osei', status: 'pending', is_mandatory: true }],
  attachments: [{ title: 'Network diagram', file_name: 'net.pdf', is_image: false, url: null }],
})

describe('register document renderers', () => {
  it('Word: has the TOC field, numbered headings, sign-off table, appendices and annexures', async () => {
    const blob = await buildRegisterDocumentWordBlob(model)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const xml = await zip.file('word/document.xml').async('string')
    expect(xml).toContain('TOC \\h \\o')
    expect(xml).toContain('1  Introduction')
    expect(xml).toContain('2  Glossary of Terms')
    expect(xml).toContain('3.1  Activity Runsheet')
    expect(xml).toContain('Project Role')
    expect(xml).toContain('Appendix A – Runsheet')
    expect(xml).toContain('Annexure A – Network diagram')
    const settings = await zip.file('word/settings.xml').async('string')
    expect(settings).toContain('updateFields')
  })

  it('PDF: cover, control, contents, sections, appendices and annexure pages', async () => {
    const doc = await buildRegisterDocumentPdf(model)
    // cover + control + 1 contents page + sections + appendices + annexures
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(6)
  })
})

describe('linked sub-sections render as tables and sub-headed lists (v1334)', () => {
  const linkedModel = {
    ...model,
    sections: [{
      number: '1', title: 'Product Takeover',
      items: [{
        number: '1.1', label: 'Customers', kind: 'linked', intro: 'All customers.',
        facts: [{ label: 'Product / Data Owner', value: 'Amina Diallo' }],
        groups: [{ label: 'Scope Criteria', kind: 'list', items: ['Active customers'] }],
        items: [],
      }],
    }],
  }
  it('Word: facts table and group heading', async () => {
    const blob = await buildRegisterDocumentWordBlob(linkedModel)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const xml = await zip.file('word/document.xml').async('string')
    expect(xml).toContain('Amina Diallo')
    expect(xml).toContain('>Detail<')
    expect(xml).toContain('Scope Criteria')
    expect(xml).not.toContain('Scope Criteria: Active customers')
  })
  it('PDF: builds', async () => {
    const doc = await buildRegisterDocumentPdf(linkedModel)
    expect(doc.getNumberOfPages()).toBeGreaterThan(2)
  })
})

describe('workflow chains render as numbered steps (v1366)', () => {
  const flowModel = buildRegisterDocumentModel({
    register: {
      register_key: 'fin_testing_strategy', label: 'Testing Strategy', status_workflow: [{ key: 'draft', label: 'Draft' }],
      fields: [{ field_key: 'defect_workflow', field_label: 'Defect Workflow', field_type: 'long_text', field_group: 'Defect Management' }],
    },
    record: {
      id: 'r2', title: 'Testing Strategy', status: 'draft',
      field_values: { defect_workflow: 'New → Triaged → Fixed → Closed. Daily triage with the vendor.' },
    },
  })

  it('PDF: draws numbered steps and never the raw arrow', async () => {
    const pdf = (await buildRegisterDocumentPdf(flowModel)).output()
    expect(pdf).toContain('(1. New)')
    expect(pdf).toContain('(4. Closed)')
    expect(pdf).toContain('Daily triage with the vendor.')
    expect(pdf).not.toContain('→')
  })

  it('Word: numbered steps', async () => {
    const zip = await JSZip.loadAsync(await (await buildRegisterDocumentWordBlob(flowModel)).arrayBuffer())
    const xml = await zip.file('word/document.xml').async('string')
    expect(xml).toContain('1. New')
    expect(xml).toContain('3. Fixed')
  })
})

describe('pagination keeps headings with their content (v1367)', () => {
  const pagesWith = (doc, needle) => {
    const out = []
    for (let p = 1; p <= doc.getNumberOfPages(); p += 1) if (doc.internal.pages[p].join('\n').includes(`(${needle})`)) out.push(p)
    return out
  }
  const modelWith = (fillerLines, rowCount = 3) => ({
    ...model,
    appendices: [], annexures: [],
    sections: [{
      number: '12', title: 'Timeline & RACI',
      items: [
        { number: '12.0', label: 'Filler', kind: 'list', items: Array.from({ length: fillerLines }, (_, i) => `Filler line ${i + 1}`) },
        { number: '12.1', label: 'Testing Timeline', kind: 'table', headers: ['Phase / Milestone', 'Start', 'End', 'Notes'],
          rows: Array.from({ length: rowCount }, (_, i) => [`Phase ${i + 1}`, '2026-09-01', '2026-09-30', '']) },
      ],
    }],
  })

  it('never leaves a heading or table header at the foot of a page without its first row', async () => {
    for (let filler = 30; filler <= 60; filler += 1) {
      const doc = await buildRegisterDocumentPdf(modelWith(filler))
      const heading = pagesWith(doc, '12.1  Testing Timeline')[0]
      const header = pagesWith(doc, 'Phase / Milestone')[0]
      const firstRow = pagesWith(doc, 'Phase 1')[0]
      expect([filler, header, firstRow]).toEqual([filler, heading, heading])
    }
  })

  it('repeats the header row when a table continues on the next page', async () => {
    const doc = await buildRegisterDocumentPdf(modelWith(0, 80))
    const rowPages = new Set([...Array(80).keys()].flatMap((i) => pagesWith(doc, `Phase ${i + 1}`)))
    expect(rowPages.size).toBeGreaterThan(1)
    for (const p of rowPages) expect(pagesWith(doc, 'Phase / Milestone')).toContain(p)
  })
})
