/**
 * Readable content of a Word or Excel annexure for the complete document export (v1318 / v1335),
 * so an attached RACI matrix or hand-off form shows its content, not just its file name.
 *
 *   Excel (.xlsx): the first sheet as a table — title lines above the header row are kept as
 *                  text, empty columns dropped, at most MAX_ROWS rows.
 *   Word (.docx):  paragraphs and tables in reading order.
 *
 * Returns { blocks: [{ type: 'text', text } | { type: 'table', headers, rows }] } or null when the
 * file type is not supported or cannot be read (the export then lists the file by name).
 */

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_ROWS = 100

export function hasReadableContent(mimeType, fileName = '') {
  const name = String(fileName).toLowerCase()
  return mimeType === XLSX_MIME || mimeType === DOCX_MIME || name.endsWith('.xlsx') || name.endsWith('.docx')
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

/** Sheet rows (arrays) → blocks: leading title lines, then a header row and data rows. */
export function sheetRowsToBlocks(rawRows) {
  const rows = (rawRows || []).map((r) => (r || []).map(clean)).filter((r) => r.some(Boolean))
  if (rows.length === 0) return []
  const width = Math.max(...rows.map((r) => r.length))
  const used = Array.from({ length: width }, (_, c) => rows.some((r) => r[c]))
  const trimmed = rows.map((r) => Array.from({ length: width }, (_, c) => r[c] || '').filter((_, c) => used[c]))
  const cols = trimmed[0].length
  // Header = first row that fills at least half the columns; rows above it are titles.
  const headerIndex = Math.max(0, trimmed.findIndex((r) => r.filter(Boolean).length >= Math.max(2, Math.ceil(cols / 2))))
  const titles = trimmed.slice(0, headerIndex).map((r) => r.filter(Boolean).join(' – ')).filter(Boolean)
  const header = trimmed[headerIndex]
  const body = trimmed.slice(headerIndex + 1, headerIndex + 1 + MAX_ROWS)
  const blocks = titles.map((text) => ({ type: 'text', text }))
  blocks.push({ type: 'table', headers: header, rows: body })
  if (trimmed.length - headerIndex - 1 > MAX_ROWS) blocks.push({ type: 'text', text: `… ${trimmed.length - headerIndex - 1 - MAX_ROWS} more rows in the attached file.` })
  return blocks
}

async function readXlsx(arrayBuffer) {
  const XLSX = await import('xlsx-js-style')
  const lib = XLSX.read ? XLSX : XLSX.default
  const book = lib.read(new Uint8Array(arrayBuffer), { type: 'array' })
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) return null
  return { blocks: sheetRowsToBlocks(lib.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })) }
}

/** Word document.xml → blocks, using the browser's DOMParser. */
export function docxXmlToBlocks(xml) {
  const doc = new globalThis.DOMParser().parseFromString(xml, 'application/xml')
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const textOf = (node) => clean([...node.getElementsByTagNameNS(W, 't')].map((t) => t.textContent).join(''))
  const body = doc.getElementsByTagNameNS(W, 'body')[0]
  if (!body) return []
  const blocks = []
  for (const child of [...body.childNodes]) {
    if (child.localName === 'p') {
      const text = textOf(child)
      if (text) blocks.push({ type: 'text', text })
    } else if (child.localName === 'tbl') {
      const rows = [...child.childNodes]
        .filter((n) => n.localName === 'tr')
        .map((tr) => [...tr.childNodes].filter((n) => n.localName === 'tc').map((tc) => textOf(tc)))
        .filter((r) => r.some(Boolean))
      if (rows.length) {
        const width = Math.max(...rows.map((r) => r.length))
        const padded = rows.map((r) => [...r, ...Array(width - r.length).fill('')])
        blocks.push({ type: 'table', headers: [], rows: padded })
      }
    }
  }
  return blocks
}

async function readDocx(arrayBuffer) {
  const JSZipModule = await import('jszip')
  const JSZip = JSZipModule.default || JSZipModule
  const zip = await JSZip.loadAsync(new Uint8Array(arrayBuffer))
  const file = zip.file('word/document.xml')
  if (!file) return null
  return { blocks: docxXmlToBlocks(await file.async('string')) }
}

/** @returns {Promise<{ blocks: object[] }|null>} */
export async function readAnnexureContent(arrayBuffer, mimeType, fileName = '') {
  try {
    const name = String(fileName).toLowerCase()
    if (mimeType === XLSX_MIME || name.endsWith('.xlsx')) return await readXlsx(arrayBuffer)
    if (mimeType === DOCX_MIME || name.endsWith('.docx')) return await readDocx(arrayBuffer)
    return null
  } catch {
    return null
  }
}
