/**
 * Benefits Coverage Section Component
 * Manages which benefits are included in the review plan scope
 */

import { useState, useEffect } from 'react';
import { Target, Plus, AlertTriangle, CheckCircle, XCircle, Edit2, Trash2, Calendar, User } from 'lucide-react';
import { getPlanBenefits, addBenefitToPlan, updateBenefitCoverage, removeBenefitFromPlan, getUnmappedBenefits } from '../../services/benefitsReviewPlanService';
import { platformDb } from '../../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsCoverageSection({ planId, projectId, onUpdate }) {
  const [coverage, setCoverage] = useState([]);
  const [unmappedBenefits, setUnmappedBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);

  const [coverageData, setCoverageData] = useState({
    benefit_id: '',
    included_in_scope: true,
    exclusion_reason: '',
    measurement_start_date: '',
    measurement_end_date: '',
    measurement_frequency: '',
    measurement_timing_reason: '',
    accountable_user_id: '',
    accountability_notes: '',
    next_review_date: '',
    priority: 'medium',
    notes: '',
  });

  useEffect(() => {
    fetchCoverage();
    fetchUsers();
  }, [planId, projectId]);

  const fetchCoverage = async () => {
    try {
      setLoading(true);
      const [coverageData, unmappedData] = await Promise.all([
        getPlanBenefits(planId),
        projectId ? getUnmappedBenefits(projectId, planId) : Promise.resolve([]),
      ]);
      setCoverage(coverageData);
      setUnmappedBenefits(unmappedData);
    } catch (error) {
      console.error('Error fetching benefits coverage:', error);
      alert('Error loading benefits coverage: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await platformDb
        .from('users')
        .select('id, email, full_name')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddBenefit = async () => {
    if (!coverageData.benefit_id) {
      alert('Please select a benefit');
      return;
    }

    setSaving(true);
    try {
      await addBenefitToPlan(planId, coverageData.benefit_id, coverageData);
      setShowAddDialog(false);
      setCoverageData({
        benefit_id: '',
        included_in_scope: true,
        exclusion_reason: '',
        measurement_start_date: '',
        measurement_end_date: '',
        measurement_frequency: '',
        measurement_timing_reason: '',
        accountable_user_id: '',
        accountability_notes: '',
        next_review_date: '',
        priority: 'medium',
        notes: '',
      });
      fetchCoverage();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding benefit:', error);
      alert('Error adding benefit: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCoverage = async () => {
    setSaving(true);
    try {
      await updateBenefitCoverage(showEditDialog.id, coverageData);
      setShowEditDialog(null);
      fetchCoverage();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating coverage:', error);
      alert('Error updating coverage: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBenefit = async (coverageId) => {
    if (!window.confirm('Remove this benefit from the review plan scope?')) {
      return;
    }

    try {
      await removeBenefitFromPlan(coverageId);
      fetchCoverage();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing benefit:', error);
      alert('Error removing benefit: ' + error.message);
    }
  };

  const handleEdit = (item) => {
    setShowEditDialog(item);
    setCoverageData({
      included_in_scope: item.included_in_scope,
      exclusion_reason: item.exclusion_reason || '',
      measurement_start_date: item.measurement_start_date || '',
      measurement_end_date: item.measurement_end_date || '',
      measurement_frequency: item.measurement_frequency || '',
      measurement_timing_reason: item.measurement_timing_reason || '',
      accountable_user_id: item.accountable_user_id || '',
      accountability_notes: item.accountability_notes || '',
      next_review_date: item.next_review_date || '',
      priority: item.priority || 'medium',
      notes: item.notes || '',
    });
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    return colors[priority] || colors.medium;
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
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            3. Scope - Benefits Coverage
          </h3>
        </div>
        {unmappedBenefits.length > 0 && (
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{unmappedBenefits.length} benefit{unmappedBenefits.length !== 1 ? 's' : ''} not covered</span>
          </div>
        )}
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Benefit
        </button>
      </div>

      {/* Add Benefit Dialog */}
      {showAddDialog && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Benefit to Review Plan</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Benefit *
              </label>
              <select
                value={coverageData.benefit_id}
                onChange={(e) => setCoverageData({ ...coverageData, benefit_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select benefit...</option>
                {unmappedBenefits.map(benefit => (
                  <option key={benefit.id} value={benefit.id}>
                    {benefit.benefit_code} - {benefit.benefit_name}
                  </option>
                ))}
                {unmappedBenefits.length === 0 && (
                  <option disabled>No unmapped benefits available</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Frequency
                </label>
                <select
                  value={coverageData.measurement_frequency}
                  onChange={(e) => setCoverageData({ ...coverageData, measurement_frequency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select frequency...</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="once">Once</option>
                  <option value="on_demand">On Demand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={coverageData.priority}
                  onChange={(e) => setCoverageData({ ...coverageData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Accountable Person
                </label>
                <select
                  value={coverageData.accountable_user_id}
                  onChange={(e) => setCoverageData({ ...coverageData, accountable_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Review Date
                </label>
                <input
                  type="date"
                  value={coverageData.next_review_date}
                  onChange={(e) => setCoverageData({ ...coverageData, next_review_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement Timing Reason
              </label>
              <textarea
                value={coverageData.measurement_timing_reason}
                onChange={(e) => setCoverageData({ ...coverageData, measurement_timing_reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Why this timing for measurement..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBenefit}
                disabled={saving || !coverageData.benefit_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coverage Dialog */}
      {showEditDialog && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Edit Coverage: {showEditDialog.benefit?.benefit_name}
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Frequency
                </label>
                <select
                  value={coverageData.measurement_frequency}
                  onChange={(e) => setCoverageData({ ...coverageData, measurement_frequency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select frequency...</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="once">Once</option>
                  <option value="on_demand">On Demand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={coverageData.priority}
                  onChange={(e) => setCoverageData({ ...coverageData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Accountable Person
                </label>
                <select
                  value={coverageData.accountable_user_id}
                  onChange={(e) => setCoverageData({ ...coverageData, accountable_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Review Date
                </label>
                <input
                  type="date"
                  value={coverageData.next_review_date}
                  onChange={(e) => setCoverageData({ ...coverageData, next_review_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement Timing Reason
              </label>
              <textarea
                value={coverageData.measurement_timing_reason}
                onChange={(e) => setCoverageData({ ...coverageData, measurement_timing_reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditDialog(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCoverage}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Coverage List */}
      <div className="space-y-4">
        {coverage.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No benefits added to review plan scope</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Benefit
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Category
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Frequency
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Accountable
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Next Review
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Priority
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.benefit?.benefit_code || 'N/A'} - {item.benefit?.benefit_name || 'N/A'}
                      </div>
                      {item.benefit?.benefit_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.benefit.benefit_description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {item.benefit?.benefit_category || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {item.measurement_frequency || 'Not set'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.accountable?.full_name || item.accountable?.email || 'Not assigned'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(item.next_review_date)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveBenefit(item.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
