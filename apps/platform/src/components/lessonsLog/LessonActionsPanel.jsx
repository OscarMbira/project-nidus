/**
 * Lesson Actions Panel Component
 * Actions for a lesson
 */

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { getActionsByLesson, createAction, updateAction, deleteAction } from '../../services/lessonActionService';

export default function LessonActionsPanel({ lessonId }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    action_description: '',
    assigned_to_id: null,
    assigned_to_name: '',
    target_date: ''
  });

  useEffect(() => {
    if (lessonId) {
      fetchActions();
    }
  }, [lessonId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const result = await getActionsByLesson(lessonId);
      if (result.success) {
        setActions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await createAction({
        lesson_id: lessonId,
        ...formData
      });
      if (result.success) {
        setShowForm(false);
        setFormData({ action_description: '', assigned_to_id: null, assigned_to_name: '', target_date: '' });
        fetchActions();
      }
    } catch (error) {
      console.error('Error creating action:', error);
      alert('Error creating action: ' + error.message);
    }
  };

  const handleComplete = async (actionId) => {
    try {
      const result = await updateAction(actionId, {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0]
      });
      if (result.success) {
        fetchActions();
      }
    } catch (error) {
      console.error('Error completing action:', error);
    }
  };

  const handleDelete = async (actionId) => {
    if (!confirm('Delete this action?')) return;
    try {
      const result = await deleteAction(actionId);
      if (result.success) {
        fetchActions();
      }
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Actions ({actions.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Action
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <textarea
            value={formData.action_description}
            onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
            placeholder="Action description..."
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            value={formData.assigned_to_name}
            onChange={(e) => setFormData({ ...formData, assigned_to_name: e.target.value })}
            placeholder="Assigned to (name)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
          <input
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {actions.map((action) => (
          <div key={action.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(action.status)}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{action.action_description}</p>
                {action.assigned_to_name && (
                  <p className="text-xs text-gray-500 mt-1">Assigned to: {action.assigned_to_name}</p>
                )}
                {action.target_date && (
                  <p className="text-xs text-gray-500">Target: {new Date(action.target_date).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {action.status === 'pending' && (
                  <button
                    onClick={() => handleComplete(action.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Mark complete"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(action.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
