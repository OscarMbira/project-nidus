import { Table2, AlertTriangle, Pencil } from 'lucide-react'
import ExportListMenu from '../ui/ExportListMenu'
import { SEAM_LEVELS, prettySeamLevel } from '../../utils/stakeholderSEAMUtils'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

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
  onEdit,
  onStakeholderClick,
  showExport = true,
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
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
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
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
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

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900/80">
            <tr>
                <TableRowNumberHeader className="!normal-case" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Stakeholder
              </th>
              {SEAM_LEVELS.map((level) => (
                <th
                  key={level}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase"
                >
                  {prettySeamLevel(level)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Gap</th>
              {onEdit && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rows.map((row, index) => {
              const hasGap = row.currentLevel !== row.desiredLevel
              return (
                <tr key={row.id} className={hasGap ? 'bg-amber-900/20' : ''}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-3 text-sm font-medium text-white whitespace-nowrap">
                    {onStakeholderClick ? (
                      <button
                        type="button"
                        onClick={() => onStakeholderClick(row.stakeholder_id)}
                        className="text-blue-400 hover:underline text-left"
                      >
                        {row.stakeholder_name}
                      </button>
                    ) : (
                      row.stakeholder_name
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
                                ? 'bg-green-900/40 text-green-200'
                                : isCurrent
                                  ? 'bg-blue-900/40 text-blue-200'
                                  : 'bg-purple-900/40 text-purple-200'
                            }`}
                          >
                            {isCurrent && isDesired ? 'C / D' : isCurrent ? 'C' : 'D'}
                          </span>
                        ) : (
                          <span className="text-gray-600">–</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-xs text-gray-200 whitespace-nowrap">
                    {hasGap ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        {row.gap}
                      </span>
                    ) : (
                      <span className="text-gray-500">Aligned</span>
                    )}
                  </td>
                  {onEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(row.raw || row)}
                        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
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
