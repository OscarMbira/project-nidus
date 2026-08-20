/**
 * Daily Log View Page
 * Main page for viewing and managing daily log entries
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { BookOpen, Plus, Search, Filter, Calendar, List, Clock, AlertCircle, CheckCircle, Download, Grid, History } from 'lucide-react';
import { getDailyLogByProject, getSummary } from '../services/dailyLogService';
import { getEntries, addEntry, updateEntry, deleteEntry, completeEntry } from '../services/dailyLogEntryService';
import { getOverdueEntries } from '../services/dailyLogEntryService';
import DailyLogCalendarView from '../components/dailyLog/DailyLogCalendarView';
import DailyLogTimelineView from '../components/dailyLog/DailyLogTimelineView';
import DailyLogExport from '../components/dailyLog/DailyLogExport';
import VisibilitySettings from '../components/dailyLog/VisibilitySettings';
import TagInput from '../components/dailyLog/TagInput';
import PersonResponsibleSelector from '../components/dailyLog/PersonResponsibleSelector';
import { validateEntry, getEntryCompleteness, needsImmediateAttention, isEntryOverdue } from '@nidus/shared/utils/dailyLogValidation';
import ExportListMenu from '@nidus/ui/ExportListMenu';
import { RowActionButton } from '@nidus/ui';

const DAILY_LOG_COLUMNS = [
  { key: 'entry_number', label: 'Entry #' },
  { key: 'entry_date', label: 'Date' },
  { key: 'entry_type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'target_date', label: 'Target Date' }
];

export default function DailyLogView() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [log, setLog] = useState(null);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'timeline'
  const [showExport, setShowExport] = useState(false);
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    entry_type: '',
    search: ''
  });
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'comment',
    description: '',
    person_responsible_id: null,
    person_responsible_name: null,
    target_date: '',
    priority: '',
    tags: [],
    is_private: false
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  useEffect(() => {
    if (log && log.id) {
      fetchEntries();
    }
  }, [log, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logResult, summaryResult, overdueResult] = await Promise.all([
        getDailyLogByProject(projectId),
        getSummary(projectId),
        getOverdueEntries(projectId)
      ]);

      if (logResult.success) {
        setLog(logResult.data);
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      if (overdueResult.success) {
        setOverdue(overdueResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching daily log data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    if (!log || !log.id) return;
    
    try {
      const entriesResult = await getEntries(log.id, filters);
      if (entriesResult.success) {
        setEntries(entriesResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || formData.description.length < 20) {
      alert('Description must be at least 20 characters');
      return;
    }

    if (!log) {
      alert('Daily log not found');
      return;
    }

    try {
      // Prepare entry data
      const entryData = {
        ...formData,
        person_responsible_id: formData.person_responsible_id || null,
        person_responsible_name: formData.person_responsible_name || null,
        target_date: formData.target_date || null,
        priority: formData.priority || null,
        tags: formData.tags || []
      };

      const result = await addEntry(log.id, entryData);
      if (result.success) {
        setShowForm(false);
        setFormData({
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'comment',
          description: '',
          person_responsible_id: null,
          person_responsible_name: null,
          target_date: '',
          priority: '',
          tags: [],
          is_private: false
        });
        setValidationErrors({});
        setValidationWarnings({});
        fetchEntries();
      } else {
        alert('Error adding entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry: ' + error.message);
    }
  };

  const handleCompleteEntry = async (entryId) => {
    const results = prompt('Enter results/outcome:');
    if (!results) return;

    try {
      const result = await completeEntry(entryId, results);
      if (result.success) {
        fetchEntries();
      } else {
        alert('Error completing entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing entry:', error);
      alert('Error completing entry: ' + error.message);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const result = await deleteEntry(entryId);
      if (result.success) {
        fetchEntries();
      } else {
        alert('Error deleting entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry: ' + error.message);
    }
  };

  const getEntryTypeColor = (type) => {
    const colors = {
      problem: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      action: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
      event: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      comment: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      observation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
      decision: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
      other: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
    };
    return colors[status] || colors.open;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-900 dark:text-gray-100">Loading daily log...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              Daily Log
            </h1>
            {log && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Reference: {log.log_reference} | Project: {log.projects?.project_name || 'Unknown'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm text-gray-700 dark:text-gray-200 ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded text-sm text-gray-700 dark:text-gray-200 ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="Calendar View"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm text-gray-700 dark:text-gray-200 ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="Timeline View"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
            <ExportListMenu columns={DAILY_LOG_COLUMNS} data={entries} baseFilename="DailyLog" disabled={!entries?.length} />
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {log && (
              <button
                onClick={() => setShowVisibilitySettings(!showVisibilitySettings)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Visibility Settings"
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Export Panel */}
      {showExport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-transparent dark:border-gray-700">
          <DailyLogExport projectId={projectId} filters={filters} />
        </div>
      )}

      {/* Visibility Settings Panel */}
      {showVisibilitySettings && log && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-transparent dark:border-gray-700">
          <VisibilitySettings
            logId={log.id}
            currentVisibility={log.visibility}
            onUpdate={(newVisibility) => {
              setLog({ ...log, visibility: newVisibility });
              setShowVisibilitySettings(false);
            }}
          />
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-transparent dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Entries</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.total_entries || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-transparent dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.open_entries || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-transparent dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.completed_entries || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-transparent dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.overdue_entries || 0}</div>
          </div>
        </div>
      )}

      {/* Overdue Warning */}
      {overdue.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{overdue.length} overdue entries</span>
          </div>
        </div>
      )}

      {/* Quick Add Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-transparent dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Entry</h2>
          <form onSubmit={handleAddEntry}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={formData.entry_type}
                  onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="problem">Problem</option>
                  <option value="action">Action</option>
                  <option value="event">Event</option>
                  <option value="comment">Comment</option>
                  <option value="observation">Observation</option>
                  <option value="decision">Decision</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    // Clear validation error when user types
                    if (validationErrors.description) {
                      setValidationErrors({ ...validationErrors, description: null });
                    }
                    // Re-validate for warnings
                    if (e.target.value.trim().length >= 20 && validationWarnings.description) {
                      setValidationWarnings({ ...validationWarnings, description: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
                    validationErrors.description 
                      ? 'border-red-500' 
                      : validationWarnings.description 
                        ? 'border-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600'
                  }`}
                  rows={4}
                  placeholder="Describe the problem, action, event, or comment (minimum 20 characters)"
                  required
                />
                <div className="mt-1">
                  <p className={`text-xs ${formData.description.length < 20 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formData.description.length} characters {formData.description.length < 20 && '(minimum 20 required)'}
                  </p>
                  {validationErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.description}</p>
                  )}
                  {validationWarnings.description && !validationErrors.description && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{validationWarnings.description}</p>
                  )}
                </div>
              </div>
              <div>
                <PersonResponsibleSelector
                  projectId={projectId}
                  value={{ person_responsible_id: formData.person_responsible_id, person_responsible_name: formData.person_responsible_name }}
                  onChange={(value) => setFormData({ ...formData, person_responsible_id: value.person_responsible_id, person_responsible_name: value.person_responsible_name })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => {
                      setFormData({ ...formData, target_date: e.target.value });
                      if (validationWarnings.target_date) {
                        setValidationWarnings({ ...validationWarnings, target_date: null });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
                      validationWarnings.target_date ? 'border-yellow-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationWarnings.target_date && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{validationWarnings.target_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <TagInput
                  tags={formData.tags || []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Entry
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 border border-transparent dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search entries..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-transparent dark:border-gray-700">
            No entries found. Add your first entry to get started.
          </div>
        ) : (
          entries.map((entry) => {
            const entryOverdue = isEntryOverdue(entry);
            const completeness = getEntryCompleteness(entry);
            const needsAttention = needsImmediateAttention(entry);
            
            return (
            <div 
              key={entry.id} 
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 ${needsAttention ? 'border-l-4 border-red-500 dark:border-l-red-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">#{entry.entry_number}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getEntryTypeColor(entry.entry_type)}`}>
                    {entry.entry_type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                  {entry.priority && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      entry.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                      entry.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {entry.priority}
                    </span>
                  )}
                  {entryOverdue.overdue && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {entryOverdue.daysOverdue} day{entryOverdue.daysOverdue > 1 ? 's' : ''} overdue
                    </span>
                  )}
                  {needsAttention && !entryOverdue.overdue && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                      Needs Attention
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(entry.entry_date).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{entry.description}</p>
              
              {/* Validation Warnings */}
              {completeness.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Warnings:</div>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                        {completeness.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                {entry.person_responsible_id || entry.person_responsible_name ? (
                  <span>👤 {entry.person_responsible?.full_name || entry.person_responsible_name}</span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No person assigned
                  </span>
                )}
                {entry.target_date ? (
                  <span className={`flex items-center gap-1 ${entryOverdue.overdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                    <Clock className="w-4 h-4" />
                    {new Date(entry.target_date).toLocaleDateString()}
                    {entryOverdue.overdue && (
                      <span className="text-red-600 dark:text-red-400 ml-1">({entryOverdue.daysOverdue} day{entryOverdue.daysOverdue > 1 ? 's' : ''} overdue)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No target date
                  </span>
                )}
              </div>
              {entry.results && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-3 mb-4">
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Results:</div>
                  <div className="text-sm text-green-700 dark:text-green-300">{entry.results}</div>
                </div>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {entry.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Completion Indicator */}
              {!completeness.complete && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 mb-4">
                  <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">Missing Information:</div>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside">
                    {completeness.missing.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2">
                {entry.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteEntry(entry.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Complete
                  </button>
                )}
                <button
                  onClick={() =>
                    navigate(
                      platformProjectPath(routeKey || projectId, 'daily-log', 'entry', entry.entry_code || entry.id),
                    )
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  View Details
                </button>
                <RowActionButton
                  variant="delete"
                  label="Delete entry"
                  onClick={() => handleDeleteEntry(entry.id)}
                />
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
