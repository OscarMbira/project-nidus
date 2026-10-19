/**
 * v1272 Phase 2 — Import Mapper helpers (PRD D26, stories 32–34). Pure, except readTabularFile.
 *
 * A template is described by its rule 71 data dictionary, normalised by dictionaryFromColumns():
 *   [{ key, label, required, type, allowed: string[], aliases: string[], description }]
 * A mapping is { "<source header>": "<template key>" | null } and conversions are
 * { "<template key>": { "<source value, lower case>": "<template value>" } }.
 */

export const normHeader = (h) => String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9%]+/g, '')

const toList = (v, sep) => (Array.isArray(v) ? v : String(v ?? '').split(sep)).map((s) => String(s).trim()).filter(Boolean)
const looksLikeEnum = (s) => /\|/.test(String(s || ''))

/** Normalise a flow's legend/template definition into the mapper's dictionary shape. */
export function dictionaryFromColumns(columns = []) {
  return columns.map((c) => {
    const allowedSource = c.allowed ?? c.allowed_values ?? c.values ?? []
    return {
      key: String(c.key ?? c.field),
      label: String(c.label ?? c.field ?? c.key),
      required: c.required === true || /^yes$/i.test(String(c.required || '')),
      type: String(c.type ?? c.data_type ?? 'Text'),
      allowed: Array.isArray(allowedSource) ? allowedSource.map(String) : looksLikeEnum(allowedSource) ? toList(allowedSource, '|') : [],
      aliases: toList(c.aliases ?? [], /[,/]/),
      description: String(c.description ?? c.format ?? c.format_notes ?? ''),
    }
  })
}

/** Match source headers to template keys by key, label or alias (case/space/punctuation-insensitive). */
export function autoMatch(headers = [], dictionary = []) {
  const lookup = new Map()
  for (const d of dictionary) for (const n of [d.key, d.label, ...d.aliases]) if (normHeader(n)) lookup.set(normHeader(n), d.key)
  const used = new Set()
  const mapping = {}
  for (const h of headers) {
    const k = lookup.get(normHeader(h)) || null
    mapping[h] = k && !used.has(k) ? k : null
    if (mapping[h]) used.add(mapping[h])
  }
  return mapping
}

/** Required template fields that no source column maps to. */
export function missingRequired(mapping = {}, dictionary = []) {
  const mapped = new Set(Object.values(mapping).filter(Boolean))
  return dictionary.filter((d) => d.required && !mapped.has(d.key)).map((d) => d.key)
}

/** True when the file does not already line up with the template (show the mapping step). */
export function needsMapping(headers = [], dictionary = []) {
  if (!headers.length) return false
  const mapping = autoMatch(headers, dictionary)
  const matched = Object.values(mapping).filter(Boolean).length
  return missingRequired(mapping, dictionary).length > 0 || matched < Math.ceil(headers.length / 2)
}

/** Stable signature of a file layout: the normalised headers, sorted, hashed. */
export function headerSignature(headers = []) {
  const text = [...new Set(headers.map(normHeader).filter(Boolean))].sort().join('|')
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = (h1 * 33) ^ c
    h2 = (h2 * 33) ^ c
  }
  return `h${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${text.length.toString(36)}`
}

/** Up to n distinct non-blank sample values of one column. */
export function sampleValues(rows = [], header, n = 3) {
  const out = []
  for (const r of rows) {
    const v = r?.[header]
    if (v == null || String(v).trim() === '') continue
    const s = String(v).trim().slice(0, 80)
    if (!out.includes(s)) out.push(s)
    if (out.length >= n) break
  }
  return out
}

/** Rows re-keyed to template fields, with value conversions applied. Unmapped columns are dropped. */
export function applyMapping(rows = [], mapping = {}, conversions = {}) {
  const pairs = Object.entries(mapping).filter(([, k]) => k)
  return rows.map((row) => {
    const out = {}
    for (const [source, key] of pairs) {
      let v = row?.[source]
      const conv = conversions?.[key]
      if (conv && v != null && String(v).trim() !== '') {
        const hit = conv[String(v).trim().toLowerCase()]
        if (hit != null) v = hit
      }
      out[key] = v
    }
    return out
  })
}

/** Distinct source values that are not allowed for an enum field (after conversions). */
export function unconvertedValues(rows = [], source, field, conversions = {}) {
  if (!field?.allowed?.length) return []
  const allowed = new Set(field.allowed.map((a) => a.toLowerCase()))
  const conv = conversions?.[field.key] || {}
  const bad = []
  for (const r of rows) {
    const raw = r?.[source]
    if (raw == null || String(raw).trim() === '') continue
    const v = String(conv[String(raw).trim().toLowerCase()] ?? raw).trim().toLowerCase()
    if (!allowed.has(v) && !bad.includes(String(raw).trim())) bad.push(String(raw).trim())
  }
  return bad
}

/** Minimal CSV reader: quoted cells, CRLF, and `#` comment lines (rule 71 dictionaries) skipped. */
export function parseCsvText(text) {
  const lines = []
  let row = []
  let cell = ''
  let quoted = false
  const src = String(text ?? '').replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); lines.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); lines.push(row) }
  const data = lines.filter((l) => !(l.length === 1 && l[0].trim() === '') && !String(l[0]).trim().startsWith('#'))
  if (!data.length) return { headers: [], rows: [] }
  const headers = data[0].map((h) => String(h).trim())
  const rows = data.slice(1).map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])))
  return { headers, rows }
}

/** Read a CSV, Excel or JSON file as { headers, rows } with the file's own column names. */
export async function readTabularFile(file) {
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsvText(await file.text())
  if (name.endsWith('.json')) {
    const parsed = JSON.parse(await file.text())
    const list = Array.isArray(parsed) ? parsed : Object.values(parsed || {}).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object') || []
    const headers = [...new Set(list.flatMap((r) => Object.keys(r || {})))]
    return { headers, rows: list }
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    // Skip rule 71 Instructions/Legend sheets: use the first sheet whose first row has 2+ headers and data.
    for (const n of wb.SheetNames) {
      if (/^(instructions|legend|read ?me)$/i.test(n)) continue
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })
      if (aoa.length < 2 || aoa[0].filter((h) => String(h).trim()).length < 2) continue
      const headers = aoa[0].map((h) => String(h).trim())
      const rows = aoa.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''))
        .map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])))
      return { headers, rows }
    }
    return { headers: [], rows: [] }
  }
  throw new Error('Choose a .csv, .xlsx or .json file.')
}
