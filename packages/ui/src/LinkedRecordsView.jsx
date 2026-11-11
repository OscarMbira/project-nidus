/**
 * Read-only view of a "linked records" field (v1332): the source register's records for the same
 * project, one sub-section each — title (with an Open link), description, then "Label: value"
 * bullets. Used on the record page; the exports use the same blocks (registerDocumentModel.js).
 * A core source (v1338, e.g. the Requirements register) arrives with `blocks` already built — one
 * table per category or area — and an `sourceHref` to open that register filtered.
 */
import { Link } from 'react-router-dom'
import { linkedRecordBlocks } from '@nidus/shared/utils/registerDocumentModel'

function BlockTable({ group }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {group.headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {group.rows.map((row, i) => (
            <tr key={i}>
              {group.headers.map((h, c) => (
                <td key={h} className="whitespace-pre-line px-3 py-2 align-top text-gray-700 dark:text-gray-200">{row[c] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * @param {object} props
 * @param {{ register: object, records: object[], blocks?: object[] }|null} props.linked
 * @param {boolean} [props.loading]
 * @param {string|null} [props.error]
 * @param {object|null} [props.settings]  resolved Regional & Format settings
 * @param {(record: object) => string} [props.recordHref]  link to a source record's page
 * @param {string|null} [props.sourceHref]  link to the source register (core sources)
 */
export default function LinkedRecordsView({ linked, loading = false, error = null, settings = null, recordHref = null, sourceHref = null }) {
  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  const sourceLabel = linked?.register?.label || 'the linked register'
  const openSource = sourceHref ? (
    <Link to={sourceHref} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
      Open {sourceLabel}
    </Link>
  ) : null

  if (Array.isArray(linked?.blocks)) {
    if (linked.blocks.length === 0) {
      return (
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nothing in {sourceLabel} for this project yet.</p>
          {openSource}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {linked.records?.length || 0} item{linked.records?.length === 1 ? '' : 's'} from {sourceLabel}. Edit them there.
          </p>
          {openSource}
        </div>
        {linked.blocks.map((block) => (
          <section key={block.id} className="space-y-2">
            {linked.blocks.length > 1 && (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{block.title}</h3>
            )}
            {block.intro && <p className="text-sm text-gray-700 dark:text-gray-300">{block.intro}</p>}
            {(block.groups || []).filter((g) => g.kind === 'table').map((group) => (
              <BlockTable key={group.label} group={group} />
            ))}
          </section>
        ))}
      </div>
    )
  }

  const blocks = linkedRecordBlocks(linked, settings)
  if (blocks.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No records in {sourceLabel} for this project yet.</p>
  }
  const byId = new Map((linked?.records || []).map((r) => [r.id, r]))

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {blocks.length} record{blocks.length === 1 ? '' : 's'} from {sourceLabel}. Edit them in {sourceLabel}.
      </p>
      {blocks.map((block, index) => {
        const href = recordHref ? recordHref(byId.get(block.id)) : null
        return (
          <section key={block.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {index + 1}. {block.title}
              </h3>
              {href && (
                <Link to={href} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  Open
                </Link>
              )}
            </div>
            {block.intro && <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{block.intro}</p>}
            {block.lines.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {block.lines.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
