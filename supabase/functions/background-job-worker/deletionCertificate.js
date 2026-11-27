/**
 * v1358 Slice 3b (PRD D15) — the organisation deletion certificate as a small PDF, written by hand (no
 * library, like exportZip.js): A4 pages, Helvetica / Helvetica-Bold (WinAnsi), text wrapped and paginated.
 * Input is public.organisation_deletion_certificate_data (dates already in the organisation's own format).
 */

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 56
const TEXT_W = PAGE_W - 2 * MARGIN

const REPLACE = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '•': '-', ' ': ' ', '→': '->' }

/** Text the standard PDF fonts can show: typographic punctuation simplified, other characters outside Latin-1 as "?". */
export function pdfSafe(text) {
  return Array.from(String(text ?? ''))
    .map((c) => REPLACE[c] ?? (c.charCodeAt(0) > 255 ? '?' : c))
    .join('')
    .replace(/[\r\n\t]+/g, ' ')
}

const escape = (text) => pdfSafe(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** Wrap to the page width (Helvetica averages about half the font size per character). */
export function wrap(text, size, width = TEXT_W) {
  const max = Math.max(10, Math.floor(width / (size * 0.5)))
  const words = pdfSafe(text).split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    let w = word
    while (w.length > max) {
      if (line) { lines.push(line); line = '' }
      lines.push(w.slice(0, max))
      w = w.slice(max)
    }
    if (!line) line = w
    else if (line.length + 1 + w.length <= max) line += ` ${w}`
    else { lines.push(line); line = w }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const plural = (n, one, many) => `${Number(n || 0).toLocaleString('en-GB')} ${Number(n) === 1 ? one : many}`
const keepFor = (days) => {
  const n = Number(days)
  if (!n) return 'until Housekeeping removes it'
  if (n % 365 === 0 || n >= 3650) return `for up to ${Math.round(n / 365)} years`
  return `for up to ${n} days`
}

/** The certificate's paragraphs: [{ text, bold?, size?, before? }]. */
export function certificateBlocks(cert) {
  const c = cert || {}
  const blocks = []
  const h = (text) => blocks.push({ text, bold: true, size: 12, before: 14 })
  const p = (text, extra = {}) => blocks.push({ text, size: 10, before: 4, ...extra })
  const field = (label, value) => { if (value) p(`${label}: ${value}`) }

  blocks.push({ text: 'Organisation deletion certificate', bold: true, size: 18, before: 0 })
  p(`Certificate reference: ${c.reference || '-'}`, { before: 8 })
  p(`This certifies that the data of ${c.organisation || 'the organisation'} was permanently deleted on ${c.deleted_on || '-'}, as its Account Owner asked. It cannot be recovered.`, { before: 10 })

  h('The request')
  field('Organisation', c.organisation)
  field('Deletion request', c.request_reference)
  field('Asked by', [c.requested_by, c.requested_on].filter(Boolean).join(', on '))
  field('Reason', c.reason)
  field('Approved by our support team on', c.approved_on)
  field('Confirmed by email link', [c.confirmed_by, c.confirmed_on].filter(Boolean).join(', on '))
  field('Locked (members could no longer use it) on', c.locked_on)
  field('Deleted on', c.deleted_on)

  h('What was deleted')
  p(`${plural(c.rows_deleted, 'record', 'records')} in ${plural(c.table_count, 'table', 'tables')}, and ${plural(c.files_removed, 'uploaded file', 'uploaded files')}.`)
  if (Number(c.files_not_removed) > 0) p(`${plural(c.files_not_removed, 'file', 'files')} could not be removed automatically; our support team removes them.`)
  p(`People: ${plural(c.members_removed, 'member account', 'member accounts')} removed (they belonged to no other organisation). ${plural(c.members_kept, 'person', 'people')} kept their own account because they use another organisation or the Simulator; their membership of this organisation ended.`)
  const tables = Array.isArray(c.tables) ? c.tables : []
  if (tables.length) {
    p('Records deleted, by table:', { before: 8, bold: true })
    for (const t of tables) p(`- ${t.table}: ${Number(t.rows || 0).toLocaleString('en-GB')}`, { before: 1, size: 9 })
  }

  h('What we keep, and why')
  const kept = Array.isArray(c.kept) ? c.kept : []
  if (!kept.length) p('Nothing apart from this record.')
  for (const k of kept) {
    const reason = String(k.reason || '').replace(/\s*\(D\d+\)\s*$/, '')
    p(`- ${k.table}: ${Number(k.rows || 0).toLocaleString('en-GB')} ${Number(k.rows) === 1 ? 'record' : 'records'}, ${keepFor(k.keep_days)}. ${reason}`.trim(), { before: 2 })
  }
  p('- This deletion record, so the deletion can be shown later.', { before: 2 })
  p('Kept records are visible only to our system administrators.', { before: 6 })

  p(`Issued automatically on ${c.deleted_on || '-'}.`, { before: 18, size: 9 })
  return blocks
}

/** Lay the blocks out on pages: [[{ x, y, size, bold, text }]]. */
export function layout(blocks) {
  const pages = [[]]
  let y = PAGE_H - MARGIN
  for (const b of blocks) {
    const size = b.size || 10
    const lead = Math.round(size * 1.4)
    y -= b.before || 0
    for (const line of wrap(b.text, size)) {
      if (y - lead < MARGIN) { pages.push([]); y = PAGE_H - MARGIN }
      y -= lead
      pages[pages.length - 1].push({ x: MARGIN, y, size, bold: Boolean(b.bold), text: line })
    }
  }
  return pages
}

/** PDF bytes for the certificate. */
export function buildCertificatePdf(cert) {
  const pages = layout(certificateBlocks(cert))
  const objects = []
  const kids = pages.map((_, i) => `${5 + 2 * i} 0 R`).join(' ')
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  pages.forEach((lines, i) => {
    const page = 5 + 2 * i
    const stream = lines
      .map((l) => `BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf ${l.x} ${l.y} Td (${escape(l.text)}) Tj ET`)
      .join('\n')
    objects[page] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${page + 1} 0 R >>`
    objects[page + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  let out = '%PDF-1.4\n'
  const offsets = []
  for (let n = 1; n < objects.length; n += 1) {
    offsets[n] = out.length
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`
  }
  const xref = out.length
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let n = 1; n < objects.length; n += 1) out += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff
  return bytes
}

/** Base64 for an email attachment (works in Deno and Node). */
export function toBase64(bytes) {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(binary)
}
