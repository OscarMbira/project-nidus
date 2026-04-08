import { useState } from 'react'
import { ArrowRight, Plus, Edit2, Trash2, CheckCircle } from 'lucide-react'
import { addFollowOnAction, updateFollowOnAction, deleteFollowOnAction, completeFollowOnAction } from '../../../services/endStageReportActionsService'

export default function EndStageReportActionsSection({ reportId, followOnActions, onFollowOnActionsChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const handleAdd = async (actionData) => {
    try {
      const added = await addFollowOnAction(reportId, actionData)
      onFollowOnActionsChange([...followOnActions, added])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding follow-on action:', error)
      alert('Error adding follow-on action: ' + error.message)
    }
  }

  const handleUpdate = async (actionId, updates) => {
    try {
      const updated = await updateFollowOnAction(actionId, updates)
      onFollowOnActionsChange(followOnActions.map(a => a.id === actionId ? updated : a))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating follow-on action:', error)
      alert('Error updating follow-on action: ' + error.message)
    }
  }

  const handleDelete = async (actionId) => {
    if (!confirm('Delete this follow-on action?')) return

    try {
      await deleteFollowOnAction(actionId)
      onFollowOnActionsChange(followOnActions.filter(a => a.id !== actionId))
    } catch (error) {
      console.error('Error deleting follow-on action:', error)
      alert('Error deleting follow-on action: ' + error.message)
    }
  }

  const handleComplete = async (actionId) => {
    try {
      const completed = await completeFollowOnAction(actionId)
      onFollowOnActionsChange(followOnActions.map(a => a.id === actionId ? completed : a))
    } catch (error) {
      console.error('Error completing action:', error)
      alert('Error completing action: ' + error.message)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Follow-On Actions</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Actions that need to be carried forward to the next stage or addressed post-stage.
            </p>
          </div>
          {mode !== 'view' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Action
            </button>
          )}
        </div>
      </div>

      {followOnActions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No follow-on actions added yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {followOnActions.map((action) => (
            <div key={action.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{action.action_description}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(action.priority)}`}>
                      {action.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(action.status)}`}>
                      {action.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <div>
                      <span>Type: {action.action_type.replace('-', ' ')}</span>
                    </div>
                    {action.target_completion_date && (
                      <div>
                        <span>Target: {new Date(action.target_completion_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {action.assigned_user && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Assigned to: {action.assigned_user.full_name || action.assigned_user.email}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex items-center gap-2">
                    {action.status !== 'completed' && (
                      <button
                        onClick={() => handleComplete(action.id)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(action.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(action.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
