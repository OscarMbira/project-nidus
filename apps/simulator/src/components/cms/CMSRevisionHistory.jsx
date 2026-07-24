/**
 * CMS Revision History Component
 * Display version history
 */

import { useState, useEffect } from 'react'
import { History, Calendar, User, FileText } from 'lucide-react'
import { getRevisionHistory } from '../../services/communicationManagementStrategyService'

export default function CMSRevisionHistory({ cmsId }) {
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cmsId) {
      loadRevisions()
    }
  }, [cmsId])

  const loadRevisions = async () => {
    try {
      setLoading(true)
      const data = await getRevisionHistory(cmsId)
      setRevisions(data || [])
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before viewing revision history
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading revision history...</div>
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No revision history available</p>
        <p className="text-sm mt-1">Revisions will appear here as the CMS is updated</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revision History</h3>
      </div>

      <div className="space-y-3">
        {revisions.map((revision, index) => (
          <div
            key={revision.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Version {revision.version_number || index + 1}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(revision.revision_date || revision.created_at)}
                    </span>
                    {revision.revised_by && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {revision.revised_by.full_name || revision.revised_by.email || 'Unknown'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {index === 0 && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                  Current
                </span>
              )}
            </div>
            {revision.summary_of_changes && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Summary of Changes:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {revision.summary_of_changes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
