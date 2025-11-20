import { useState, useEffect } from 'react';
import { FileText, User, Clock, Filter } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function ChangeLog({ projectId, changeRequestId = null, limit = null }) {
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    fetchChangeLog();
  }, [projectId, changeRequestId, filters]);

  const fetchChangeLog = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('change_log')
        .select(`
          *,
          user:user_id(id, email, full_name),
          change_request:change_request_id(id, change_reference, change_title)
        `)
        .eq('is_deleted', false)
        .order('action_timestamp', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (changeRequestId) {
        query = query.eq('change_request_id', changeRequestId);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.date_from) {
        query = query.gte('action_timestamp', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('action_timestamp', filters.date_to + 'T23:59:59');
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogEntries(data || []);
    } catch (error) {
      console.error('Error fetching change log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'submitted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'assessed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'implemented':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {!limit && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.action_type || ''}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="submitted">Submitted</option>
              <option value="assessed">Assessed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              placeholder="From Date"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              placeholder="To Date"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={() => setFilters({ action_type: '', user_id: '', date_from: '', date_to: '' })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Change Log Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Change Log
            {logEntries.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({logEntries.length} entries)
              </span>
            )}
          </h3>
        </div>

        {logEntries.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No change log entries found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActionColor(entry.action_type)}`}>
                      <User className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getActionColor(entry.action_type)}`}>
                        {entry.action_type?.replace('-', ' ')}
                      </span>
                      {entry.change_request && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.change_request.change_reference}: {entry.change_request.change_title}
                        </span>
                      )}
                    </div>
                    {entry.action_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {entry.action_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.user?.full_name || entry.user?.email || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.action_timestamp).toLocaleString()}
                      </div>
                      {entry.previous_status && entry.new_status && (
                        <div className="text-xs">
                          <span className="text-gray-400">{entry.previous_status}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium">{entry.new_status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

