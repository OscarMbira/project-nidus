/**
 * Quality Activity Actions Component
 * Manages action items (corrective, preventive, improvement) from quality activities
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Plus, CheckCircle, XCircle, Clock, Flag } from 'lucide-react';
import { getActions, addAction, completeAction, verifyAction, deleteAction } from '../../services/qualityActivityActionsService';
import { supabase } from '../../services/supabaseClient';

export default function QualityActivityActions({ activityType, activityId, onUpdate }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [newAction, setNewAction] = useState({
    action_description: '',
    action_type: 'corrective',
    priority: 'medium',
    assigned_to_id: '',
    due_date: ''
  });

  useEffect(() => {
    fetchActions();
    fetchUsers();
  }, [activityType, activityId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const result = await getActions(activityType, activityId);
      if (result.success) {
        setActions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.action_description) {
      alert('Please enter an action description');
      return;
    }

    try {
      const result = await addAction(activityType, activityId, newAction);
      if (result.success) {
        setNewAction({
          action_description: '',
          action_type: 'corrective',
          priority: 'medium',
          assigned_to_id: '',
          due_date: ''
        });
        setShowAddForm(false);
        fetchActions();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error adding action:', error);
      alert('Error adding action: ' + error.message);
    }
  };

  const handleCompleteAction = async (actionId, notes = '') => {
    try {
      const result = await completeAction(actionId, notes);
      if (result.success) {
        fetchActions();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error completing action:', error);
      alert('Error completing action: ' + error.message);
    }
  };

  const handleVerifyAction = async (actionId, notes = '') => {
    try {
      const result = await verifyAction(actionId, notes);
      if (result.success) {
        fetchActions();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error verifying action:', error);
      alert('Error verifying action: ' + error.message);
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (!window.confirm('Are you sure you want to delete this action?')) {
      return;
    }

    try {
      const result = await deleteAction(actionId);
      if (result.success) {
        fetchActions();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting action:', error);
      alert('Error deleting action: ' + error.message);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'open':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || ['completed', 'verified', 'closed', 'cancelled'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Action Items
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Action
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Description *
              </label>
              <textarea
                value={newAction.action_description}
                onChange={(e) => setNewAction({ ...newAction, action_description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the action required..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type
              </label>
              <select
                value={newAction.action_type}
                onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="improvement">Improvement</option>
                <option value="observation">Observation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={newAction.priority}
                onChange={(e) => setNewAction({ ...newAction, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <select
                value={newAction.assigned_to_id}
                onChange={(e) => setNewAction({ ...newAction, assigned_to_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={newAction.due_date}
                onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAction({
                  action_description: '',
                  action_type: 'corrective',
                  priority: 'medium',
                  assigned_to_id: '',
                  due_date: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAction}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Action
            </button>
          </div>
        </div>
      )}

      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No action items yet
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`p-4 border rounded-lg ${
                isOverdue(action.due_date, action.status)
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}>
                      {action.priority} priority
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action.status)}`}>
                      {action.status.replace('_', ' ')}
                    </span>
                    {isOverdue(action.due_date, action.status) && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {action.action_description}
                  </div>
                  {action.assigned_to_user && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Assigned to: {action.assigned_to_user.full_name || action.assigned_to_user.email}
                    </div>
                  )}
                  {action.due_date && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Due: {new Date(action.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {action.completion_notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Completion Notes:</strong> {action.completion_notes}
                    </div>
                  )}
                  {action.verification_notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Verification Notes:</strong> {action.verification_notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {action.status === 'open' && (
                    <button
                      onClick={() => handleCompleteAction(action.id)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title="Mark as Completed"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  {action.status === 'completed' && (
                    <button
                      onClick={() => handleVerifyAction(action.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Verify"
                    >
                      <Flag className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAction(action.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Delete"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
