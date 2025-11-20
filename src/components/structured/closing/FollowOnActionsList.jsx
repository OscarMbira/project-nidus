import { useState } from 'react';
import { ArrowRight, Edit2, Trash2, Plus, Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { deleteFollowOnAction } from '../../../services/closingProjectService';

export default function FollowOnActionsList({ actions, onEdit, onRefresh, onAdd }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this follow-on action?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteFollowOnAction(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting follow-on action:', error);
      alert('Error deleting follow-on action: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'operational-handover': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'support-required': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'benefits-measurement': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'documentation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'training': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'warranty-support': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[type] || colors.other;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
      'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      'not-started': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors['not-started'];
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return CheckCircle2;
    if (status === 'cancelled') return AlertCircle;
    return ArrowRight;
  };

  const isOverdue = (targetDate, status) => {
    if (!targetDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(targetDate) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <ArrowRight className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Follow-on Actions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Define post-project actions and handover responsibilities
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Follow-on Action
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Follow-on Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {actions.length} {actions.length === 1 ? 'action' : 'actions'} defined
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Action
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {actions.map((action) => {
          const StatusIcon = getStatusIcon(action.action_status);
          const overdueFlag = isOverdue(action.target_completion_date, action.action_status);

          return (
            <div
              key={action.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-lg ${getTypeColor(action.action_type)}`}>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {action.action_title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(action.priority)}`}>
                          {action.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(action.action_status)}`}>
                          <span className="inline-flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {action.action_status.replace('-', ' ')}
                          </span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(action.action_type)} capitalize`}>
                          {action.action_type.replace('-', ' ')}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {action.action_description}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        {action.assigned_to_user && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {action.assigned_to_user.full_name || action.assigned_to_user.email}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 ${overdueFlag ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(action.target_completion_date)}
                            {overdueFlag && ' (Overdue)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEdit(action)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Edit action"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(action.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    disabled={deleting === action.id}
                    title="Delete action"
                  >
                    {deleting === action.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
