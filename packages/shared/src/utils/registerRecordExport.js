/**
 * Local Register record → View (RecordPreviewModal) / Export (ExportRecordMenu) data.
 * Sections follow the record page's own tabs: Details (display ID, title, status, description
 * and ungrouped fields), one section per field group, then Custom Fields. Values are made
 * readable: status/option labels, Yes/No, one list item per line (rule 38), amounts in the
 * organisation's currency and number format (rule 68).
 */
import { groupRegisterFields } from './registerFieldGroups'
import { registerFieldExportValue } from './registerCustomFields'
import { tableFieldRows, linkedBlocksForField, linkedBlockText, linkedReplacedFieldKeys } from './registerDocumentModel'

/** Field types holding one short value — shown together as a Detail | Value table in the documents. */
const FACT_FIELD_TYPES = new Set([
  'text', 'number', 'integer', 'decimal', 'percentage', 'currency', 'date', 'dropdown', 'boolean',
  'user_picker', 'url', 'email', 'phone',
])

/** Single values first (one Detail | Value table), then lists, tables and long text in form order. */
function factsFirst(fields) {
  return [...fields.filter((f) => f.fact), ...fields.filter((f) => !f.fact)]
}

/**
 * A linked record as document blocks: its description, a Detail | Value table of its single
 * values, then each list / table field under its own caption.
 */
function linkedBlockParts(block) {
  const parts = []
  if (block.intro) parts.push({ type: 'text', text: block.intro })
  if (block.facts?.length) parts.push({ type: 'table', headers: ['Detail', 'Value'], rows: block.facts.map((f) => [f.label, f.value]) })
  for (const group of block.groups || []) {
    if (group.kind === 'table') parts.push({ type: 'table', caption: group.label, headers: group.headers, rows: group.rows })
    else parts.push({ type: 'list', caption: group.label, items: group.items, plain: group.kind === 'paragraphs' })
  }
  return parts
}

/**
 * @param {{ register: object, record: object, customFields?: object[], settings?: object,
 *   linked?: Record<string, {register: object, records: object[]}> }} input
 *   settings = resolved Regional & Format settings (rule 68) for amount/number formatting;
 *   linked = source records of "linked records" fields by field_key (v1332)
 * @returns {{ sections: {title: string, fields: {key: string, label: string, fact?: boolean, table?: {headers: string[], rows: string[][]}, blocks?: object[]}[]}[], record: object, baseFilename: string }}
 *   Table fields (v1326) carry `table` so PDF/Word/PowerPoint/Print draw a real table; the flat
 *   exports (Excel, CSV, XML, JSON) keep one "cell – cell" line per row. Single-value fields carry
 *   `fact` and are drawn together as one Detail | Value table per section. A linked-records field
 *   becomes one field per source record (its title) with `blocks` (description, Detail | Value
 *   table, captioned lists and tables); the flat exports keep its text.
 */
export function buildRegisterRecordExport({ register, record, customFields = [], settings = null, linked = {} }) {
  const { detailsFields, groups } = groupRegisterFields(register?.fields, record?.field_values || {})
  const linkedValues = {}
  const fieldsByKey = new Map((register?.fields || []).map((f) => [f.field_key, f]))
  // A matched linked-records field (v1333) shows one sub-section per selected option instead of
  // the bare option list.
  const replaced = linkedReplacedFieldKeys(register?.fields)
  const toFields = (fields) => fields.filter((f) => !replaced.has(f.field_key)).flatMap((f) => {
    if (f.field_type === 'linked_records') {
      return linkedBlocksForField(f, linked[f.field_key], record?.field_values || {}, fieldsByKey, settings).map((block) => {
        const key = `${f.field_key}__${block.id}`
        linkedValues[key] = linkedBlockText(block)
        const blocks = linkedBlockParts(block)
        return blocks.length ? { key, label: block.title, blocks } : { key, label: block.title }
      })
    }
    const out = { key: f.field_key, label: f.field_label }
    if (FACT_FIELD_TYPES.has(f.field_type)) out.fact = true
    if (f.field_type === 'table') {
      const table = tableFieldRows(f, record?.field_values?.[f.field_key], settings)
      if (table.rows.length) out.table = table
    }
    return [out]
  })

  const sections = [
    {
      title: 'Details',
      fields: factsFirst([
        { key: 'display_id', label: 'ID', fact: true },
        { key: 'title', label: 'Title', fact: true },
        { key: 'status', label: 'Status', fact: true },
        { key: 'description', label: 'Description' },
        ...toFields(detailsFields),
      ]),
    },
    ...groups.map((g) => ({ title: g.label, fields: factsFirst(toFields(g.fields)) })).filter((s) => s.fields.length > 0),
    ...(customFields.length > 0 ? [{ title: 'Custom Fields', fields: factsFirst(toFields(customFields)) }] : []),
  ]

  const allFields = [...(register?.fields || []), ...customFields].filter((f) => f.field_type !== 'linked_records')
  const statusLabel = (register?.status_workflow || []).find((s) => s.key === record?.status)?.label || record?.status || ''
  const exportRecord = {
    display_id: record?.display_id || '',
    title: record?.title || '',
    status: statusLabel,
    description: record?.description || '',
    ...Object.fromEntries(allFields.map((f) => [f.field_key, registerFieldExportValue(record?.field_values?.[f.field_key], f, settings)])),
    ...linkedValues,
  }

  const baseFilename = `${register?.register_key || 'register'}_${record?.display_id || record?.id || 'record'}`
    .replace(/[^A-Za-z0-9_-]+/g, '_')

  return { sections, record: exportRecord, baseFilename }
}
