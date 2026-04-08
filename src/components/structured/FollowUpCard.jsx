import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function FollowUpCard({ followUp, onComplete, onEdit, mode = 'view' }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'carried_forward':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'in_progress':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'carried_forward':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${
      followUp.status === 'completed'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : followUp.status === 'carried_forward'
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(followUp.status)}
            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(followUp.status)}`}>
              {followUp.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {followUp.follow_up_type}
            </span>
          </div>
          <p className="text-gray-900 dark:text-white mb-2">{followUp.follow_up_item}</p>
          {followUp.resolution && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Resolution:</strong> {followUp.resolution}
            </p>
          )}
          {followUp.due_date && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Due: {new Date(followUp.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
        {mode !== 'view' && followUp.status !== 'completed' && onComplete && (
          <button
            onClick={() => onComplete(followUp.id)}
            className="ml-4 p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
          >
            <CheckCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
