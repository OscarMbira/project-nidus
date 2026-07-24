import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, CheckCircle, Clock, XCircle, Circle, User, Calendar, Save, X } from 'lucide-react'

export default function ActionItemTracker({ actionItems, sprintId, projectId, onUpdate, currentUserId }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newActionItem, setNewActionItem] = useState({
    action_description: '',
    action_priority: 'medium',
    target_completion_date: '',
    assigned_to_user_id: '',
  })
  const [saving, setSaving] = useState(false)

  const handleAddActionItem = async () => {
    if (!newActionItem.action_description.trim()) {
      alert('Please enter action description')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('retrospective_action_items')
        .insert({
          ...newActionItem,
          sprint_id: sprintId,
          project_id: projectId,
          created_by_user_id: user.id,
          status: 'open',
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewActionItem({
        action_description: '',
        action_priority: 'medium',
        target_completion_date: '',
        assigned_to_user_id: '',
      })
      setShowAddForm(false)
      onUpdate()
    } catch (error) {
      console.error('Error adding action item:', error)
      alert('Error adding action item: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        status: newStatus,
        updated_by: user.id,
      }

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('retrospective_action_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error updating action item:', error)
      alert('Error updating action item: ' + error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const openItems = actionItems.filter(item => item.status === 'open')
  const inProgressItems = actionItems.filter(item => item.status === 'in_progress')
  const completedItems = actionItems.filter(item => item.status === 'completed')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Action Items
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Action Item
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action Description
            </label>
            <textarea
              value={newActionItem.action_description}
              onChange={(e) => setNewActionItem({ ...newActionItem, action_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Describe the action item..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={newActionItem.action_priority}
                onChange={(e) => setNewActionItem({ ...newActionItem, action_priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Completion Date
              </label>
              <input
                type="date"
                value={newActionItem.target_completion_date}
                onChange={(e) => setNewActionItem({ ...newActionItem, target_completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddActionItem}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Add Action Item'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewActionItem({
                  action_description: '',
                  action_priority: 'medium',
                  target_completion_date: '',
                  assigned_to_user_id: '',
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Open Items */}
        {openItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Open ({openItems.length})
            </h3>
            <div className="space-y-2">
              {openItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateStatus}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Items */}
        {inProgressItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              In Progress ({inProgressItems.length})
            </h3>
            <div className="space-y-2">
              {inProgressItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateStatus}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Completed ({completedItems.length})
            </h3>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateStatus}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}

        {actionItems.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No action items yet. Add action items to track improvements!
          </p>
        )}
      </div>
    </div>
  )
}

function ActionItemCard({ item, onUpdateStatus, currentUserId }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-gray-900 dark:text-white flex-1">
          {item.action_description}
        </p>
        <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
        {item.assigned_to && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{item.assigned_to.full_name || item.assigned_to.email}</span>
          </div>
        )}
        {item.target_completion_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(item.target_completion_date), 'MMM dd, yyyy')}</span>
          </div>
        )}
        {item.action_priority && (
          <span className="capitalize">{item.action_priority} priority</span>
        )}
      </div>
      {item.status !== 'completed' && item.status !== 'cancelled' && (
        <div className="flex gap-2">
          {item.status === 'open' && (
            <button
              onClick={() => onUpdateStatus(item.id, 'in_progress')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              Start
            </button>
          )}
          {item.status === 'in_progress' && (
            <button
              onClick={() => onUpdateStatus(item.id, 'completed')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
            >
              Complete
            </button>
          )}
          <button
            onClick={() => onUpdateStatus(item.id, 'cancelled')}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

