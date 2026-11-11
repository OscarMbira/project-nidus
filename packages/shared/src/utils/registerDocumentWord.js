/**
 * Word renderer for the complete register document (v1318) — lays out the model from
 * registerDocumentModel.js: cover page, Document Control (information, version history, sign-off
 * table with signature images), a real Table of Contents, numbered Heading 1 / Heading 2
 * sections, Appendices and Annexures (images embedded). Page numbers in the footer.
 *
 * The Table of Contents is a Word field: it is pre-filled with the entries and Word fills in the
 * page numbers when the file is opened (the user may be asked to update fields — answer Yes).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { loadAttachmentImageForEmbed, resolveBranding } from './exportUtils'

const GREY = '666666'
const thin = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const borders = { top: thin, bottom: thin, left: thin, right: thin }

const text = (value, opts = {}) => new TextRun({ text: String(value ?? ''), ...opts })
const para = (value, opts = {}) => new Paragraph({ children: [text(value, opts.run)], spacing: { after: 120 }, ...opts.paragraph })
const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

function cell(children, { header = false, fill = null, width = null } = {}) {
  return new TableCell({
    // Header-row paragraphs keep with next, so a header row never sits alone at the foot of a page (v1367).
    children: Array.isArray(children) ? children : [new Paragraph({ keepNext: header, children: [text(children, { bold: header, color: header ? 'FFFFFF' : undefined, size: 20 })] })],
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    ...(fill ? { shading: { type: ShadingType.CLEAR, fill } } : {}),
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  })
}

function table(headers, rows, headerHex, widths = []) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, fill: headerHex, width: widths[i] })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, { width: widths[i] })) })),
    ],
  })
}

/** Table with no header row (e.g. a form taken from a Word annexure). */
function plainTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c) => cell(c)) })),
  })
}

function keyValueTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r) => new TableRow({
      cantSplit: true,
      children: [cell(r.label, { fill: 'F2F2F2', width: 30 }), cell(r.value, { width: 70 })],
    })),
  })
}

/** Linked record sub-section (v1334): introduction, Detail | Value table, then each list under its own sub-heading. */
function linkedBody(item, headerHex) {
  const out = []
  if (item.intro) out.push(para(item.intro))
  if (item.facts?.length) {
    out.push(table(['Detail', 'Value'], item.facts.map((f) => [f.label, f.value]), headerHex, [35, 65]))
    out.push(new Paragraph({ spacing: { after: 120 } }))
  }
  for (const group of item.groups || []) {
    out.push(new Paragraph({ keepNext: true, keepLines: true, children: [text(group.label, { bold: true })], spacing: { before: 120, after: 60 } }))
    if (group.kind === 'table') {
      out.push(table(group.headers, group.rows, headerHex))
      out.push(new Paragraph({ spacing: { after: 120 } }))
    } else if (group.kind === 'paragraphs') {
      group.items.forEach((line) => out.push(para(line)))
    } else {
      group.items.forEach((line) => out.push(new Paragraph({ children: [text(line)], bullet: { level: 0 }, spacing: { after: 60 } })))
    }
  }
  return out
}

function itemBody(item, headerHex) {
  if (item.kind === 'linked') return linkedBody(item, headerHex)
  if (item.kind === 'table') return [table(item.headers, item.rows, headerHex), new Paragraph({ spacing: { after: 120 } })]
  if (item.kind === 'list') {
    return [
      ...(item.intro ? [para(item.intro)] : []),
      ...item.items.map((line) => new Paragraph({ children: [text(line)], bullet: { level: 0 }, spacing: { after: 60 } })),
    ]
  }
  if (item.kind === 'paragraphs') return item.items.map((line) => para(line))
  if (item.kind === 'blocks') {
    // Workflow chain as numbered steps between its paragraphs (v1366).
    return item.blocks.flatMap((block) => (block.type === 'steps'
      ? block.items.map((step, n) => new Paragraph({ children: [text(`${n + 1}. ${step}`)], indent: { left: 360 }, spacing: { after: 60 } }))
      : [para(block.text)]))
  }
  return [para(item.text)]
}

async function imageParagraph(url, maxW, maxH) {
  if (!url) return null
  const loaded = await loadAttachmentImageForEmbed(url, maxW, maxH)
  if (!loaded) return null
  return new Paragraph({
    children: [new ImageRun({ data: loaded.bytes, transformation: { width: loaded.width, height: loaded.height } })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  })
}

/** Builds the .docx Blob for a document model. */
export async function buildRegisterDocumentWordBlob(model, branding = null) {
  const { footerText, headerHex } = resolveBranding(branding)
  const body = []

  // ── Cover ──
  body.push(new Paragraph({ spacing: { before: 2400 } }))
  if (model.organisationName) body.push(para(model.organisationName, { run: { size: 28, color: GREY }, paragraph: { alignment: AlignmentType.CENTER } }))
  body.push(new Paragraph({ children: [text(model.title, { bold: true, size: 48 })], alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 } }))
  if (model.documentType) body.push(para(model.documentType, { run: { size: 28, color: headerHex }, paragraph: { alignment: AlignmentType.CENTER } }))
  body.push(new Paragraph({ spacing: { after: 600 } }))
  if (model.cover.length) body.push(keyValueTable(model.cover))
  body.push(pageBreak())

  // ── Document Control ──
  body.push(new Paragraph({ text: 'Document Control', heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { after: 200 } }))
  if (model.information.length) {
    body.push(para('Document information', { run: { bold: true }, paragraph: { keepNext: true } }))
    body.push(keyValueTable(model.information))
  }
  if (model.summary) {
    body.push(para('Summary', { run: { bold: true }, paragraph: { keepNext: true, spacing: { before: 200, after: 80 } } }))
    model.summary.split('\n').filter(Boolean).forEach((line) => body.push(para(line)))
  }
  if (model.versionHistory.length) {
    body.push(para('Version history', { run: { bold: true }, paragraph: { keepNext: true, spacing: { before: 240, after: 80 } } }))
    body.push(table(['Version', 'Date', 'Author', 'Change'], model.versionHistory.map((v) => [v.version, v.date, v.author, v.change]), headerHex, [12, 18, 20, 50]))
  }
  if (model.relatedDocuments.length) {
    body.push(para('Related documents', { run: { bold: true }, paragraph: { keepNext: true, spacing: { before: 240, after: 80 } } }))
    model.relatedDocuments.forEach((line) => body.push(new Paragraph({ children: [text(line)], bullet: { level: 0 } })))
  }
  body.push(para('Sign-off', { run: { bold: true }, paragraph: { keepNext: true, spacing: { before: 240, after: 80 } } }))
  if (model.signoff.length === 0) {
    body.push(para('No signatories recorded.', { run: { italics: true, color: GREY } }))
  } else {
    const rows = []
    for (const s of model.signoff) {
      const image = await imageParagraph(s.signatureUrl, 120, 45)
      rows.push(new TableRow({
        children: [
          cell(s.name, { width: 26 }),
          cell(s.role, { width: 26 }),
          cell(image ? [image] : [new Paragraph({ children: [text(s.note, { italics: true, color: GREY, size: 18 })] })], { width: 30 }),
          cell(s.date, { width: 18 }),
        ],
      }))
    }
    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Name', 'Project Role', 'Signature', 'Date'].map((h) => cell(h, { header: true, fill: headerHex })) }),
        ...rows,
      ],
    }))
  }
  body.push(pageBreak())

  // ── Table of Contents ──
  body.push(new Paragraph({ children: [text('Table of Contents', { bold: true, size: 32 })], spacing: { after: 200 } }))
  body.push(new TableOfContents('Table of Contents', {
    hyperlink: true,
    headingStyleRange: '1-2',
    cachedEntries: model.toc.map((t) => ({ title: t.title, level: t.level })),
  }))
  body.push(pageBreak())

  // ── Numbered sections ──
  model.sections.forEach((section, index) => {
    if (index > 0) body.push(new Paragraph({ spacing: { before: 240 } }))
    body.push(new Paragraph({ text: `${section.number}  ${section.title}`, heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { after: 160 } }))
    if (section.glossary) {
      body.push(table(['Term', 'Definition'], section.glossary.map((g) => [g.term, g.definition]), headerHex, [30, 70]))
    }
    section.items.forEach((item) => {
      body.push(new Paragraph({ text: `${item.number}  ${item.label}`, heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 160, after: 80 } }))
      body.push(...itemBody(item, headerHex))
    })
  })

  // ── Appendices ──
  if (model.appendices.length) {
    body.push(pageBreak())
    body.push(new Paragraph({ text: 'Appendices', heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { after: 160 } }))
    model.appendices.forEach((a) => {
      body.push(new Paragraph({ text: `Appendix ${a.letter} – ${a.title}`, heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 160, after: 80 } }))
      if (a.reference) body.push(para(a.reference))
    })
  }

  // ── Annexures ──
  if (model.annexures.length) {
    body.push(pageBreak())
    body.push(new Paragraph({ text: 'Annexures', heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { after: 160 } }))
    for (const a of model.annexures) {
      body.push(new Paragraph({ text: `Annexure ${a.letter} – ${a.title}`, heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 200, after: 80 } }))
      const image = a.isImage ? await imageParagraph(a.url, 450, 560) : null
      if (image) body.push(image)
      for (const block of a.content || []) {
        if (block.type === 'text') body.push(para(block.text))
        else if (block.headers?.length) body.push(table(block.headers, block.rows, headerHex), new Paragraph({ spacing: { after: 120 } }))
        else body.push(plainTable(block.rows), new Paragraph({ spacing: { after: 120 } }))
      }
      body.push(para(`File: ${a.fileName}${a.sizeLabel ? ` (${a.sizeLabel})` : ''}`, { run: { italics: true, color: GREY, size: 18 } }))
    }
  }

  const doc = new Document({
    features: { updateFields: true },
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              text(`${model.title} · ${footerText} · Page `, { size: 16, color: GREY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
              text(' of ', { size: 16, color: GREY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
            ],
          })],
        }),
      },
      children: body,
    }],
  })
  return Packer.toBlob(doc)
}

/** Builds and downloads the Word document. */
export async function exportRegisterDocumentToWord(model, branding = null) {
  const blob = await buildRegisterDocumentWordBlob(model, branding)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${model.baseFilename || 'document'}_${new Date().toISOString().split('T')[0]}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
