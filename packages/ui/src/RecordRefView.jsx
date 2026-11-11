/**
 * RecordRefView — read-only "Record reference" value (v1337): each referenced record as a link, with
 * the facts the field asks for (show_fields) underneath — e.g. a mapping sheet's expected record count.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { normaliseRefValue, refShowFields } from '@nidus/shared/utils/registerRecordRef'

/**
 * @param {object} props
 * @param {object} props.field
 * @param {*} props.value
 * @param {(id: string) => string|null} props.hrefFor         link to a referenced record
 * @param {(field: object, ids: string[]) => Promise<Record<string, {label: string, value: string}[]>>} [props.loadFacts]
 */
export default function RecordRefView({ field, value, hrefFor, loadFacts }) {
  const refs = normaliseRefValue(value)
  const ids = refs.map((r) => r.id).join(',')
  const wantsFacts = refShowFields(field).length > 0 && Boolean(loadFacts)
  const [facts, setFacts] = useState({ key: null, data: {} })

  useEffect(() => {
    if (!wantsFacts || !ids) return undefined
    let cancelled = false
    loadFacts(field, ids.split(','))
      .then((data) => { if (!cancelled) setFacts({ key: ids, data: data || {} }) })
      .catch(() => { if (!cancelled) setFacts({ key: ids, data: {} }) })
    return () => { cancelled = true }
  }, [wantsFacts, ids]) // eslint-disable-line react-hooks/exhaustive-deps

  if (refs.length === 0) return <p className="text-sm text-gray-700 dark:text-gray-300">—</p>
  return (
    <ul className="space-y-1">
      {refs.map((ref) => {
        const href = hrefFor?.(ref.id)
        const rows = facts.key === ids ? facts.data[ref.id] || [] : []
        return (
          <li key={ref.id} className="text-sm">
            {href ? (
              <Link to={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{ref.label}</Link>
            ) : (
              <span className="text-gray-700 dark:text-gray-300">{ref.label}</span>
            )}
            {rows.length > 0 && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                {rows.map((r) => `${r.label}: ${r.value}`).join(' · ')}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
