/**
 * My Lesson Actions Page
 * User's assigned lesson actions
 */

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { getActionsByUser } from '../services/lessonActionService';
import { platformDb } from '../services/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function MyLessonActions() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'

  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (user) {
          const { data: userRecord } = await platformDb
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .eq('is_deleted', false)
            .single();
          setUserId(userRecord?.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchActions();
    }
  }, [userId, filter]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const result = await getActionsByUser(userId, filter !== 'all' ? { status: filter } : {});
      if (result.success) {
        setActions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredActions = filter === 'all' 
    ? actions 
    : actions.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Lesson Actions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Actions assigned to you from lessons learned
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'in_progress', 'completed'].map((f, index) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{actions.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {actions.filter(a => a.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {actions.filter(a => a.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {actions.filter(a => a.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Actions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No actions found</p>
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <div
                key={action.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => action.lesson?.project_id && navigate(`/app/projects/${action.lesson.project_id}/lessons/${action.lesson.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(action.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(action.status)}`}>
                        {action.status.replace('_', ' ')}
                      </span>
                      {action.lesson && (
                        <span className="text-sm text-gray-500">
                          from {action.lesson.lesson_title}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      {action.action_description}
                    </p>
                    {action.target_date && (
                      <p className="text-sm text-gray-500">
                        Target: {new Date(action.target_date).toLocaleDateString()}
                        {new Date(action.target_date) < new Date() && action.status !== 'completed' && (
                          <span className="ml-2 text-red-600">(Overdue)</span>
                        )}
                      </p>
                    )}
                    {action.completion_notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {action.completion_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
