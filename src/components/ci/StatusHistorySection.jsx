/**
 * Status History Section Component
 * Displays status change history for a configuration item
 */

import { useState, useEffect } from 'react'
import { BarChart3, Calendar, User, FileText } from 'lucide-react'
import { getStatusHistory } from '../../services/configurationItemStatusService'
import StatusBadge from './StatusBadge'

export default function StatusHistorySection({ itemId }) {
  const [statusHistory, setStatusHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (itemId) {
      fetchStatusHistory()
    }
  }, [itemId])

  const fetchStatusHistory = async () => {
    try {
      setLoading(true)
      const data = await getStatusHistory(itemId)
      setStatusHistory(data || [])
    } catch (error) {
      console.error('Error fetching status history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Status History
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {statusHistory.length} change{statusHistory.length !== 1 ? 's' : ''}
        </span>
      </div>

      {statusHistory.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No status changes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {statusHistory.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {entry.previous_status_code ? (
                    <>
                      <StatusBadge statusCode={entry.previous_status_code} />
                      <span className="text-gray-400">→</span>
                      <StatusBadge statusCode={entry.new_status_code} />
                    </>
                  ) : (
                    <StatusBadge statusCode={entry.new_status_code} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(entry.status_change_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                {entry.changed_by && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{entry.changed_by.full_name || entry.changed_by.email}</span>
                  </div>
                )}
              </div>

              {entry.change_reason && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.change_reason}
                  </p>
                </div>
              )}

              {entry.change_notes && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.change_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
