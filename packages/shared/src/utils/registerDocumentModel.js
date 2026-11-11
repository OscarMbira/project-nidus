/**
 * Complete document for a Local Register document record (v1318) — a pure description that the
 * Word and PDF renderers (registerDocumentWord.js / registerDocumentPdf.js) lay out:
 *
 *   Cover page → Document Control (document information, version history, sign-off table)
 *   → Table of Contents → numbered sections (one per form tab; Glossary is section 2)
 *   → Appendices (Appendix A, B, …) → Annexures (attached files, Annexure A, B, …)
 *
 * Empty fields are left out; a section with nothing in it is left out. Field values are made
 * readable with registerFieldExportValue (option labels, Yes/No, regional amounts — rule 68).
 */
import { groupRegisterFields } from './registerFieldGroups'
import { registerFieldExportValue } from './registerCustomFields'
import { formatRegionalDate } from './formatRegionalSettings'
import { parseTableValue, tableColumns } from './registerTableField'
import { blocksToLines, textBlocks } from './textFlow'

/** Field keys with a fixed place in the document rather than a numbered section. */
export const DOCUMENT_FIELD_KEYS = {
  glossary: 'glossary',
  appendices: 'appendices',
  versionHistory: 'version_history',
  relatedDocuments: 'related_documents',
  reference: 'document_reference',
  version: 'document_version',
  owner: 'document_owner',
}

/** Field-group (tab) names whose fields are placed by key instead of as a numbered section. */
const PLACED_GROUPS = new Set(['glossary & appendices', 'document control'])

/** "Term – Definition", "Term - Definition" or "Term: Definition" → [term, rest]. */
export function splitPair(line) {
  const text = String(line || '').trim()
  const match = text.match(/^(.+?)\s+[–—-]\s+(.+)$/) || text.match(/^([^:]+):\s*(.+)$/)
  return match ? [match[1].trim(), match[2].trim()] : [text, '']
}

/** "A – B – C – D" → ['A', 'B', 'C', 'D'] (splits on spaced dashes only, so "2026-10-24" stays whole). */
export function splitParts(line) {
  return String(line || '').split(/\s+[–—-]\s+/).map((p) => p.trim())
}

/** 0 → A, 25 → Z, 26 → AA. */
export function letterFor(index) {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const r = (n - 1) % 26
    label = String.fromCharCode(65 + r) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

function lines(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)
}

function isBlank(value) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  return String(value).trim() === ''
}

/** Table field → { headers, rows } with date cells formatted (v1326). */
export function tableFieldRows(field, value, settings) {
  const columns = tableColumns(field)
  const rows = parseTableValue(value, columns.length).map((row) =>
    row.map((cell, i) => (columns[i]?.type === 'date' && cell ? formatRegionalDate(cell, settings) || cell : cell)))
  return { headers: columns.map((c) => c.label), rows }
}

/**
 * One field → a document item ({ label, kind: 'text'|'list'|'paragraphs'|'blocks'|'table', text?, items?,
 * blocks?, headers?, rows? }) or null. Text holding a workflow chain ("New → Triaged → Closed") becomes
 * 'blocks' — paragraphs and numbered steps (v1366); its items hold the same content as plain lines.
 */
export function fieldToItem(field, value, settings) {
  if (isBlank(value)) return null
  const type = field.field_type
  if (type === 'table') {
    const { headers, rows } = tableFieldRows(field, value, settings)
    return rows.length ? { label: field.field_label, kind: 'table', headers, rows } : null
  }
  if (type === 'date') {
    return { label: field.field_label, kind: 'text', text: formatRegionalDate(value, settings) || String(value) }
  }
  const text = registerFieldExportValue(value, field, settings)
  if (isBlank(text)) return null
  if (type === 'multi_line' || type === 'multi_select' || Array.isArray(value)) {
    const items = lines(text)
    return items.length ? { label: field.field_label, kind: 'list', items } : null
  }
  const multiLine = type === 'long_text' || String(text).includes('\n')
  const textLines = multiLine ? lines(text) : [String(text)]
  const blocks = textBlocks(textLines)
  if (blocks.some((b) => b.type === 'steps')) {
    return { label: field.field_label, kind: 'blocks', blocks, items: blocksToLines(blocks) }
  }
  if (multiLine) return { label: field.field_label, kind: 'paragraphs', items: textLines }
  return { label: field.field_label, kind: 'text', text: String(text) }
}

/** Source register key of a "linked records" field (v1332), e.g. 'fin_data_scope'. */
export function linkedRegisterKey(field) {
  const first = Array.isArray(field?.dropdown_options) ? field.dropdown_options[0] : null
  return first?.value || null
}

/**
 * Optional matching for a linked-records field (v1333): `match_field` is a dropdown / multi-select
 * on this register (e.g. products_in_scope) and `source_field` the field on the source records
 * holding the same option value (e.g. Data Scope's product_area). When set, the exports show one
 * sub-section per selected option, in the order selected, and leave the bare option list out.
 */
export function linkedMatchConfig(field) {
  const first = Array.isArray(field?.dropdown_options) ? field.dropdown_options[0] : null
  return first?.match_field && first?.source_field ? { matchField: first.match_field, sourceField: first.source_field } : null
}

/** Keys of fields that a matched linked-records field replaces in the exports. */
export function linkedReplacedFieldKeys(fields) {
  return new Set((fields || []).filter((f) => f.field_type === 'linked_records').map((f) => linkedMatchConfig(f)?.matchField).filter(Boolean))
}

/** "Inclusion Rules (what will be migrated)" → "Inclusion Rules". */
function shortLabel(label) {
  return String(label || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * The source register's records as sub-sections (v1332): { id, title, intro, lines }. `lines` are
 * "Label: value" bullets — status first, then every filled field in form order.
 * @param {{ register: object, records: object[] }|null} linked
 * @param {object|null} settings
 */
export function linkedRecordBlocks(linked, settings = null) {
  const register = linked?.register
  const fields = (register?.fields || []).filter((f) => f.field_type !== 'linked_records')
  const statusLabel = (key) => (register?.status_workflow || []).find((s) => s.key === key)?.label || key
  return [...(linked?.records || [])]
    .sort((a, b) => String(a.display_id || '').localeCompare(String(b.display_id || ''), undefined, { numeric: true })
      || String(a.title || '').localeCompare(String(b.title || '')))
    .map((rec) => {
      const lines = rec.status ? [`Status: ${statusLabel(rec.status)}`] : []
      // For the documents (v1334): single values as a Detail | Value table (`facts`), each
      // multi-value field under its own sub-heading (`groups`: list / paragraphs / table).
      const facts = rec.status ? [{ label: 'Status', value: statusLabel(rec.status) }] : []
      const groups = []
      for (const field of fields) {
        const item = fieldToItem(field, rec.field_values?.[field.field_key], settings)
        if (!item) continue
        const label = shortLabel(item.label)
        if (item.kind === 'table') {
          item.rows.forEach((row) => lines.push(`${label}: ${row.filter(Boolean).join(' – ')}`))
          groups.push({ label, kind: 'table', headers: item.headers, rows: item.rows })
        } else if (item.kind === 'list' || item.kind === 'paragraphs' || item.kind === 'blocks') {
          item.items.forEach((line) => lines.push(`${label}: ${line}`))
          groups.push({ label, kind: item.kind === 'blocks' ? 'paragraphs' : item.kind, items: item.items })
        } else {
          lines.push(`${label}: ${item.text}`)
          facts.push({ label, value: item.text })
        }
      }
      return { id: rec.id, title: String(rec.title || '').trim(), intro: String(rec.description || '').replace(/\s+/g, ' ').trim(), lines, facts, groups, record: rec }
    })
}

/**
 * Blocks for one linked-records field. With matching (linkedMatchConfig): one block per option
 * selected in the match field, in that order — the matching source records, or a short note when
 * none has been captured yet; source records for options not selected are left out. Without
 * matching: every source record (linkedRecordBlocks).
 * @param {object} field         the linked-records field
 * @param {object|null} linkedData { register, records } for this field
 * @param {object} values        this record's field_values
 * @param {Map<string, object>} fieldsByKey this register's fields by key
 */
export function linkedBlocksForField(field, linkedData, values, fieldsByKey, settings = null) {
  // A core source (v1338, e.g. core:requirements) arrives with its blocks already built.
  if (Array.isArray(linkedData?.blocks)) return linkedData.blocks
  const blocks = linkedRecordBlocks(linkedData, settings)
  const match = linkedMatchConfig(field)
  if (!match) return blocks
  const matchField = fieldsByKey.get(match.matchField)
  const raw = values?.[match.matchField]
  const selected = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String)
  const optionLabel = (v) => (matchField?.dropdown_options || []).find((o) => o.value === v)?.label || v
  const sourceLabel = linkedData?.register?.label || 'the source register'
  return selected.flatMap((value) => {
    const found = blocks.filter((b) => {
      const v = b.record?.field_values?.[match.sourceField]
      return Array.isArray(v) ? v.map(String).includes(value) : String(v ?? '') === value
    })
    if (found.length) return found
    return [{ id: `missing-${value}`, title: optionLabel(value), intro: `Takeover details have not been captured in ${sourceLabel} yet.`, lines: [] }]
  })
}

/**
 * One block as text for the record exports: the introduction line ends with ":" so the exporters
 * show it as a paragraph followed by the rule bullets.
 */
export function linkedBlockText(block) {
  return block.intro ? `${block.intro.replace(/:+$/, '')}:\n${block.lines.join('\n')}` : block.lines.join('\n')
}

/**
 * @param {object} input
 * @param {object} input.register        local_registers row with .fields (sorted) and .status_workflow
 * @param {object} input.record          local_register_records row
 * @param {object[]} [input.customFields] organisation custom field definitions (v1311)
 * @param {object|null} [input.settings]  resolved Regional & Format settings
 * @param {object[]} [input.signatories]  resolveRecordSignatoriesForExport rows
 * @param {object[]} [input.attachments]  resolveRecordAttachmentsForExport rows
 * @param {string} [input.organisationName]
 * @param {string} [input.projectLabel]
 * @param {Date} [input.generatedAt]
 * @param {Record<string, {register: object, records: object[]}>} [input.linked]  source records of
 *   "linked records" fields by field_key (v1332) — each record becomes a numbered sub-section
 */
export function buildRegisterDocumentModel({
  register,
  record,
  customFields = [],
  settings = null,
  signatories = [],
  attachments = [],
  organisationName = '',
  projectLabel = '',
  generatedAt = new Date(),
  linked = {},
}) {
  const values = record?.field_values || {}
  const allFields = [...(register?.fields || []), ...customFields]
  const byKey = new Map(allFields.map((f) => [f.field_key, f]))
  const valueText = (key) => {
    const field = byKey.get(key)
    return field ? registerFieldExportValue(values[key], field, settings) : ''
  }
  const statusLabel = (register?.status_workflow || []).find((s) => s.key === record?.status)?.label || record?.status || ''
  const placedKeys = new Set(Object.values(DOCUMENT_FIELD_KEYS))
  // A matched linked-records field (v1333) replaces its option list with full sub-sections.
  for (const key of linkedReplacedFieldKeys(register?.fields)) placedKeys.add(key)

  // ── Cover ──
  const cover = [
    { label: 'Document Reference', value: valueText(DOCUMENT_FIELD_KEYS.reference) || record?.display_id || '' },
    { label: 'Version', value: valueText(DOCUMENT_FIELD_KEYS.version) },
    { label: 'Document Owner', value: valueText(DOCUMENT_FIELD_KEYS.owner) },
    { label: 'Status', value: statusLabel },
    { label: 'Project', value: projectLabel },
    { label: 'Organisation', value: organisationName },
    { label: 'Date', value: formatRegionalDate(generatedAt, settings) },
  ].filter((row) => !isBlank(row.value))

  // ── Document information (Details tab fields not on the cover) ──
  const { detailsFields, groups } = groupRegisterFields(register?.fields, values)
  const information = [
    ...(record?.display_id ? [{ label: 'Record ID', value: record.display_id }] : []),
    ...detailsFields
      .filter((f) => !placedKeys.has(f.field_key))
      .map((f) => {
        const item = fieldToItem(f, values[f.field_key], settings)
        if (!item) return null
        return { label: f.field_label, value: item.kind === 'text' ? item.text : item.items.join('; ') }
      })
      .filter(Boolean),
  ]
  const summary = String(record?.description || '').trim()

  // ── Version history ──
  /** Rows of a placed field: table columns when it is a table field, else "A – B" lines. */
  const placedRows = (key, split) => {
    const field = byKey.get(key)
    if (field?.field_type === 'table') return tableFieldRows(field, values[key], settings).rows
    return lines(valueText(key)).map(split)
  }
  const versionField = byKey.get(DOCUMENT_FIELD_KEYS.versionHistory)
  const versionColumns = versionField?.field_type === 'table' ? tableColumns(versionField).map((c) => c.key) : []
  const versionHistory = placedRows(DOCUMENT_FIELD_KEYS.versionHistory, splitParts).map((cells) => {
    if (versionColumns.length) {
      const at = (k) => cells[versionColumns.indexOf(k)] || ''
      const known = ['version', 'date', 'author', 'change']
      const extra = versionColumns.filter((k) => !known.includes(k)).map((k) => at(k)).filter(Boolean)
      return { version: at('version'), date: at('date'), author: at('author'), change: [at('change'), ...extra].filter(Boolean).join(' – ') }
    }
    const [version = '', date = '', author = '', ...rest] = cells
    return { version, date, author, change: rest.join(' – ') }
  })
  const relatedDocuments = lines(valueText(DOCUMENT_FIELD_KEYS.relatedDocuments))

  // ── Sign-off ──
  const signoff = signatories.map((s) => ({
    name: s.name || 'Unassigned',
    role: s.role_label,
    status: s.status,
    signatureUrl: s.status === 'signed' ? s.signature_url : null,
    date: s.status === 'signed' && s.signed_at ? formatRegionalDate(s.signed_at, settings) : '',
    note: s.status === 'signed'
      ? ''
      : s.status === 'declined'
        ? `Declined${s.decline_reason ? ` — ${s.decline_reason}` : ''}`
        : s.status === 'expired'
          ? 'Not signed (closed)'
          : s.is_mandatory === false ? 'Pending (optional)' : 'Pending',
  }))

  // ── Numbered sections: one per tab, Glossary inserted as section 2 ──
  const contentSections = []
  for (const group of groups) {
    const placedGroup = PLACED_GROUPS.has(group.label.trim().toLowerCase())
    const items = group.fields
      .filter((f) => !placedKeys.has(f.field_key))
      .flatMap((f) => (f.field_type === 'linked_records'
        ? linkedBlocksForField(f, linked[f.field_key], values, byKey, settings)
          .map((b) => ({ label: b.title, kind: 'linked', intro: b.intro, facts: b.facts || [], groups: b.groups || [], items: b.lines }))
        : [fieldToItem(f, values[f.field_key], settings)]))
      .filter(Boolean)
    if (placedGroup && items.length === 0) continue
    if (items.length) contentSections.push({ title: group.label, items })
  }
  const customItems = customFields.map((f) => fieldToItem(f, values[f.field_key], settings)).filter(Boolean)
  if (customItems.length) contentSections.push({ title: 'Additional Information', items: customItems })

  const glossaryRows = placedRows(DOCUMENT_FIELD_KEYS.glossary, splitPair).map(([term = '', definition = '']) => ({ term, definition }))
  const ordered = [...contentSections]
  if (glossaryRows.length) {
    ordered.splice(Math.min(1, ordered.length), 0, { title: 'Glossary of Terms', glossary: glossaryRows, items: [] })
  }
  const sections = ordered.map((section, i) => ({
    ...section,
    number: String(i + 1),
    items: section.items.map((item, j) => ({ ...item, number: `${i + 1}.${j + 1}` })),
  }))

  // ── Appendices and annexures ──
  // A title that already says "Appendix 1 – …" keeps its own number instead of a letter.
  const appendices = placedRows(DOCUMENT_FIELD_KEYS.appendices, splitPair).map(([title = '', reference = ''], i) => {
    const own = /^appendix\s+([A-Za-z0-9]+)\s*[–—:-]\s*(.+)$/i.exec(title.trim())
    return own ? { letter: own[1], title: own[2].trim(), reference } : { letter: letterFor(i), title, reference }
  })
  const annexures = attachments.map((a, i) => ({
    letter: letterFor(i),
    title: a.title || a.file_name,
    fileName: a.file_name,
    sizeLabel: a.size_label || '',
    isImage: Boolean(a.is_image),
    mimeType: a.mime_type || '',
    url: a.url || null,
    content: a.content?.blocks?.length ? a.content.blocks : null,
  }))

  // ── Table of contents ──
  const toc = [
    { key: 'control', level: 1, title: 'Document Control' },
    ...sections.flatMap((s) => [
      { key: `s${s.number}`, level: 1, title: `${s.number}  ${s.title}` },
      ...s.items.map((item) => ({ key: `i${item.number}`, level: 2, title: `${item.number}  ${item.label}` })),
    ]),
    ...(appendices.length ? [{ key: 'appendices', level: 1, title: 'Appendices' }] : []),
    ...appendices.map((a) => ({ key: `app${a.letter}`, level: 2, title: `Appendix ${a.letter} – ${a.title}` })),
    ...(annexures.length ? [{ key: 'annexures', level: 1, title: 'Annexures' }] : []),
    ...annexures.map((a) => ({ key: `anx${a.letter}`, level: 2, title: `Annexure ${a.letter} – ${a.title}` })),
  ]

  const title = String(record?.title || register?.label || 'Document').trim()
  const baseFilename = `${register?.register_key || 'document'}_${record?.display_id || record?.id || ''}`
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+$/, '')

  return {
    title,
    documentType: register?.label || '',
    organisationName,
    cover,
    information,
    summary,
    versionHistory,
    relatedDocuments,
    signoff,
    sections,
    appendices,
    annexures,
    toc,
    baseFilename,
  }
}
