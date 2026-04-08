import { format } from 'date-fns'
import { Clock, User, ArrowRight } from 'lucide-react'

export default function IssueStatusHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No status history available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Status History ({history.length})
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

        {history.map((entry, index) => (
          <div key={entry.id} className="relative flex items-start gap-4 pb-6">
            {/* Timeline dot */}
            <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
              <Clock className="h-4 w-4 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {entry.previous_status ? (
                    <>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                        {entry.previous_status.replace('_', ' ')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                        {entry.new_status.replace('_', ' ')}
                      </span>
                    </>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                      {entry.new_status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(entry.changed_date), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <User className="h-4 w-4" />
                <span>
                  {entry.changed_by_user?.full_name || entry.changed_by_user?.email || 'Unknown'}
                </span>
              </div>
              {entry.change_reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Reason: {entry.change_reason}
                </p>
              )}
              {entry.notes && (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
