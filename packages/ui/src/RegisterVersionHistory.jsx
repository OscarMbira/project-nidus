import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, History, LayoutTemplate } from 'lucide-react'
import { platformDb } from '@nidus/supabase'

const SHORT = 160

/** Readable cell text for a stored value (lists one per line, tables as "cell – cell"). */
function valueText(value, field) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  // Record references (v1337) are { id, label } objects — show the label.
  const labelOf = (v) => (v && typeof v === 'object' ? v.label || v.id : (field?.dropdown_options || []).find((o) => o.value === v)?.label || v)
  if (Array.isArray(value)) return value.map(labelOf).join('; ') || '—'
  if (field?.field_type === 'dropdown') return labelOf(value)
  return String(value).replace(/\t/g, ' – ').split(/\r?\n/).filter(Boolean).join('; ')
}

function clip(text) {
  return text.length > SHORT ? `${text.slice(0, SHORT)}…` : text
}

/**
 * Template provenance and content version history of a register record (v1336 / v1339), for the
 * Audit details tab. History rows are append-only: each save lists the fields it changed with
 * old → new values, who and when.
 *
 * @param {object} props
 * @param {object} props.db        platformDb / simDb (the schema holding the record)
 * @param {object} props.register  register definition (fields, status_workflow, versioned)
 * @param {object} props.record    local_register_records row
 */
export default function RegisterVersionHistory({ db, register, record }) {
  const [versions, setVersions] = useState([])
  const [names, setNames] = useState({})
  const [template, setTemplate] = useState(null)
  const [open, setOpen] = useState({})
  const recordId = record?.id
  const templateId = record?.created_from_template_id || null
  const versioned = Boolean(register?.versioned)

  useEffect(() => {
    if (!recordId || !versioned) return undefined
    let cancelled = false
    db.from('local_register_record_versions').select('*').eq('record_id', recordId).order('version_number', { ascending: false })
      .then(async ({ data }) => {
        if (cancelled) return
        const rows = data || []
        setVersions(rows)
        const ids = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))]
        if (ids.length) {
          const { data: users } = await platformDb.from('users').select('id, full_name, email').in('id', ids)
          if (!cancelled) setNames(Object.fromEntries((users || []).map((u) => [u.id, u.full_name || u.email])))
        }
      })
    return () => { cancelled = true }
  }, [db, recordId, versioned, record?.content_version])

  useEffect(() => {
    if (!templateId) return undefined
    let cancelled = false
    ;(async () => {
      let { data } = await db.from('local_register_templates').select('name, version, template_scope').eq('id', templateId).maybeSingle()
      if (!data && db !== platformDb) {
        ;({ data } = await platformDb.from('local_register_templates').select('name, version, template_scope').eq('id', templateId).maybeSingle())
      }
      if (!cancelled) setTemplate(data || { name: 'A template that is no longer available' })
    })()
    return () => { cancelled = true }
  }, [db, templateId])

  if (!templateId && !versioned) return null

  const fieldsByKey = Object.fromEntries((register?.fields || []).map((f) => [f.field_key, f]))
  const statusLabel = (key) => (register?.status_workflow || []).find((s) => s.key === key)?.label || key
  const changeRows = (changes) => Object.entries(changes || {}).map(([key, change]) => {
    if (key === 'title') return { label: 'Title', oldText: valueText(change.old), newText: valueText(change.new) }
    if (key === 'description') return { label: 'Description', oldText: valueText(change.old), newText: valueText(change.new) }
    if (key === 'status') return { label: 'Status', oldText: statusLabel(change.old) || '—', newText: statusLabel(change.new) || '—' }
    const fieldKey = key.replace(/^fv:/, '')
    const field = fieldsByKey[fieldKey]
    return { label: field?.field_label || (fieldKey.startsWith('cf__') ? 'Custom field' : fieldKey), oldText: valueText(change.old, field), newText: valueText(change.new, field) }
  })

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      {templateId && (
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <LayoutTemplate className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Created from template <strong className="font-semibold">{template?.name || '…'}</strong>
          {record.created_from_template_version ? ` (version ${record.created_from_template_version})` : ''}
        </p>
      )}
      {versioned && (
        <>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <History className="h-4 w-4" /> Version history — current version {record.content_version || 1}
          </h3>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No changes since the record was created (version 1).</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {versions.map((v) => {
                const rows = changeRows(v.changes)
                const expanded = open[v.id]
                return (
                  <li key={v.id} className="py-2">
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [v.id]: !o[v.id] }))}
                      className="flex w-full items-center gap-2 text-left text-sm text-gray-800 dark:text-gray-200"
                      aria-expanded={Boolean(expanded)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">Version {v.version_number}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        · {new Date(v.changed_at).toLocaleString()} · {names[v.changed_by] || 'Unknown user'} · {rows.length} {rows.length === 1 ? 'change' : 'changes'}
                      </span>
                    </button>
                    {expanded && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400">
                              <th className="py-1 pr-3 font-medium">Field</th>
                              <th className="py-1 pr-3 font-medium">Before</th>
                              <th className="py-1 font-medium">After</th>
                            </tr>
                          </thead>
                          <tbody className="align-top text-gray-700 dark:text-gray-300">
                            {rows.map((r) => (
                              <tr key={r.label} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="py-1 pr-3 font-medium">{r.label}</td>
                                <td className="py-1 pr-3 text-red-700 dark:text-red-300" title={r.oldText}>{clip(r.oldText)}</td>
                                <td className="py-1 text-green-700 dark:text-green-300" title={r.newText}>{clip(r.newText)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
