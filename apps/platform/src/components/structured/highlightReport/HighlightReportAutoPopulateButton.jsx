import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { autoPopulateFromStage } from '../../../services/controllingStageService'

export default function HighlightReportAutoPopulateButton({ reportId, stageBoundaryId, onComplete }) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)

  const handleClick = async () => {
    if (!reportId) return
    setSyncing(true)
    setMessage(null)
    try {
      await autoPopulateFromStage(reportId, stageBoundaryId)
      setMessage('Report populated from stage data.')
      onComplete?.()
    } catch (e) {
      console.warn('Auto-populate:', e)
      setMessage('Could not populate. Check stage data.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={syncing || !reportId}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 text-sm"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Populating…' : 'Auto-populate from stage'}
      </button>
      {message && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
      )}
    </div>
  )
}
