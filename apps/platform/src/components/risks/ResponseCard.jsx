/**
 * Response Card Component
 * Display individual response action
 */

import { CheckCircle, Clock, XCircle, Edit, Trash2, Calendar, User, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react'
import ResponseStatusBadge from './ResponseStatusBadge'
import EffectivenessRating from './EffectivenessRating'

export default function ResponseCard({ response, onEdit, onDelete, onComplete }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  const isOverdue = response.target_date && 
    new Date(response.target_date) < new Date() && 
    (response.status === 'planned' || response.status === 'in_progress')

  const getActionTypeIcon = (type) => {
    switch (type) {
      case 'preventive': return <CheckCircle className="h-4 w-4" />
      case 'corrective': return <XCircle className="h-4 w-4" />
      case 'contingency': return <AlertCircle className="h-4 w-4" />
      case 'fallback': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
      isOverdue ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
              Action #{response.response_number}
            </span>
            <ResponseStatusBadge status={response.status} />
            {getActionTypeIcon(response.action_type)}
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {response.action_type?.replace('_', ' ')}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {response.action_description}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {response.status !== 'completed' && response.status !== 'cancelled' && (
            <>
              {onComplete && (
                <button
                  onClick={() => {
                    const notes = prompt('Completion notes (optional):')
                    if (notes !== null) {
                      onComplete(response.id, notes)
                    }
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  title="Mark as complete"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
        {response.assigned_to_user && (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{response.assigned_to_user.full_name || response.assigned_to_name || 'Unassigned'}</span>
          </div>
        )}
        {response.target_date && (
          <div className={`flex items-center gap-1 ${
            isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'
          }`}>
            <Calendar className="h-4 w-4" />
            <span>{formatDate(response.target_date)}</span>
            {isOverdue && <span className="text-xs">(Overdue)</span>}
          </div>
        )}
        {response.estimated_cost && (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <DollarSign className="h-4 w-4" />
            <span>${parseFloat(response.estimated_cost).toLocaleString()}</span>
          </div>
        )}
        {response.actual_cost && (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <DollarSign className="h-4 w-4" />
            <span>Actual: ${parseFloat(response.actual_cost).toLocaleString()}</span>
          </div>
        )}
      </div>

      {response.completion_notes && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          <strong>Completion Notes:</strong> {response.completion_notes}
        </div>
      )}

      {response.status === 'completed' && response.effectiveness_rating && (
        <div className="mt-3">
          <EffectivenessRating rating={response.effectiveness_rating} readOnly />
        </div>
      )}
    </div>
  )
}
