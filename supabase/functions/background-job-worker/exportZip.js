/**
 * v1358 Slice 1 — helpers for the organisation export (handlers/organisation.export_build.js).
 * Pure JavaScript (no imports), so they run in the Deno worker and in the Vitest suite alike.
 *
 *   createZip(entries)         → Uint8Array  ZIP file ("stored", no compression; UTF-8 names). Entries are
 *                                            { name, data: Uint8Array | string }. Parts stay well below 4 GB and
 *                                            65,535 entries, so no ZIP64 is needed.
 *   toCsv(columns, rows)       → string      RFC 4180 CSV with a header row; nested values as JSON text; text
 *                                            starting with = + - @ gets a leading ' so spreadsheets do not run it.
 *   safeName(text)             → string      a file / folder name without path tricks
 *   readMe(plan, meta)         → string      the read-me placed in part 1
 *   dictionaryCsv(plan)        → string      one row per table column
 */
/* global TextEncoder */
const encoder = new TextEncoder()

let crcTable = null
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const asBytes = (data) => (typeof data === 'string' ? encoder.encode(data) : data)

export function zipSize(entries) {
  return entries.reduce((sum, e) => sum + 76 + 2 * encoder.encode(e.name).length + asBytes(e.data).length, 22)
}

export function createZip(entries) {
  const files = entries.map((e) => ({ name: encoder.encode(e.name), data: asBytes(e.data) }))
  const total = files.reduce((s, f) => s + 30 + f.name.length + f.data.length + 46 + f.name.length, 22)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  let pos = 0
  const central = []
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  for (const f of files) {
    const crc = crc32(f.data)
    const offset = pos
    view.setUint32(pos, 0x04034b50, true); view.setUint16(pos + 4, 20, true); view.setUint16(pos + 6, 0x0800, true)
    view.setUint16(pos + 8, 0, true); view.setUint16(pos + 10, dosTime, true); view.setUint16(pos + 12, dosDate, true)
    view.setUint32(pos + 14, crc, true); view.setUint32(pos + 18, f.data.length, true); view.setUint32(pos + 22, f.data.length, true)
    view.setUint16(pos + 26, f.name.length, true); view.setUint16(pos + 28, 0, true)
    out.set(f.name, pos + 30)
    out.set(f.data, pos + 30 + f.name.length)
    pos += 30 + f.name.length + f.data.length
    central.push({ f, crc, offset })
  }
  const centralStart = pos
  for (const { f, crc, offset } of central) {
    view.setUint32(pos, 0x02014b50, true); view.setUint16(pos + 4, 20, true); view.setUint16(pos + 6, 20, true)
    view.setUint16(pos + 8, 0x0800, true); view.setUint16(pos + 10, 0, true); view.setUint16(pos + 12, dosTime, true)
    view.setUint16(pos + 14, dosDate, true); view.setUint32(pos + 16, crc, true); view.setUint32(pos + 20, f.data.length, true)
    view.setUint32(pos + 24, f.data.length, true); view.setUint16(pos + 28, f.name.length, true)
    view.setUint16(pos + 30, 0, true); view.setUint16(pos + 32, 0, true); view.setUint16(pos + 34, 0, true)
    view.setUint16(pos + 36, 0, true); view.setUint32(pos + 38, 0, true); view.setUint32(pos + 42, offset, true)
    out.set(f.name, pos + 46)
    pos += 46 + f.name.length
  }
  view.setUint32(pos, 0x06054b50, true); view.setUint16(pos + 4, 0, true); view.setUint16(pos + 6, 0, true)
  view.setUint16(pos + 8, central.length, true); view.setUint16(pos + 10, central.length, true)
  view.setUint32(pos + 12, pos - centralStart, true); view.setUint32(pos + 16, centralStart, true); view.setUint16(pos + 20, 0, true)
  return out
}

export function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(columns, rows) {
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvCell(row?.[c])).join(','))
  return `${lines.join('\r\n')}\r\n`
}

export function safeName(text) {
  return String(text ?? '')
    .split('/')
    // eslint-disable-next-line no-control-regex -- control characters are removed on purpose
    .map((part) => part.replace(/[\\:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+$/, '_'))
    .filter(Boolean)
    .join('/')
}

export function dictionaryCsv(plan) {
  const rows = []
  for (const t of plan?.tables || []) {
    for (const c of t.columns || []) {
      rows.push({ table: t.table, column: c.name, type: c.type, required: c.nullable ? 'No' : 'Yes', description: c.description || '' })
    }
  }
  return toCsv(['table', 'column', 'type', 'required', 'description'], rows)
}

export function readMe(plan, meta = {}) {
  const tables = plan?.tables || []
  const lines = [
    `Organisation data export${meta.reference ? ` ${meta.reference}` : ''}`,
    meta.organisation ? `Organisation: ${meta.organisation}` : null,
    meta.createdAt ? `Requested: ${meta.createdAt}` : null,
    '',
    'What is in this export',
    '- data/<table>.csv   one file per table, a header row then one row per record (opens in a spreadsheet).',
    '- data/<table>.json  the same records as JSON, for loading in another system.',
    '- files/<bucket>/... the files people uploaded (attachments, photos), in the folders they were stored in.',
    '- dictionary.csv     every table and column: type, whether it is required, and its description.',
    '- files-not-included.csv  any uploaded file that could not be copied, and why (only when there are some).',
    '',
    'Notes',
    '- Records carry their reference IDs (for example a risk ID) where they have one, plus an internal id that',
    '  links records across tables.',
    '- Very large tables are split into numbered files (table.part-2.csv, ...). Large exports come as several',
    '  ZIP parts; download them all.',
    '- Passwords, keys, tokens and other secrets are never exported.',
    '- In the CSV files, text that starts with = + - or @ begins with an apostrophe so a spreadsheet does not run',
    '  it as a formula.',
    '',
    `Tables: ${tables.length}`,
    ...tables.map((t) => `- ${t.table}: ${t.rows} row(s)`),
  ]
  return `${lines.filter((l) => l !== null).join('\r\n')}\r\n`
}
