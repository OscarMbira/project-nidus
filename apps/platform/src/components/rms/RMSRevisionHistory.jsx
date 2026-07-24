/**
 * RMS Revision History Component
 * Display version history for Risk Management Strategy
 */

import { useState, useEffect } from 'react'
import { Clock, User, FileText } from 'lucide-react'
import { getRevisionHistory } from '../../services/riskManagementStrategyService'

export default function RMSRevisionHistory({ rmsId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadHistory()
    }
  }, [rmsId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const result = await getRevisionHistory(rmsId)
      if (result.success) {
        setHistory(result.data || [])
      }
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!rmsId) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Save RMS to view revision history
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading revision history...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No revision history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Revision History
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track changes and versions of the Risk Management Strategy
        </p>
      </div>

      <div className="space-y-3">
        {history.map((revision, index) => (
          <div
            key={revision.id || index}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Version {revision.version_number || 'N/A'}
                  </span>
                  {revision.is_current_version && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      Current
                    </span>
                  )}
                </div>
                
                {revision.revision_reason && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {revision.revision_reason}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {revision.created_by_user && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{revision.created_by_user.full_name || revision.created_by_name}</span>
                    </div>
                  )}
                  {revision.created_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(revision.created_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {revision.changes_summary && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Changes:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{revision.changes_summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
