import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useSortableTable } from '../../hooks/useSortableTable'
import ViewToggle from '../ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { prettySeamLevel } from '../../utils/stakeholderSEAMUtils'

function sortIndicator(direction) {
  if (direction === 'asc') return '↑'
  if (direction === 'desc') return '↓'
  return '⇅'
}

const thClass =
  'px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer select-none hover:text-gray-200'

export default function StakeholderAssessmentMatrixList({
  records = [],
  search = '',
  onEdit,
  onDelete,
  onStakeholderClick,
  deletingId = null,
  pageId = 'stakeholder-assessment-matrix',
}) {
  const [viewMode, setViewMode] = useViewMode(pageId, 'list')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      const name = (r.stakeholder?.stakeholder_name || '').toLowerCase()
      const ref = (r.stakeholder?.stakeholder_reference || '').toLowerCase()
      const gap = (r.gap_summary || '').toLowerCase()
      return name.includes(q) || ref.includes(q) || gap.includes(q)
    })
  }, [records, search])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: `nidus-sort-${pageId}`,
    defaultSort: { column: 'stakeholder_name', direction: 'asc' },
  })

  const accessors = useMemo(
    () => ({
      stakeholder_name: (r) => r.stakeholder?.stakeholder_name || '',
      assessment_date: (r) => r.assessment_date || '',
      current_level: (r) => r.current_level || '',
      desired_level: (r) => r.desired_level || '',
      gap_summary: (r) => r.gap_summary || '',
    }),
    []
  )

  const displayRows = sortedData(filtered, accessors)

  if (!displayRows.length) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
        {search ? 'No assessments match your search.' : 'No assessment records.'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Assessment list layout" />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayRows.map((r) => {
            const hasGap = r.current_level !== r.desired_level
            return (
              <article
                key={r.id}
                className={`rounded-lg border p-4 ${
                  hasGap
                    ? 'border-amber-700/50 bg-amber-950/20'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <h4 className="font-medium text-white">
                  {onStakeholderClick ? (
                    <button
                      type="button"
                      className="text-blue-400 hover:underline text-left"
                      onClick={() => onStakeholderClick(r.stakeholder_id)}
                    >
                      {r.stakeholder?.stakeholder_name || '—'}
                    </button>
                  ) : (
                    r.stakeholder?.stakeholder_name || '—'
                  )}
                </h4>
                <p className="text-xs text-gray-500 mt-1">{r.assessment_date}</p>
                <p className="text-sm text-gray-300 mt-2">
                  C: {prettySeamLevel(r.current_level)} · D: {prettySeamLevel(r.desired_level)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{r.gap_summary || 'Aligned'}</p>
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit?.(r)}
                    className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(r)}
                    disabled={deletingId === r.id}
                    className="text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900/80">
              <tr>
                {[
                  ['stakeholder_name', 'Stakeholder'],
                  ['assessment_date', 'Date'],
                  ['current_level', 'Current (C)'],
                  ['desired_level', 'Desired (D)'],
                  ['gap_summary', 'Gap'],
                ].map(([key, label]) => (
                  <th key={key} className={thClass} onClick={() => handleSort(key)} scope="col">
                    {label} {sortIndicator(getSortDirectionForColumn(key))}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayRows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-sm text-white">
                    {onStakeholderClick ? (
                      <button
                        type="button"
                        className="text-blue-400 hover:underline"
                        onClick={() => onStakeholderClick(r.stakeholder_id)}
                      >
                        {r.stakeholder?.stakeholder_name || '—'}
                      </button>
                    ) : (
                      r.stakeholder?.stakeholder_name || '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{r.assessment_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 capitalize">
                    {prettySeamLevel(r.current_level)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 capitalize">
                    {prettySeamLevel(r.desired_level)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{r.gap_summary || 'Aligned'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onEdit?.(r)}
                      className="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(r)}
                      disabled={deletingId === r.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
