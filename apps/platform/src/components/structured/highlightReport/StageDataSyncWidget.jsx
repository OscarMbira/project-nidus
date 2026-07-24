import { useState } from 'react'
import { RefreshCw, Package, ShieldAlert, AlertCircle, GitBranch, BookOpen, TrendingUp } from 'lucide-react'
import { autoPopulateFromStage } from '../../../services/controllingStageService'

export default function StageDataSyncWidget({ reportId, stageBoundaryId, onComplete }) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)

  const handleSync = async () => {
    if (!reportId) return
    setSyncing(true)
    setResult(null)
    try {
      await autoPopulateFromStage(reportId, stageBoundaryId)
      setResult({ ok: true, message: 'Stage data synced (work packages, progress, tolerances).' })
      onComplete?.()
    } catch (e) {
      console.warn('Stage sync:', e)
      setResult({ ok: false, message: e.message || 'Sync failed.' })
    } finally {
      setSyncing(false)
    }
  }

  if (!reportId) return null

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Sync from stage
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Work packages, progress, tolerances. Use section-specific sync for products, risks, issues, lessons.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync all'}
        </button>
        {result && (
          <span className={`text-sm ${result.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {result.message}
          </span>
        )}
      </div>
    </div>
  )
}
