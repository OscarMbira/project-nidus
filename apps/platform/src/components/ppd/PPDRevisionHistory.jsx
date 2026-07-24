/**
 * PPD Revision History Component
 * Displays version history of PPD
 */

import { useState, useEffect } from 'react'
import { Clock, FileText, User } from 'lucide-react'
import { getRevisionHistory } from '../../services/projectProductDescriptionService'

export default function PPDRevisionHistory({ ppdId }) {
  const [revisionHistory, setRevisionHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ppdId) {
      loadRevisionHistory()
    }
  }, [ppdId])

  const loadRevisionHistory = async () => {
    try {
      setLoading(true)
      const history = await getRevisionHistory(ppdId)
      setRevisionHistory(history || [])
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading revision history...</p>
        </div>
      </div>
    )
  }

  if (revisionHistory.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Clock className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Revision History
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Revision history will appear here when changes are made through change control.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revision History</h3>
      <div className="space-y-4">
        {revisionHistory.map((revision, index) => (
          <div
            key={revision.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Revision {index + 1}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(revision.revision_date).toLocaleDateString()}
                    </p>
                  </div>
                  {revision.revised_by_user && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      {revision.revised_by_user.full_name}
                    </div>
                  )}
                </div>

                {revision.summary_of_changes && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Summary of Changes:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {revision.summary_of_changes}
                    </p>
                  </div>
                )}

                {revision.changes_marked && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Changes Marked:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {revision.changes_marked}
                    </p>
                  </div>
                )}

                {revision.previous_revision_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Previous revision: {new Date(revision.previous_revision_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
