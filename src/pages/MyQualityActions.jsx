/**
 * My Quality Actions Page
 * Shows actions assigned to the current user
 */

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Flag } from 'lucide-react';
import { getMyActions } from '../services/qualityActivityActionsService';
import { supabase } from '../services/supabaseClient';

export default function MyQualityActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'completed'

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchActions();
    }
  }, [userId, filter]);

  const fetchUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single();

        if (userRecord) {
          setUserId(userRecord.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user ID:', error);
    }
  };

  const fetchActions = async () => {
    try {
      setLoading(true);
      const result = await getMyActions(userId);
      if (result.success) {
        let filtered = result.data || [];
        if (filter === 'open') {
          filtered = filtered.filter(a => a.status === 'open' || a.status === 'in_progress');
        } else if (filter === 'completed') {
          filtered = filtered.filter(a => ['completed', 'verified', 'closed'].includes(a.status));
        }
        setActions(filtered);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
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

  const isOverdue = (dueDate, status) => {
    if (!dueDate || ['completed', 'verified', 'closed'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          My Quality Actions
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Action items assigned to you from quality activities
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Actions</option>
            <option value="open">Open Actions</option>
            <option value="completed">Completed Actions</option>
          </select>
        </div>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Actions Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? "You don't have any action items assigned"
              : filter === 'open'
              ? "You don't have any open action items"
              : "You don't have any completed actions"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-6 ${
                isOverdue(action.due_date, action.status)
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}>
                      {action.priority} priority
                    </span>
                    {isOverdue(action.due_date, action.status) && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        Overdue
                      </span>
                    )}
                    {action.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {action.status === 'verified' && (
                      <Flag className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="font-medium text-lg text-gray-900 dark:text-white mb-2">
                    {action.action_description}
                  </div>
                  {action.due_date && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Due: {new Date(action.due_date).toLocaleDateString()}
                      {isOverdue(action.due_date, action.status) && (
                        <span className="ml-2 text-red-600 font-medium">
                          (Overdue by {Math.ceil((new Date() - new Date(action.due_date)) / (1000 * 60 * 60 * 24))} days)
                        </span>
                      )}
                    </div>
                  )}
                  {action.completion_notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Completion Notes:</strong> {action.completion_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
