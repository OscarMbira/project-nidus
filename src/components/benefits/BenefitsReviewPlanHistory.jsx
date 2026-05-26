/**
 * Benefits Review Plan History Component
 * Manages revision history for Benefits Review Plans
 */

import { useState, useEffect } from 'react';
import { History, Plus, Clock, User, FileText } from 'lucide-react';
import { getRevisionHistory, addRevision } from '../../services/benefitsReviewPlanService';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsReviewPlanHistory({ planId, onUpdate }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newRevision, setNewRevision] = useState({
    revision_date: new Date().toISOString().split('T')[0],
    revision_number: '',
    summary_of_changes: '',
    changes_marked: false,
  });

  useEffect(() => {
    fetchRevisions();
  }, [planId]);

  const fetchRevisions = async () => {
    try {
      setLoading(true);
      const data = await getRevisionHistory(planId);
      setRevisions(data);
    } catch (error) {
      console.error('Error fetching revision history:', error);
      alert('Error loading revision history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevision = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addRevision(planId, newRevision);
      setShowAddForm(false);
      setNewRevision({
        revision_date: new Date().toISOString().split('T')[0],
        revision_number: '',
        summary_of_changes: '',
        changes_marked: false,
      });
      fetchRevisions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding revision:', error);
      alert('Error adding revision: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            1. Benefits Review Plan History
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Revision
        </button>
      </div>

      {/* Add Revision Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleAddRevision} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Revision Date *
                </label>
                <input
                  type="date"
                  value={newRevision.revision_date}
                  onChange={(e) => setNewRevision({ ...newRevision, revision_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Revision Number *
                </label>
                <input
                  type="text"
                  value={newRevision.revision_number}
                  onChange={(e) => setNewRevision({ ...newRevision, revision_number: e.target.value })}
                  required
                  placeholder="e.g., 1.1, 1.2, 2.0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Summary of Changes *
              </label>
              <textarea
                value={newRevision.summary_of_changes}
                onChange={(e) => setNewRevision({ ...newRevision, summary_of_changes: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe what changed in this revision..."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={newRevision.changes_marked}
                onChange={(e) => setNewRevision({ ...newRevision, changes_marked: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Changes marked in document
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Revision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revision History List */}
      <div className="space-y-4">
        {revisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No revision history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Revision
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Revised By
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Summary of Changes
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Changes Marked
                  </th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision, index) => (
                  <tr key={revision.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {revision.revision_number}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(revision.revision_date)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {revision.revised_by?.full_name || revision.revised_by?.email || 'N/A'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {revision.summary_of_changes || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      {revision.changes_marked ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
