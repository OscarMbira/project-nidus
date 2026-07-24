import { FileText, User, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function AuditEventDetails({ event, onClose }) {
  if (!event) return null

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Audit Event Details
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type
            </label>
            <p className="text-sm text-gray-900 dark:text-white font-mono">
              {event.event_type}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <p className="text-sm text-gray-900 dark:text-white">
              {event.event_category}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Severity
            </label>
            <p className={`text-sm font-medium ${getSeverityColor(event.severity)}`}>
              {event.severity}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <div className="flex items-center gap-2">
              {event.success ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400">Success</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Failed</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timestamp
            </label>
            <p className="text-sm text-gray-900 dark:text-white">
              {new Date(event.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <p className="text-sm text-gray-900 dark:text-white font-mono">
              {event.user_id}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Type
            </label>
            <p className="text-sm text-gray-900 dark:text-white">
              {event.resource_type || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource ID
            </label>
            <p className="text-sm text-gray-900 dark:text-white font-mono">
              {event.resource_id || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <p className="text-sm text-gray-900 dark:text-white font-mono">
              {event.ip_address || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Agent
            </label>
            <p className="text-sm text-gray-900 dark:text-white break-all">
              {event.user_agent || 'N/A'}
            </p>
          </div>
        </div>

        {event.error_message && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Error Message
                </label>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {event.error_message}
                </p>
              </div>
            </div>
          </div>
        )}

        {event.changes && Object.keys(event.changes).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Changes
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                {JSON.stringify(event.changes, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {event.before_state && Object.keys(event.before_state).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Before State
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                {JSON.stringify(event.before_state, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {event.after_state && Object.keys(event.after_state).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              After State
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                {JSON.stringify(event.after_state, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metadata
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

