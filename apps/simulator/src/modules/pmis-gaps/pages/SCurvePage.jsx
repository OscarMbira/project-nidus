import { LineChart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listGapRecords } from '../services/gapDataService'

export default function SCurvePage({ sim = false }) {
  const [baselines, setBaselines] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      listGapRecords('project_baselines', { sim }),
      listGapRecords('baseline_snapshots', { sim, orderBy: 'snapshot_date' }),
    ])
      .then(([b, s]) => {
        setBaselines(b)
        setSnapshots(s)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sim])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <LineChart className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-gray-100">S-Curve & Baseline Comparison</h1>
          <p className="text-gray-400">Planned vs actual progress over time.</p>
        </div>
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {baselines.length === 0 ? (
              <p className="text-gray-500 col-span-3">No baselines defined.</p>
            ) : (
              baselines.map((b) => (
                <div key={b.id} className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="font-medium text-gray-100">{b.baseline_name || b.name}</div>
                  <div className="text-sm text-gray-400 mt-1">Version {b.baseline_version ?? '—'}</div>
                </div>
              ))
            )}
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 min-h-[200px]">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Snapshot trend ({snapshots.length} points)</h2>
            {snapshots.length === 0 ? (
              <p className="text-gray-500 text-sm">No snapshot data yet.</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {snapshots.slice(-30).map((s, i) => {
                  const pct = Math.min(100, Math.max(0, Number(s.planned_pct ?? s.progress_pct ?? 0)))
                  return (
                    <div
                      key={s.id || i}
                      className="flex-1 bg-blue-500/70 rounded-t"
                      style={{ height: `${pct}%` }}
                      title={`${s.snapshot_date}: ${pct}%`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
