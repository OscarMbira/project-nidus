/**
 * Quality Activity Records Component
 * Manages quality records (test plans, checklists, evidence, reports) for activities
 */

import { useState, useEffect } from 'react';
import { FileText, Plus, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/qualityActivityRecordsService';

export default function QualityActivityRecords({ activityType, activityId, onUpdate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    record_type: 'test_plan',
    record_title: '',
    record_reference: '',
    record_description: '',
    record_url: '',
    is_mandatory: false
  });

  useEffect(() => {
    fetchRecords();
  }, [activityType, activityId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const result = await getRecords(activityType, activityId);
      if (result.success) {
        setRecords(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.record_title) {
      alert('Please enter a record title');
      return;
    }

    try {
      const result = await addRecord(activityType, activityId, newRecord);
      if (result.success) {
        setNewRecord({
          record_type: 'test_plan',
          record_title: '',
          record_reference: '',
          record_description: '',
          record_url: '',
          is_mandatory: false
        });
        setShowAddForm(false);
        fetchRecords();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record: ' + error.message);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const result = await deleteRecord(recordId);
      if (result.success) {
        fetchRecords();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record: ' + error.message);
    }
  };

  const getRecordTypeDisplay = (type) => {
    const typeMap = {
      'test_plan': 'Test Plan',
      'action_list': 'Action List',
      'evidence': 'Evidence',
      'report': 'Report',
      'checklist': 'Checklist',
      'meeting_minutes': 'Meeting Minutes',
      'review_checklist': 'Review Checklist'
    };
    return typeMap[type] || type;
  };

  const getRecordTypeColor = (type) => {
    const colorMap = {
      'test_plan': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'action_list': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'evidence': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'report': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'checklist': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'meeting_minutes': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quality Records
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Record Type *
              </label>
              <select
                value={newRecord.record_type}
                onChange={(e) => setNewRecord({ ...newRecord, record_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="test_plan">Test Plan</option>
                <option value="action_list">Action List</option>
                <option value="evidence">Evidence</option>
                <option value="report">Report</option>
                <option value="checklist">Checklist</option>
                <option value="review_checklist">Review Checklist</option>
                <option value="meeting_minutes">Meeting Minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Record Reference
              </label>
              <input
                type="text"
                value={newRecord.record_reference}
                onChange={(e) => setNewRecord({ ...newRecord, record_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., TP-001"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Record Title *
              </label>
              <input
                type="text"
                value={newRecord.record_title}
                onChange={(e) => setNewRecord({ ...newRecord, record_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter record title..."
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newRecord.record_description}
                onChange={(e) => setNewRecord({ ...newRecord, record_description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the record..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Record URL/Link
              </label>
              <input
                type="url"
                value={newRecord.record_url}
                onChange={(e) => setNewRecord({ ...newRecord, record_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newRecord.is_mandatory}
                onChange={(e) => setNewRecord({ ...newRecord, is_mandatory: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mandatory Record
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewRecord({
                  record_type: 'test_plan',
                  record_title: '',
                  record_reference: '',
                  record_description: '',
                  record_url: '',
                  is_mandatory: false
                });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRecord}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Record
            </button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No quality records linked yet
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(record.record_type)}`}>
                    {getRecordTypeDisplay(record.record_type)}
                  </span>
                  {record.is_mandatory && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded">
                      Mandatory
                    </span>
                  )}
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {record.record_title}
                </div>
                {record.record_reference && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Ref: {record.record_reference}
                  </div>
                )}
                {record.record_description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {record.record_description}
                  </div>
                )}
                {record.record_url && (
                  <a
                    href={record.record_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Link
                  </a>
                )}
              </div>
              <button
                onClick={() => handleDeleteRecord(record.id)}
                className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400"
                title="Delete"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
