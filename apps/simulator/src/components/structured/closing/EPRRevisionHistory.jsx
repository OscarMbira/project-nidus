import { useState, useEffect } from 'react'
import { History, User } from 'lucide-react'
import { getVersionHistory } from '../../../services/eprRevisionService'
import { format } from 'date-fns'

export default function EPRRevisionHistory({ reportId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadHistory()
    }
  }, [reportId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await getVersionHistory(reportId)
      setHistory(data)
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No revision history</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <History className="h-5 w-5" />
          Revision History
        </h3>
      </div>

      <div className="space-y-3">
        {history.map((revision) => (
          <div key={revision.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-white dark:bg-gray-800 rounded-r-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Version {revision.version_no}</span>
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {format(new Date(revision.revision_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                {revision.summary_of_changes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{revision.summary_of_changes}</p>
                )}
              </div>
              {revision.revised_by_user && (
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {revision.revised_by_user.full_name || revision.revised_by_user.email}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
