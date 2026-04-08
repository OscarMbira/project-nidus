/**
 * Dis-Benefits Section Component
 * Manages dis-benefits (negative impacts) for a review plan
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, TrendingDown, Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getDisBenefitsForPlan, saveDisBenefit, deleteDisBenefit, updateMitigationStatus } from '../../services/disBenefitsService';
import { platformDb } from '../../services/supabaseClient';

export default function DisBenefitsSection({ planId, projectId, onUpdate }) {
  const [disBenefits, setDisBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);

  const [disBenefitData, setDisBenefitData] = useState({
    dis_benefit_code: '',
    dis_benefit_name: '',
    dis_benefit_description: '',
    dis_benefit_category: '',
    impact_severity: 'medium',
    impact_probability: null,
    impact_description: '',
    measurable: false,
    measurement_unit: '',
    baseline_value: null,
    mitigation_approach: '',
    mitigation_owner_user_id: '',
    mitigation_status: 'identified',
    monitoring_frequency: '',
    next_review_date: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    fetchDisBenefits();
    fetchUsers();
  }, [planId]);

  const fetchDisBenefits = async () => {
    try {
      setLoading(true);
      const data = await getDisBenefitsForPlan(planId);
      setDisBenefits(data);
    } catch (error) {
      console.error('Error fetching dis-benefits:', error);
      alert('Error loading dis-benefits: ' + error.message);
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

  const handleSaveDisBenefit = async (e) => {
    e.preventDefault();
    if (!disBenefitData.dis_benefit_code || !disBenefitData.dis_benefit_name) {
      alert('Please enter dis-benefit code and name');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...disBenefitData,
        review_plan_id: planId,
        project_id: projectId,
        impact_probability: disBenefitData.impact_probability ? parseFloat(disBenefitData.impact_probability) : null,
        baseline_value: disBenefitData.baseline_value ? parseFloat(disBenefitData.baseline_value) : null,
      };

      await saveDisBenefit(saveData, showEditForm?.id);
      setShowAddForm(false);
      setShowEditForm(null);
      resetForm();
      fetchDisBenefits();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving dis-benefit:', error);
      alert('Error saving dis-benefit: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDisBenefit = async (disBenefitId) => {
    if (!window.confirm('Delete this dis-benefit?')) {
      return;
    }

    try {
      await deleteDisBenefit(disBenefitId);
      fetchDisBenefits();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting dis-benefit:', error);
      alert('Error deleting dis-benefit: ' + error.message);
    }
  };

  const handleUpdateMitigation = async (disBenefitId, status, notes = '') => {
    try {
      await updateMitigationStatus(disBenefitId, status, notes);
      fetchDisBenefits();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating mitigation:', error);
      alert('Error updating mitigation: ' + error.message);
    }
  };

  const handleEdit = (disBenefit) => {
    setShowEditForm(disBenefit);
    setDisBenefitData({
      dis_benefit_code: disBenefit.dis_benefit_code,
      dis_benefit_name: disBenefit.dis_benefit_name,
      dis_benefit_description: disBenefit.dis_benefit_description || '',
      dis_benefit_category: disBenefit.dis_benefit_category || '',
      impact_severity: disBenefit.impact_severity || 'medium',
      impact_probability: disBenefit.impact_probability || null,
      impact_description: disBenefit.impact_description || '',
      measurable: disBenefit.measurable || false,
      measurement_unit: disBenefit.measurement_unit || '',
      baseline_value: disBenefit.baseline_value || null,
      mitigation_approach: disBenefit.mitigation_approach || '',
      mitigation_owner_user_id: disBenefit.mitigation_owner_user_id || '',
      mitigation_status: disBenefit.mitigation_status || 'identified',
      monitoring_frequency: disBenefit.monitoring_frequency || '',
      next_review_date: disBenefit.next_review_date || '',
      status: disBenefit.status || 'active',
      notes: disBenefit.notes || '',
    });
  };

  const resetForm = () => {
    setDisBenefitData({
      dis_benefit_code: '',
      dis_benefit_name: '',
      dis_benefit_description: '',
      dis_benefit_category: '',
      impact_severity: 'medium',
      impact_probability: null,
      impact_description: '',
      measurable: false,
      measurement_unit: '',
      baseline_value: null,
      mitigation_approach: '',
      mitigation_owner_user_id: '',
      mitigation_status: 'identified',
      monitoring_frequency: '',
      next_review_date: '',
      status: 'active',
      notes: '',
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      minimal: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[severity] || colors.medium;
  };

  const getMitigationStatusColor = (status) => {
    const colors = {
      identified: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      mitigated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      accepted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[status] || colors.identified;
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
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
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Dis-benefits
          </h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setShowEditForm(null);
            resetForm();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Dis-benefit
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || showEditForm) && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {showEditForm ? 'Edit Dis-benefit' : 'Add Dis-benefit'}
          </h4>
          <form onSubmit={handleSaveDisBenefit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dis-benefit Code *
                </label>
                <input
                  type="text"
                  value={disBenefitData.dis_benefit_code}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, dis_benefit_code: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., DB-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dis-benefit Name *
                </label>
                <input
                  type="text"
                  value={disBenefitData.dis_benefit_name}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, dis_benefit_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={disBenefitData.dis_benefit_category}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, dis_benefit_category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select category...</option>
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="reputation">Reputation</option>
                  <option value="compliance">Compliance</option>
                  <option value="customer">Customer</option>
                  <option value="employee">Employee</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Impact Severity
                </label>
                <select
                  value={disBenefitData.impact_severity}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, impact_severity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Impact Probability (%)
                </label>
                <input
                  type="number"
                  value={disBenefitData.impact_probability || ''}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, impact_probability: e.target.value ? parseFloat(e.target.value) : null })}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={disBenefitData.status}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="realized">Realized</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mitigation Owner
                </label>
                <select
                  value={disBenefitData.mitigation_owner_user_id}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, mitigation_owner_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select owner...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mitigation Status
                </label>
                <select
                  value={disBenefitData.mitigation_status}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, mitigation_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="identified">Identified</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={disBenefitData.measurable}
                  onChange={(e) => setDisBenefitData({ ...disBenefitData, measurable: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Measurable
                </label>
              </div>

              {disBenefitData.measurable && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Measurement Unit
                    </label>
                    <input
                      type="text"
                      value={disBenefitData.measurement_unit}
                      onChange={(e) => setDisBenefitData({ ...disBenefitData, measurement_unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Baseline Value
                    </label>
                    <input
                      type="number"
                      value={disBenefitData.baseline_value || ''}
                      onChange={(e) => setDisBenefitData({ ...disBenefitData, baseline_value: e.target.value ? parseFloat(e.target.value) : null })}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dis-benefit Description
              </label>
              <textarea
                value={disBenefitData.dis_benefit_description}
                onChange={(e) => setDisBenefitData({ ...disBenefitData, dis_benefit_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Impact Description
              </label>
              <textarea
                value={disBenefitData.impact_description}
                onChange={(e) => setDisBenefitData({ ...disBenefitData, impact_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mitigation Approach
              </label>
              <textarea
                value={disBenefitData.mitigation_approach}
                onChange={(e) => setDisBenefitData({ ...disBenefitData, mitigation_approach: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : showEditForm ? 'Update Dis-benefit' : 'Add Dis-benefit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dis-benefits List */}
      <div className="space-y-4">
        {disBenefits.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No dis-benefits tracked</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Code
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Dis-benefit
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Category
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Severity
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Mitigation Owner
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Mitigation Status
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {disBenefits.map((disBenefit) => (
                  <tr key={disBenefit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {disBenefit.dis_benefit_code}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {disBenefit.dis_benefit_name}
                      </div>
                      {disBenefit.dis_benefit_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {disBenefit.dis_benefit_description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {disBenefit.dis_benefit_category || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(disBenefit.impact_severity)}`}>
                        {disBenefit.impact_severity}
                      </span>
                      {disBenefit.impact_probability !== null && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {disBenefit.impact_probability}%
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {disBenefit.mitigation_owner?.full_name || disBenefit.mitigation_owner?.email || 'Not assigned'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getMitigationStatusColor(disBenefit.mitigation_status)}`}>
                        {disBenefit.mitigation_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        disBenefit.status === 'active' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        disBenefit.status === 'mitigated' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {disBenefit.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(disBenefit)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDisBenefit(disBenefit.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                          title="Delete"
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
