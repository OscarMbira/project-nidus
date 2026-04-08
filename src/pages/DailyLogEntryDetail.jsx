/**
 * Daily Log Entry Detail Page
 * Full detail view for a daily log entry with editing, comments, attachments
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2, Save, X, Trash2, AlertCircle, Clock, User, Tag, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { getEntryById, updateEntry, deleteEntry, completeEntry } from '../services/dailyLogEntryService';
import { escalateToIssue, escalateToRisk } from '../services/dailyLogEscalationService';
import EntryCommentsSection from '../components/dailyLog/EntryCommentsSection';
import EntryAttachments from '../components/dailyLog/EntryAttachments';
import ReminderSetup from '../components/dailyLog/ReminderSetup';
import TagInput from '../components/dailyLog/TagInput';
import PersonResponsibleSelector from '../components/dailyLog/PersonResponsibleSelector';
import ExportRecordButtons from '../components/ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils';

const DAILY_LOG_ENTRY_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'entry_number', label: 'Entry #' },
    { key: 'entry_date', label: 'Date' },
    { key: 'entry_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'target_date', label: 'Target Date' }
  ]},
  { title: 'Content', fields: [
    { key: 'description', label: 'Description' },
    { key: 'person_responsible_name', label: 'Person Responsible' }
  ]}
];

export default function DailyLogEntryDetail() {
  const { entryId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateType, setEscalateType] = useState(null);

  useEffect(() => {
    if (entryId) {
      fetchEntry();
    }
  }, [entryId]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const result = await getEntryById(entryId);
      if (result.success) {
        setEntry(result.data);
        setFormData({
          entry_date: result.data.entry_date,
          entry_type: result.data.entry_type,
          description: result.data.description,
          person_responsible_id: result.data.person_responsible_id || null,
          person_responsible_name: result.data.person_responsible_name || null,
          target_date: result.data.target_date || '',
          priority: result.data.priority || '',
          tags: result.data.tags || [],
          is_private: result.data.is_private || false,
          status: result.data.status
        });
      } else {
        alert('Error loading entry: ' + result.error);
        navigate(`/app/projects/${projectId}/daily-log`);
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      alert('Error loading entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate
    if (!formData.description || formData.description.length < 20) {
      setErrors({ description: 'Description must be at least 20 characters' });
      return;
    }

    try {
      setSaving(true);
      // Prepare update data
      const updateData = {
        ...formData,
        person_responsible_id: formData.person_responsible_id || null,
        person_responsible_name: formData.person_responsible_name || null,
        target_date: formData.target_date || null,
        priority: formData.priority || null,
        tags: formData.tags || []
      };
      const result = await updateEntry(entryId, updateData);
      if (result.success) {
        setEditing(false);
        setErrors({});
        fetchEntry();
      } else {
        alert('Error updating entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Error updating entry: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    const results = prompt('Enter results/outcome:');
    if (!results) return;

    try {
      const result = await completeEntry(entryId, results);
      if (result.success) {
        fetchEntry();
      } else {
        alert('Error completing entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing entry:', error);
      alert('Error completing entry: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const result = await deleteEntry(entryId);
      if (result.success) {
        navigate(`/app/projects/${projectId}/daily-log`);
      } else {
        alert('Error deleting entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry: ' + error.message);
    }
  };

  const handleEscalate = async (type) => {
    try {
      let result;
      if (type === 'issue') {
        result = await escalateToIssue(entryId);
      } else if (type === 'risk') {
        result = await escalateToRisk(entryId);
      }

      if (result && result.success) {
        setShowEscalateDialog(false);
        setEscalateType(null);
        fetchEntry();
        alert(`Entry escalated to ${type} successfully`);
      } else {
        alert('Error escalating entry: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error escalating entry:', error);
      alert('Error escalating entry: ' + error.message);
    }
  };

  const getEntryTypeColor = (type) => {
    const colors = {
      problem: 'bg-red-100 text-red-800 border-red-300',
      action: 'bg-blue-100 text-blue-800 border-blue-300',
      event: 'bg-green-100 text-green-800 border-green-300',
      comment: 'bg-gray-100 text-gray-800 border-gray-300',
      observation: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      decision: 'bg-purple-100 text-purple-800 border-purple-300',
      other: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      escalated: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || colors.open;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading entry...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">Entry not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/app/projects/${projectId}/daily-log`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Daily Log
        </button>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Entry #{entry.entry_number}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEntryTypeColor(entry.entry_type)}`}>
                {entry.entry_type}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(entry.status)}`}>
                {entry.status}
              </span>
              {entry.priority && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  {entry.priority} priority
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportWord={() => exportRecordToWord(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportExcel={() => exportRecordToExcel(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportCSV={() => exportRecordToCSV(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportXML={() => exportRecordToXML(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportJSON={() => exportRecordToJSON(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
              onExportPrint={() => exportRecordToPrint(DAILY_LOG_ENTRY_SECTIONS, entry, `DailyLogEntry_${entry.entry_number || entry.id}`)}
            />
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {entry.status !== 'completed' && (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Complete
                  </button>
                )}
                {entry.status !== 'escalated' && (
                  <button
                    onClick={() => setShowEscalateDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Escalate
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setErrors({});
                    fetchEntry();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entry Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Entry Details</h2>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.entry_type}
                    onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (errors.description) setErrors({ ...errors, description: '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={6}
                    required
                  />
                  {errors.description && (
                    <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0} characters</p>
                </div>
                <PersonResponsibleSelector
                  projectId={entry.daily_log?.project_id || projectId}
                  value={{ person_responsible_id: formData.person_responsible_id, person_responsible_name: formData.person_responsible_name }}
                  onChange={(value) => setFormData({ ...formData, person_responsible_id: value.person_responsible_id, person_responsible_name: value.person_responsible_name })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <TagInput
                    tags={formData.tags || []}
                    onChange={(tags) => setFormData({ ...formData, tags })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_private}
                      onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Private entry (PM only)</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Date</div>
                  <div className="text-gray-900">{new Date(entry.entry_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Description</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{entry.description}</div>
                </div>
                {entry.results && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="text-sm font-semibold text-green-800 mb-1">Results/Outcome</div>
                    <div className="text-sm text-green-700 whitespace-pre-wrap">{entry.results}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <EntryCommentsSection entryId={entryId} />
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <EntryAttachments entryId={entryId} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Status & Assignment</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(entry.status)}`}>
                  {entry.status}
                </div>
              </div>
              {entry.person_responsible && (
                <div>
                  <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Person Responsible
                  </div>
                  <div className="text-gray-900">
                    {entry.person_responsible.full_name || entry.person_responsible_name}
                  </div>
                </div>
              )}
              {entry.target_date && (
                <div>
                  <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Target Date
                  </div>
                  <div className="text-gray-900">
                    {new Date(entry.target_date).toLocaleDateString()}
                    {new Date(entry.target_date) < new Date() && entry.status !== 'completed' && (
                      <span className="ml-2 text-red-600 text-sm">(Overdue)</span>
                    )}
                  </div>
                </div>
              )}
              {entry.escalated_to && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Escalated To</div>
                  <div className="text-orange-600 font-medium">{entry.escalated_to}</div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Metadata</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Created</div>
                <div className="text-gray-900">
                  {new Date(entry.created_at).toLocaleDateString()} by {entry.created_by_user?.full_name || 'Unknown'}
                </div>
              </div>
              {entry.completed_at && (
                <div>
                  <div className="text-gray-500">Completed</div>
                  <div className="text-gray-900">
                    {new Date(entry.completed_at).toLocaleDateString()} by {entry.completed_by_user?.full_name || 'Unknown'}
                  </div>
                </div>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div>
                  <div className="text-gray-500 mb-2 flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reminders Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <ReminderSetup entryId={entryId} targetDate={entry.target_date} />
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Dialog */}
      {showEscalateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Escalate Entry</h3>
            <p className="text-gray-600 mb-4">Choose how to escalate this entry:</p>
            <div className="space-y-2">
              <button
                onClick={() => handleEscalate('issue')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Escalate to Issue
              </button>
              <button
                onClick={() => handleEscalate('risk')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Escalate to Risk
              </button>
              <button
                onClick={() => {
                  setShowEscalateDialog(false);
                  setEscalateType(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
