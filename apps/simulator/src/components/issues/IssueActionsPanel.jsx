import { useState } from 'react'
import { Plus, CheckCircle, Clock, XCircle, AlertCircle, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { addAction, completeAction, cancelAction, blockAction } from '../../services/issueActionService'
import ActionForm from './ActionForm'

export default function IssueActionsPanel({ issueId, actions, onRefresh }) {
  const [showActionForm, setShowActionForm] = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)

  const handleComplete = async (actionId) => {
    try {
      const notes = prompt('Enter completion notes (optional):')
      await completeAction(actionId, notes || null)
      onRefresh()
    } catch (error) {
      console.error('Error completing action:', error)
      alert('Error: ' + error.message)
    }
  }

  const handleCancel = async (actionId) => {
    try {
      const reason = prompt('Enter cancellation reason:')
      if (reason) {
        await cancelAction(actionId, reason)
        onRefresh()
      }
    } catch (error) {
      console.error('Error cancelling action:', error)
      alert('Error: ' + error.message)
    }
  }

  const handleBlock = async (actionId) => {
    try {
      const reason = prompt('Enter blocking reason:')
      if (reason) {
        await blockAction(actionId, reason)
        onRefresh()
      }
    } catch (error) {
      console.error('Error blocking action:', error)
      alert('Error: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
  }

  const getActionTypeColor = (type) => {
    switch (type) {
      case 'corrective':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'preventive':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'investigation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'escalation':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const isOverdue = (action) => {
    return action.target_date && 
           new Date(action.target_date) < new Date() && 
           action.status !== 'completed' && 
           action.status !== 'cancelled'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Resolution Actions ({actions.length})
        </h3>
        <button
          onClick={() => {
            setSelectedAction(null)
            setShowActionForm(true)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Action
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No actions yet. Add an action to track resolution steps.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border ${
                isOverdue(action) 
                  ? 'border-red-300 dark:border-red-700' 
                  : 'border-gray-200 dark:border-gray-700'
              } p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Action #{action.action_number}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionTypeColor(action.action_type)}`}>
                      {action.action_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(action.status)}`}>
                      {action.status.replace('_', ' ')}
                    </span>
                    {isOverdue(action) && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white mb-2">
                    {action.action_description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {action.assigned_to && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{action.assigned_to.full_name || action.assigned_to.email || action.assigned_to_name}</span>
                      </div>
                    )}
                    {action.target_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Target: {format(new Date(action.target_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    {action.estimated_effort_hours && (
                      <span>Est: {action.estimated_effort_hours}h</span>
                    )}
                    {action.estimated_cost && (
                      <span>Est Cost: ${parseFloat(action.estimated_cost).toLocaleString()}</span>
                    )}
                  </div>
                  {action.completion_notes && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-2">
                      {action.completion_notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {action.status === 'planned' && (
                    <button
                      onClick={() => handleComplete(action.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Complete
                    </button>
                  )}
                  {action.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => handleComplete(action.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleBlock(action.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Block
                      </button>
                    </>
                  )}
                  {action.status !== 'completed' && action.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(action.id)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showActionForm && (
        <ActionForm
          issueId={issueId}
          action={selectedAction}
          onSave={() => {
            setShowActionForm(false)
            setSelectedAction(null)
            onRefresh()
          }}
          onCancel={() => {
            setShowActionForm(false)
            setSelectedAction(null)
          }}
        />
      )}
    </div>
  )
}
