import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { getTolerances, getToleranceBreaches } from '../../../services/highlightReportToleranceService'

export default function ToleranceStatusWidget({ reportId }) {
  const [tolerances, setTolerances] = useState([])
  const [breaches, setBreaches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const [t, b] = await Promise.all([getTolerances(reportId), getToleranceBreaches(reportId)])
      setTolerances(t || [])
      setBreaches(b || [])
    } catch (e) {
      console.warn('Load tolerances:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!reportId) return null

  const statusBadge = (s) => {
    const v = (s || '').toLowerCase()
    if (v.includes('exceeded') || v === 'exception')
      return <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">Exceeded</span>
    if (v.includes('approach'))
      return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">Approaching</span>
    return <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">Within</span>
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Tolerance status
      </h4>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : tolerances.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tolerance data. Sync from stage.</p>
      ) : (
        <div className="space-y-2">
          {tolerances.slice(0, 6).map((t) => (
            <div key={t.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300">{t.tolerance_type}</span>
              {statusBadge(t.status)}
            </div>
          ))}
          {breaches.length > 0 && (
            <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {breaches.length} breach(es)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
