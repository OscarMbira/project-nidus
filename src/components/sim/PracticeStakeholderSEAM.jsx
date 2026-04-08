import { useState, useEffect } from 'react'
import { Table2, AlertTriangle } from 'lucide-react'
import { getPracticeStakeholderAnalysis } from '../../services/sim/practiceStakeholderService'
import ExportListMenu from '../ui/ExportListMenu'

const SEAM_COLUMNS = [
  { key: 'stakeholder_name', label: 'Stakeholder' },
  { key: 'current_level', label: 'Current' },
  { key: 'desired_level', label: 'Desired' },
  { key: 'gap', label: 'Gap' },
]

const LEVELS = ['unaware', 'resistant', 'neutral', 'supportive', 'leading']

function mapAttitudeToLevel(attitude) {
  if (!attitude) return 'unaware'
  const a = String(attitude).toLowerCase()
  if (a === 'champion') return 'leading'
  if (a === 'supporter') return 'supportive'
  if (a === 'neutral') return 'neutral'
  if (a === 'critic' || a === 'blocker') return 'resistant'
  return 'unaware'
}

function prettyLevel(level) {
  switch (level) {
    case 'unaware': return 'Unaware'
    case 'resistant': return 'Resistant'
    case 'neutral': return 'Neutral'
    case 'supportive': return 'Supportive'
    case 'leading': return 'Leading'
    default: return level
  }
}

export default function PracticeStakeholderSEAM({ practiceProjectId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!practiceProjectId) {
      setRows([])
      setLoading(false)
      return
    }
    load()
  }, [practiceProjectId])

  const load = async () => {
    if (!practiceProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeStakeholderAnalysis({ practice_project_id: practiceProjectId })
      if (!res.success) throw new Error(res.error || 'Failed to load analysis')
      const data = res.data || []
      const latestByStakeholder = new Map()
      data.forEach((rec) => {
        const existing = latestByStakeholder.get(rec.practice_stakeholder_id)
        if (!existing || new Date(rec.analysis_date) > new Date(existing.analysis_date)) {
          latestByStakeholder.set(rec.practice_stakeholder_id, rec)
        }
      })
      const mapped = Array.from(latestByStakeholder.values()).map((rec) => {
        const currentLevel = mapAttitudeToLevel(rec.current_attitude)
        const desiredLevel = mapAttitudeToLevel(rec.desired_attitude)
        const gap = currentLevel === desiredLevel
          ? 'None'
          : `${prettyLevel(currentLevel)} → ${prettyLevel(desiredLevel)}`
        return {
          id: rec.id,
          stakeholder_name: rec.practice_stakeholder?.stakeholder_name || 'Unknown',
          currentLevel,
          desiredLevel,
          gap,
        }
      })
      setRows(mapped)
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  if (!practiceProjectId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
        Select a practice project above to view the Stakeholder Engagement Assessment Matrix.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
        No practice stakeholder analysis records found. Capture analysis first, then SEAM will be available.
      </div>
    )
  }

  const exportData = rows.map(r => ({
    stakeholder_name: r.stakeholder_name,
    current_level: prettyLevel(r.currentLevel),
    desired_level: prettyLevel(r.desiredLevel),
    gap: r.gap,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Table2 className="h-5 w-5 text-amber-500" />
          Practice Stakeholder SEAM
        </h3>
        <ExportListMenu
          columns={SEAM_COLUMNS}
          data={exportData}
          baseFilename="Practice-Stakeholder-SEAM"
          disabled={!rows.length}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>
              {LEVELS.map(level => (
                <th key={level} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {prettyLevel(level)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map(row => {
              const hasGap = row.currentLevel !== row.desiredLevel
              return (
                <tr key={row.id} className={hasGap ? 'bg-amber-50/60 dark:bg-amber-900/20' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {row.stakeholder_name}
                  </td>
                  {LEVELS.map(level => {
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
                          <span className="text-gray-300 dark:text-gray-600">–</span>
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
                      <span className="text-gray-400 dark:text-gray-500">Aligned</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

