import { Table2, AlertTriangle } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '../ui/ExportListMenu'
import { SEAM_LEVELS, prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { platformDb } from '../../services/supabaseClient'
import StakeholderAvatar from '../ui/StakeholderAvatar'

const SEAM_COLUMNS = [
  { key: 'stakeholder_name', label: 'Stakeholder' },
  { key: 'current_level', label: 'Current' },
  { key: 'desired_level', label: 'Desired' },
  { key: 'gap', label: 'Gap' },
]

/**
 * SEAM grid — parent supplies rows (from stakeholder_assessment_matrix).
 */
export default function StakeholderSEAM({
  rows = [],
  loading = false,
  emptyMessage = 'No assessments yet. Add an assessment to populate the matrix.',
  onView,
  onEdit,
  onDelete,
  deletingId = null,
  onStakeholderClick,
  showExport = true,
  syncFromProfile = true,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-700 dark:text-gray-200">
        {emptyMessage}
      </div>
    )
  }

  const exportData = rows.map((r) => ({
    stakeholder_name: r.stakeholder_name,
    current_level: prettySeamLevel(r.currentLevel),
    desired_level: prettySeamLevel(r.desiredLevel),
    gap: r.gap,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Table2 className="h-5 w-5 text-amber-500" />
          Stakeholder Engagement Assessment Matrix
        </h3>
        {showExport && (
          <ExportListMenu
            columns={SEAM_COLUMNS}
            data={exportData}
            baseFilename="Stakeholder-Assessment-Matrix"
            disabled={!rows.length}
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
                <TableRowNumberHeader className="!normal-case" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Stakeholder
              </th>
              {SEAM_LEVELS.map((level) => (
                <th
                  key={level}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                >
                  {prettySeamLevel(level)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gap</th>
              {(onView || onEdit || onDelete) && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, index) => {
              const hasGap = row.currentLevel !== row.desiredLevel
              return (
                <tr key={row.id} className={hasGap ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {onStakeholderClick ? (
                      <button
                        type="button"
                        onClick={() => onStakeholderClick(row.stakeholder_id)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                      >
                        <span className="inline-flex items-center gap-2">
                          <StakeholderAvatar
                            db={platformDb}
                            stakeholder={{
                              id: row.stakeholder_id,
                              stakeholder_name: row.stakeholder_name,
                              photo_path: row.photo_path,
                              user_id: row.user_id,
                              account_id: row.account_id,
                            }}
                            sizeClassName="h-6 w-6"
                            syncFromProfile={syncFromProfile}
                          />
                          {row.stakeholder_name}
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <StakeholderAvatar
                          db={platformDb}
                          stakeholder={{
                            id: row.stakeholder_id,
                            stakeholder_name: row.stakeholder_name,
                            photo_path: row.photo_path,
                            user_id: row.user_id,
                            account_id: row.account_id,
                          }}
                          sizeClassName="h-6 w-6"
                          syncFromProfile={syncFromProfile}
                        />
                        {row.stakeholder_name}
                      </span>
                    )}
                  </td>
                  {SEAM_LEVELS.map((level, index) => {
                    const isCurrent = row.currentLevel === level
                    const isDesired = row.desiredLevel === level
                    return (
                      <td key={level} className="px-4 py-3 text-center text-xs align-middle">
                        {isCurrent || isDesired ? (
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isCurrent && isDesired
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : isCurrent
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                            }`}
                          >
                            {isCurrent && isDesired ? 'C / D' : isCurrent ? 'C' : 'D'}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">–</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {hasGap ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        {row.gap}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Aligned</span>
                    )}
                  </td>
                  {(onView || onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {onView && (
                          <RowActionButton
                            variant="view"
                            label="View assessment"
                            onClick={() => onView(row.raw || row)}
                          />
                        )}
                        {onEdit && (
                          <RowActionButton
                            variant="edit"
                            label="Edit assessment"
                            onClick={() => onEdit(row.raw || row)}
                          />
                        )}
                        {onDelete && (
                          <RowActionButton
                            variant="delete"
                            label="Delete assessment"
                            onClick={() => onDelete(row.raw || row)}
                            disabled={deletingId === (row.raw?.id || row.id)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
