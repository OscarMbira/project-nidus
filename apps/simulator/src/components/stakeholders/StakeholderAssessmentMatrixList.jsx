import { useMemo } from 'react'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import ViewToggle from '../ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { platformDb } from '../../services/supabaseClient'
import StakeholderAvatar from '../ui/StakeholderAvatar'
import RowNumberBadge from '../ui/RowNumberBadge'
import { RowActionButton } from '@nidus/ui'

function sortIndicator(direction) {
  if (direction === 'asc') return '↑'
  if (direction === 'desc') return '↓'
  return '⇅'
}

const thClass =
  'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-100'

export default function StakeholderAssessmentMatrixList({
  records = [],
  search = '',
  onView,
  onEdit,
  onDelete,
  onStakeholderClick,
  syncFromProfile = true,
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-700 dark:text-gray-200">
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
          {displayRows.map((r, index) => {
            const hasGap = r.current_level !== r.desired_level
            return (
              <article
                key={r.id}
                className={`rounded-lg border p-4 ${
                  hasGap
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 min-w-0">
                  {onStakeholderClick ? (
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                      onClick={() => onStakeholderClick(r.stakeholder_id)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <StakeholderAvatar db={platformDb} stakeholder={r.stakeholder} syncFromProfile={syncFromProfile} sizeClassName="h-6 w-6" />
                        {r.stakeholder?.stakeholder_name || '—'}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <StakeholderAvatar db={platformDb} stakeholder={r.stakeholder} syncFromProfile={syncFromProfile} sizeClassName="h-6 w-6" />
                      {r.stakeholder?.stakeholder_name || '—'}
                    </span>
                  )}
                </h4>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">{r.assessment_date}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                  C: {prettySeamLevel(r.current_level)} · D: {prettySeamLevel(r.desired_level)}
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">{r.gap_summary || 'Aligned'}</p>
                <div className="mt-3 flex gap-2 justify-end">
                  <RowActionButton
                    variant="view"
                    label="View assessment"
                    onClick={() => onView?.(r)}
                  />
                  <RowActionButton
                    variant="edit"
                    label="Edit assessment"
                    onClick={() => onEdit?.(r)}
                  />
                  <RowActionButton
                    variant="delete"
                    label="Delete assessment"
                    onClick={() => onDelete?.(r)}
                    disabled={deletingId === r.id}
                  />
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayRows.map((r, index) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {onStakeholderClick ? (
                      <button
                        type="button"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => onStakeholderClick(r.stakeholder_id)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <StakeholderAvatar db={platformDb} stakeholder={r.stakeholder} syncFromProfile={syncFromProfile} sizeClassName="h-6 w-6" />
                          {r.stakeholder?.stakeholder_name || '—'}
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <StakeholderAvatar db={platformDb} stakeholder={r.stakeholder} syncFromProfile={syncFromProfile} sizeClassName="h-6 w-6" />
                        {r.stakeholder?.stakeholder_name || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{r.assessment_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 capitalize">
                    {prettySeamLevel(r.current_level)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 capitalize">
                    {prettySeamLevel(r.desired_level)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{r.gap_summary || 'Aligned'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex justify-end gap-1">
                    <RowActionButton
                      variant="view"
                      label="View assessment"
                      onClick={() => onView?.(r)}
                    />
                    <RowActionButton
                      variant="edit"
                      label="Edit assessment"
                      onClick={() => onEdit?.(r)}
                    />
                    <RowActionButton
                      variant="delete"
                      label="Delete assessment"
                      onClick={() => onDelete?.(r)}
                      disabled={deletingId === r.id}
                    />
                    </div>
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
