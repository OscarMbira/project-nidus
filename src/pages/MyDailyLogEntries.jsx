/**
 * My Daily Log Entries Page
 * User's assigned entries across all projects
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, AlertCircle, Clock, User } from 'lucide-react';
import { platformDb } from '../services/supabase/supabaseClient';
import { getOverdueEntries } from '../services/dailyLogEntryService';
import EntryTypeBadge from '../components/dailyLog/EntryTypeBadge';
import EntryStatusBadge from '../components/dailyLog/EntryStatusBadge';
import OverdueIndicator from '../components/dailyLog/OverdueIndicator';

export default function MyDailyLogEntries() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    entry_type: '',
    search: ''
  });

  useEffect(() => {
    fetchMyEntries();
  }, [filters]);

  const fetchMyEntries = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (!userRecord) {
        setLoading(false);
        return;
      }

      // Get all entries where user is person responsible
      let query = platformDb
        .from('daily_log_entries')
        .select(`
          *,
          daily_log:daily_log_id(
            id,
            log_reference,
            project_id,
            projects:project_id(id, project_name, project_code)
          ),
          person_responsible:person_responsible_id(id, full_name, email),
          created_by_user:created_by(id, full_name, email)
        `)
        .eq('person_responsible_id', userRecord.id)
        .eq('is_deleted', false);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.entry_type) {
        query = query.eq('entry_type', filters.entry_type);
      }

      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%`);
      }

      query = query.order('target_date', { ascending: true, nullsLast: true })
                   .order('entry_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching my entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverdueCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return entries.filter(entry => {
      if (!entry.target_date || entry.status === 'completed' || entry.status === 'cancelled') {
        return false;
      }
      const target = new Date(entry.target_date);
      target.setHours(0, 0, 0, 0);
      return target < today;
    }).length;
  };

  const getDueThisWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return entries.filter(entry => {
      if (!entry.target_date || entry.status === 'completed' || entry.status === 'cancelled') {
        return false;
      }
      const target = new Date(entry.target_date);
      target.setHours(0, 0, 0, 0);
      return target >= today && target <= weekFromNow;
    }).length;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading your entries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          My Daily Log Entries
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Entries assigned to you across all projects
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Assigned</div>
          <div className="text-2xl font-bold">{entries.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{getOverdueCount()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Due This Week</div>
          <div className="text-2xl font-bold text-blue-600">{getDueThisWeek()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search entries..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="escalated">Escalated</option>
          </select>
          <select
            value={filters.entry_type}
            onChange={(e) => setFilters({ ...filters, entry_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            <option value="problem">Problem</option>
            <option value="action">Action</option>
            <option value="event">Event</option>
            <option value="comment">Comment</option>
            <option value="observation">Observation</option>
            <option value="decision">Decision</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No entries assigned to you.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-500">#{entry.entry_number}</span>
                  <EntryTypeBadge type={entry.entry_type} />
                  <EntryStatusBadge status={entry.status} />
                  {entry.priority && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      {entry.priority}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(entry.entry_date).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-700 mb-4">{entry.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {entry.daily_log?.projects?.project_name || 'Unknown Project'}
                </div>
                {entry.target_date && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Target: {new Date(entry.target_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              {entry.target_date && (
                <div className="mb-4">
                  <OverdueIndicator targetDate={entry.target_date} status={entry.status} />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/app/projects/${entry.daily_log?.project_id}/daily-log/entry/${entry.id}`)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/app/projects/${entry.daily_log?.project_id}/daily-log`)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  View Log
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
