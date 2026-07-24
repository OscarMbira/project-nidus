import { LayoutGrid } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listGapRecords } from '../services/gapDataService'

export default function WorkloadHeatmapPage({ sim = false }) {
  const [settings, setSettings] = useState([])
  const [leave, setLeave] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      listGapRecords('workload_capacity_settings', { sim }),
      listGapRecords('workload_leave_calendar', { sim }),
    ])
      .then(([s, l]) => {
        setSettings(s)
        setLeave(l)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sim])

  const getCapacityColor = (pct) => {
    if (pct >= 100) return 'bg-red-500/80'
    if (pct >= 80) return 'bg-amber-500/80'
    return 'bg-green-500/60'
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Workload Heatmap</h1>
          <p className="text-gray-400">Team capacity by member — green available, amber near capacity, red overloaded.</p>
        </div>
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200">{error}</div>}
      <div className="mb-4 flex gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-green-500/60" /> Available</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-amber-500/80" /> Near capacity</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-red-500/80" /> Overloaded</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Daily hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Utilisation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">This week</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {settings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No capacity settings configured yet.
                </td>
              </tr>
            ) : (
              settings.map((row) => {
                const pct = row.utilisation_pct ?? row.target_utilisation_pct ?? 0
                return (
                  <tr key={row.id} className="bg-gray-900 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-200">{row.member_name || row.user_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{row.daily_hours ?? '—'}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-16 h-6 rounded ${getCapacityColor(pct)}`} title={`${pct}%`} />
                        <span className="text-sm text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {leave.filter((l) => l.user_id === row.user_id).length} leave day(s)
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
