import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { getTolerances, getToleranceBreaches } from '../../../services/highlightReportToleranceService'
import { calculateAllTolerances } from '../../../services/highlightReportToleranceService'

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
export default function HighlightReportToleranceSection({ reportId, formData, onChange, mode }) {
  const [tolerances, setTolerances] = useState([])
  const [breaches, setBreaches] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

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

  const handleSync = async () => {
    if (!reportId) return
    setSyncing(true)
    try {
      await calculateAllTolerances(reportId)
      await load()
    } catch (e) {
      console.warn('Sync tolerances:', e)
    } finally {
      setSyncing(false)
    }
  }

  const disabled = mode === 'view'
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

  const statusBadge = (s) => {
    const v = (s || '').toLowerCase()
    if (v.includes('exceeded') || v === 'exception')
      return <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">Exceeded</span>
    if (v.includes('approach'))
      return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">Approaching</span>
    return <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">Within</span>
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Tolerance Status
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Tolerance status from stage; sync from stage or enter summaries.
        </p>
      </div>

      {reportId && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || disabled}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from stage'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading tolerances…</p>
      ) : tolerances.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Current</th>
                <th className="px-3 py-2 text-right">Baseline</th>
                <th className="px-3 py-2 text-right">Variance %</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {tolerances.map((t) => (
                <tr key={t.id} className="border-t border-gray-200 dark:border-gray-600">
                  <td className="px-3 py-2">{t.tolerance_type}</td>
                  <td className="px-3 py-2 text-right">{t.current_value != null ? Number(t.current_value) : '—'}</td>
                  <td className="px-3 py-2 text-right">{t.baseline_value != null ? Number(t.baseline_value) : '—'}</td>
                  <td className="px-3 py-2 text-right">{t.variance_percentage != null ? `${Number(t.variance_percentage).toFixed(1)}%` : '—'}</td>
                  <td className="px-3 py-2">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : reportId ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tolerance data. Use &quot;Sync from stage&quot; or add stage tolerances.</p>
      ) : null}

      {breaches.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            Tolerance breaches
          </h4>
          <ul className="list-disc list-inside text-sm text-amber-800 dark:text-amber-200">
            {breaches.map((b, index) => (
              <li key={b.id}>{b.tolerance_type}: {b.status_notes || b.status}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tolerance breaches summary</label>
          <textarea
            value={formData.tolerance_breaches_summary || ''}
            onChange={(e) => onChange('tolerance_breaches_summary', e.target.value)}
            disabled={disabled}
            rows={2}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tolerance warnings summary</label>
          <textarea
            value={formData.tolerance_warnings_summary || ''}
            onChange={(e) => onChange('tolerance_warnings_summary', e.target.value)}
            disabled={disabled}
            rows={2}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.escalation_required}
            onChange={(e) => onChange('escalation_required', e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Escalation required</span>
        </label>
      </div>
      {formData.escalation_required && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Escalation reason</label>
          <textarea
            value={formData.escalation_reason || ''}
            onChange={(e) => onChange('escalation_reason', e.target.value)}
            disabled={disabled}
            rows={2}
            className={inputClass}
          />
        </div>
      )}
    </div>
  )
}
