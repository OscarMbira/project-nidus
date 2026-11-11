/**
 * PDF renderer for the complete register document (v1318) — same layout as the Word renderer:
 * cover page, Document Control (information, version history, sign-off table with signature
 * images), Table of Contents with page numbers, numbered sections, Appendices, Annexures.
 *
 * Page numbers in the contents are exact: the contents pages are reserved first (their count is
 * known from the model), the body is laid out while recording where each entry lands, then the
 * contents are written into the reserved pages.
 */
import { loadAttachmentImageForEmbed, resolveBranding } from './exportUtils'
import { pdfSafeText } from './textFlow'

const MARGIN = 48
const LINE = 14

function hexToRgb(hex) {
  const h = String(hex || '1a365d').replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 26, parseInt(h.slice(2, 4), 16) || 54, parseInt(h.slice(4, 6), 16) || 93]
}

function imageFormat(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp|gif)/i.exec(dataUrl || '')
  if (!m) return null
  const t = m[1].toLowerCase()
  return t === 'jpg' || t === 'jpeg' ? 'JPEG' : t.toUpperCase()
}

/** Builds the jsPDF document for a model. Returns the jsPDF instance. */
export async function buildRegisterDocumentPdf(model, branding = null) {
  const { jsPDF } = await import('jspdf')
  const { footerText, headerHex } = resolveBranding(branding)
  const [hr, hg, hb] = hexToRgb(headerHex)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  // The built-in fonts cannot draw arrows and similar symbols (they print as garbage), so every
  // string is mapped to drawable text first (v1366).
  const drawText = doc.text.bind(doc)
  const splitText = doc.splitTextToSize.bind(doc)
  doc.text = (value, ...rest) => drawText(Array.isArray(value) ? value.map(pdfSafeText) : pdfSafeText(value), ...rest)
  doc.splitTextToSize = (value, ...rest) => splitText(pdfSafeText(value), ...rest)
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const maxW = W - MARGIN * 2
  let y = MARGIN
  const pageOf = {}

  const newPage = () => { doc.addPage(); y = MARGIN }
  const ensure = (needed) => { if (y + needed > H - MARGIN - 20) newPage() }
  const write = (value, { size = 10, bold = false, italic = false, color = 0, indent = 0, after = 4 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const wrapped = doc.splitTextToSize(String(value ?? ''), maxW - indent)
    // Orphan control: never leave a paragraph's first line alone at the bottom of a page.
    ensure(Math.min(wrapped.length, 2) * (size + 4))
    wrapped.forEach((line) => {
      ensure(size + 4)
      doc.text(line, MARGIN + indent, y)
      y += size + 4
    })
    y += after
    doc.setTextColor(0)
  }
  const banner = (title) => {
    ensure(34)
    doc.setFillColor(hr, hg, hb)
    doc.rect(MARGIN, y - 14, maxW, 22, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(255)
    doc.text(title, MARGIN + 8, y + 1)
    doc.setTextColor(0)
    y += 22
  }
  // ── Pagination helpers (v1367): keep headings with what follows, like Word's "keep with next". ──
  const PAGE_BOTTOM = () => H - MARGIN - 20
  /** Height a paragraph would take. */
  const textHeight = (value, { size = 10, indent = 0, after = 4, maxLines = Infinity } = {}) => {
    doc.setFontSize(size)
    const n = Math.min(doc.splitTextToSize(String(value ?? ''), maxW - indent).length, maxLines)
    return n * (size + 4) + after
  }
  /** Height of one table row (cells wrapped to their column widths). */
  const rowHeight = (cells, widths, header = false) => {
    doc.setFont('helvetica', header ? 'bold' : 'normal')
    doc.setFontSize(9)
    return Math.max(1, ...cells.map((c, i) => doc.splitTextToSize(String(c ?? ''), widths[i] - 8).length)) * 11 + 8
  }
  /** Header row plus first row of a table — the least that may start a table on a page. */
  const tableStartHeight = (headers, rows, fractions) => {
    const widths = fractions.map((f) => f * maxW)
    return (headers ? rowHeight(headers, widths, true) : 0) + (rows.length ? rowHeight(rows[0], widths) : 0)
  }
  /** The first part of an item's content that must stay on the same page as its heading. */
  const itemStartHeight = (item) => {
    const even = (cols) => cols.map(() => 1 / cols.length)
    if (item.kind === 'table') return tableStartHeight(item.headers, item.rows, even(item.headers))
    if (item.kind === 'linked') {
      if (item.intro) return textHeight(item.intro, { maxLines: 2 })
      if (item.facts?.length) return tableStartHeight(['Detail', 'Value'], item.facts.slice(0, 1).map((f) => [f.label, f.value]), [0.35, 0.65])
      return 20
    }
    if (item.kind === 'list') return textHeight(item.intro || `• ${item.items[0] ?? ''}`, { indent: 10, maxLines: 2 })
    if (item.kind === 'blocks') {
      const first = item.blocks[0]
      return first?.type === 'steps' ? 2 * 14 : textHeight(first?.text, { maxLines: 2 })
    }
    if (item.kind === 'paragraphs') return textHeight(item.items[0], { maxLines: 2 })
    return textHeight(item.text, { maxLines: 2 })
  }
  const itemHeadingHeight = (item) => textHeight(`${item.number}  ${item.label}`, { size: 11, after: 2 })

  /** Bordered table; columns as width fractions. Rows never split; the header row repeats on each new page. */
  const tableRows = (headers, rows, fractions) => {
    const widths = fractions.map((f) => f * maxW)
    // Keep the header row with at least the first row.
    ensure(tableStartHeight(headers, rows, fractions))
    const drawRow = (cells, header) => {
      doc.setFont('helvetica', header ? 'bold' : 'normal')
      doc.setFontSize(9)
      const wrapped = cells.map((c, i) => doc.splitTextToSize(String(c ?? ''), widths[i] - 8))
      const height = Math.max(...wrapped.map((w) => w.length)) * 11 + 8
      if (y + height > PAGE_BOTTOM()) {
        newPage()
        if (!header && headers) drawRow(headers, true)
      }
      let x = MARGIN
      wrapped.forEach((linesIn, i) => {
        if (header) { doc.setFillColor(hr, hg, hb); doc.rect(x, y, widths[i], height, 'F'); doc.setTextColor(255) }
        doc.setDrawColor(190)
        doc.rect(x, y, widths[i], height)
        linesIn.forEach((line, li) => doc.text(line, x + 4, y + 12 + li * 11))
        doc.setTextColor(0)
        x += widths[i]
      })
      y += height
    }
    if (headers) drawRow(headers, true)
    rows.forEach((r) => drawRow(r, false))
    y += 10
  }

  // ── Cover (page 1) ──
  y = 200
  if (model.organisationName) { doc.setFontSize(14); doc.setTextColor(100); doc.text(model.organisationName, W / 2, y, { align: 'center' }); y += 40 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(0)
  doc.splitTextToSize(model.title, maxW).forEach((line) => { doc.text(line, W / 2, y, { align: 'center' }); y += 30 })
  if (model.documentType) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(14)
    doc.setTextColor(hr, hg, hb)
    doc.text(model.documentType, W / 2, y + 6, { align: 'center' })
    doc.setTextColor(0)
    y += 50
  }
  if (model.cover.length) tableRows(null, model.cover.map((r) => [r.label, r.value]), [0.35, 0.65])

  // ── Document Control (page 2) ──
  newPage()
  pageOf.control = doc.getNumberOfPages()
  banner('Document Control')
  if (model.information.length) {
    write('Document information', { bold: true, size: 11 })
    tableRows(null, model.information.map((r) => [r.label, r.value]), [0.35, 0.65])
  }
  if (model.summary) {
    write('Summary', { bold: true, size: 11 })
    model.summary.split('\n').filter(Boolean).forEach((line) => write(line))
  }
  if (model.versionHistory.length) {
    const versions = model.versionHistory.map((v) => [v.version, v.date, v.author, v.change])
    ensure(textHeight('Version history', { size: 11 }) + tableStartHeight(['Version', 'Date', 'Author', 'Change'], versions, [0.12, 0.18, 0.2, 0.5]))
    write('Version history', { bold: true, size: 11 })
    tableRows(['Version', 'Date', 'Author', 'Change'], model.versionHistory.map((v) => [v.version, v.date, v.author, v.change]), [0.12, 0.18, 0.2, 0.5])
  }
  if (model.relatedDocuments.length) {
    write('Related documents', { bold: true, size: 11 })
    model.relatedDocuments.forEach((line) => write(`• ${line}`, { indent: 8 }))
  }
  write('Sign-off', { bold: true, size: 11 })
  if (model.signoff.length === 0) {
    write('No signatories recorded.', { italic: true, color: 110 })
  } else {
    const widths = [0.26, 0.26, 0.3, 0.18].map((f) => f * maxW)
    const rowH = 52
    const header = ['Name', 'Project Role', 'Signature', 'Date']
    ensure(20)
    let x = MARGIN
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    header.forEach((h, i) => {
      doc.setFillColor(hr, hg, hb); doc.rect(x, y, widths[i], 18, 'F')
      doc.setTextColor(255); doc.text(h, x + 4, y + 12); doc.setTextColor(0)
      x += widths[i]
    })
    y += 18
    for (const s of model.signoff) {
      ensure(rowH)
      x = MARGIN
      doc.setFont('helvetica', 'normal')
      const cells = [s.name, s.role, null, s.date]
      for (let i = 0; i < 4; i += 1) {
        doc.setDrawColor(190)
        doc.rect(x, y, widths[i], rowH)
        if (i === 2) {
          const loaded = s.signatureUrl ? await loadAttachmentImageForEmbed(s.signatureUrl, widths[i] - 10, rowH - 10) : null
          const format = loaded ? imageFormat(loaded.dataUrl) : null
          if (loaded && format) {
            try { doc.addImage(loaded.dataUrl, format, x + 5, y + 5, loaded.width, loaded.height) } catch { /* fall back to the note */ }
          } else if (s.note) {
            doc.setFont('helvetica', 'italic'); doc.setTextColor(110)
            doc.text(doc.splitTextToSize(s.note, widths[i] - 8), x + 4, y + 14)
            doc.setTextColor(0); doc.setFont('helvetica', 'normal')
          }
        } else {
          doc.text(doc.splitTextToSize(String(cells[i] || ''), widths[i] - 8), x + 4, y + 14)
        }
        x += widths[i]
      }
      y += rowH
    }
    y += 10
  }

  // ── Reserve the contents pages ──
  const linesPerPage = Math.floor((H - MARGIN * 2 - 50) / LINE)
  const tocPageCount = Math.max(1, Math.ceil(model.toc.length / linesPerPage))
  const tocFirstPage = doc.getNumberOfPages() + 1
  for (let i = 0; i < tocPageCount; i += 1) newPage()

  // ── Numbered sections ──
  newPage()
  for (const section of model.sections) {
    // A main section starts on a new page when little of the current page is left (v1367) …
    if (y > MARGIN && PAGE_BOTTOM() - y < H * 0.25) newPage()
    // … and its banner always stays with its first heading and the start of that content.
    const first = section.items[0]
    const glossaryStart = section.glossary ? tableStartHeight(['Term', 'Definition'], section.glossary.slice(0, 1).map((g) => [g.term, g.definition]), [0.3, 0.7]) : 0
    ensure(34 + (first ? itemHeadingHeight(first) + itemStartHeight(first) : glossaryStart))
    pageOf[`s${section.number}`] = doc.getNumberOfPages()
    banner(`${section.number}  ${section.title}`)
    if (section.glossary) tableRows(['Term', 'Definition'], section.glossary.map((g) => [g.term, g.definition]), [0.3, 0.7])
    for (const item of section.items) {
      // Keep the sub-heading with the start of its content (never alone at the foot of a page).
      ensure(itemHeadingHeight(item) + itemStartHeight(item))
      pageOf[`i${item.number}`] = doc.getNumberOfPages()
      write(`${item.number}  ${item.label}`, { bold: true, size: 11, after: 2 })
      if (item.kind === 'linked') {
        // Linked record sub-section (v1334): intro, Detail | Value table, sub-headed lists / tables.
        if (item.intro) write(item.intro, { after: 4 })
        if (item.facts?.length) tableRows(['Detail', 'Value'], item.facts.map((f) => [f.label, f.value]), [0.35, 0.65])
        for (const group of item.groups || []) {
          const groupStart = group.kind === 'table'
            ? tableStartHeight(group.headers, group.rows, group.headers.map(() => 1 / group.headers.length))
            : textHeight(group.items?.[0], { indent: 10, maxLines: 2 })
          ensure(textHeight(group.label, { after: 2 }) + groupStart)
          write(group.label, { bold: true, after: 2 })
          if (group.kind === 'table') tableRows(group.headers, group.rows, group.headers.map(() => 1 / group.headers.length))
          else if (group.kind === 'paragraphs') group.items.forEach((line) => write(line))
          else group.items.forEach((line) => write(`• ${line}`, { indent: 10, after: 1 }))
          y += 3
        }
      }
      else if (item.kind === 'table') tableRows(item.headers, item.rows, item.headers.map(() => 1 / item.headers.length))
      else if (item.kind === 'list') {
        if (item.intro) write(item.intro, { after: 3 })
        item.items.forEach((line) => write(`• ${line}`, { indent: 10, after: 1 }))
      }
      else if (item.kind === 'paragraphs') item.items.forEach((line) => write(line))
      else if (item.kind === 'blocks') {
        // Workflow chain as numbered steps between its paragraphs (v1366).
        for (const block of item.blocks) {
          if (block.type === 'steps') block.items.forEach((step, n) => write(`${n + 1}. ${step}`, { indent: 10, after: 1 }))
          else write(block.text)
        }
      }
      else write(item.text)
      y += 4
    }
    y += 8
  }

  // ── Appendices ──
  if (model.appendices.length) {
    newPage()
    pageOf.appendices = doc.getNumberOfPages()
    banner('Appendices')
    model.appendices.forEach((a) => {
      pageOf[`app${a.letter}`] = doc.getNumberOfPages()
      write(`Appendix ${a.letter} – ${a.title}`, { bold: true, size: 11, after: 2 })
      if (a.reference) write(a.reference)
    })
  }

  // ── Annexures ──
  if (model.annexures.length) {
    newPage()
    pageOf.annexures = doc.getNumberOfPages()
    banner('Annexures')
    for (const a of model.annexures) {
      ensure(60)
      pageOf[`anx${a.letter}`] = doc.getNumberOfPages()
      write(`Annexure ${a.letter} – ${a.title}`, { bold: true, size: 11, after: 4 })
      const loaded = a.isImage && a.url ? await loadAttachmentImageForEmbed(a.url, maxW, 520) : null
      const format = loaded ? imageFormat(loaded.dataUrl) : null
      if (loaded && format) {
        ensure(loaded.height + 10)
        try {
          doc.addImage(loaded.dataUrl, format, MARGIN + (maxW - loaded.width) / 2, y, loaded.width, loaded.height)
          y += loaded.height + 8
        } catch { /* listed by name below */ }
      }
      for (const block of a.content || []) {
        if (block.type === 'text') write(block.text, { after: 3 })
        else {
          const cols = Math.max(block.headers?.length || 0, ...block.rows.map((r) => r.length))
          tableRows(block.headers?.length ? block.headers : null, block.rows, Array(cols).fill(1 / cols))
        }
      }
      write(`File: ${a.fileName}${a.sizeLabel ? ` (${a.sizeLabel})` : ''}`, { italic: true, color: 110, size: 9 })
    }
  }

  // ── Contents (fill the reserved pages) ──
  let tocPage = tocFirstPage
  doc.setPage(tocPage)
  y = MARGIN
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('Table of Contents', MARGIN, y + 6)
  y += 34
  doc.setFontSize(10)
  model.toc.forEach((entry) => {
    if (y > H - MARGIN - 20 && tocPage < tocFirstPage + tocPageCount - 1) {
      tocPage += 1
      doc.setPage(tocPage)
      y = MARGIN
    }
    const indent = entry.level === 1 ? 0 : 16
    doc.setFont('helvetica', entry.level === 1 ? 'bold' : 'normal')
    const label = doc.splitTextToSize(entry.title, maxW - indent - 40)[0]
    const page = String(pageOf[entry.key] || '')
    doc.text(label, MARGIN + indent, y)
    doc.text(page, W - MARGIN, y, { align: 'right' })
    if (pageOf[entry.key]) doc.link(MARGIN + indent, y - 10, maxW - indent, 13, { pageNumber: pageOf[entry.key] })
    y += LINE
  })

  // ── Footer on every page except the cover ──
  const total = doc.getNumberOfPages()
  for (let p = 2; p <= total; p += 1) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120)
    doc.text(`${model.title} · ${footerText}`, MARGIN, H - 24)
    doc.text(`Page ${p} of ${total}`, W - MARGIN, H - 24, { align: 'right' })
    doc.setTextColor(0)
  }
  return doc
}

export async function exportRegisterDocumentToPdf(model, branding = null) {
  const doc = await buildRegisterDocumentPdf(model, branding)
  doc.save(`${model.baseFilename || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`)
}
