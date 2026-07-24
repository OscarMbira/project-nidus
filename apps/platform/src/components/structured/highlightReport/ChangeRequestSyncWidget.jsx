import { useState, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import { getChangeRequests, getChangeRequestsByStatus } from '../../../services/highlightReportChangeService'

export default function ChangeRequestSyncWidget({ reportId }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await getChangeRequests(reportId)
      setChanges(data || [])
    } catch (e) {
      console.warn('Load change requests:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!reportId) return null

  const pending = changes.filter((c) => (c.change_status || '').toLowerCase() === 'pending')
  const approved = changes.filter((c) => (c.change_status || '').toLowerCase() === 'approved')

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Change requests
      </h4>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : changes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">None linked.</p>
      ) : (
        <div className="text-sm space-y-1">
          <p className="text-gray-700 dark:text-gray-300">
            {changes.length} total · {approved.length} approved · {pending.length} pending
          </p>
        </div>
      )}
    </div>
  )
}
