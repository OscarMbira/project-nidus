/**
 * Benefits Review Resources Component
 * Manages resources needed for benefits review work
 */

import { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getPlanResources, addResource, updateResource, removeResource, calculateTotalResourceCost } from '../../services/benefitsReviewPlanService';
import { platformDb } from '../../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsReviewResources({ planId, onUpdate }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total_cost: 0, total_effort_hours: 0, resource_count: 0 });

  const [resourceData, setResourceData] = useState({
    resource_type: 'person',
    resource_name: '',
    resource_description: '',
    assigned_user_id: '',
    skill_required: '',
    skill_level: '',
    estimated_effort_hours: null,
    estimated_cost: null,
    cost_currency: 'USD',
    required_from_date: '',
    required_to_date: '',
    availability_confirmed: false,
    notes: '',
  });

  useEffect(() => {
    fetchResources();
    fetchUsers();
  }, [planId]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const [resourcesData, summaryData] = await Promise.all([
        getPlanResources(planId),
        calculateTotalResourceCost(planId),
      ]);
      setResources(resourcesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching resources:', error);
      alert('Error loading resources: ' + error.message);
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

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceData.resource_name) {
      alert('Please enter a resource name');
      return;
    }

    setSaving(true);
    try {
      await addResource(planId, resourceData);
      setShowAddForm(false);
      resetForm();
      fetchResources();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('Error adding resource: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateResource(showEditForm.id, resourceData);
      setShowEditForm(null);
      resetForm();
      fetchResources();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('Error updating resource: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveResource = async (resourceId) => {
    if (!window.confirm('Remove this resource?')) {
      return;
    }

    try {
      await removeResource(resourceId);
      fetchResources();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing resource:', error);
      alert('Error removing resource: ' + error.message);
    }
  };

  const handleEdit = (resource) => {
    setShowEditForm(resource);
    setResourceData({
      resource_type: resource.resource_type,
      resource_name: resource.resource_name,
      resource_description: resource.resource_description || '',
      assigned_user_id: resource.assigned_user_id || '',
      skill_required: resource.skill_required || '',
      skill_level: resource.skill_level || '',
      estimated_effort_hours: resource.estimated_effort_hours || null,
      estimated_cost: resource.estimated_cost || null,
      cost_currency: resource.cost_currency || 'USD',
      required_from_date: resource.required_from_date || '',
      required_to_date: resource.required_to_date || '',
      availability_confirmed: resource.availability_confirmed || false,
      notes: resource.notes || '',
    });
  };

  const resetForm = () => {
    setResourceData({
      resource_type: 'person',
      resource_name: '',
      resource_description: '',
      assigned_user_id: '',
      skill_required: '',
      skill_level: '',
      estimated_effort_hours: null,
      estimated_cost: null,
      cost_currency: 'USD',
      required_from_date: '',
      required_to_date: '',
      availability_confirmed: false,
      notes: '',
    });
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getResourceTypeColor = (type) => {
    const colors = {
      person: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      skill: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      tool: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      system: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      budget: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const renderResourceForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleUpdateResource : handleAddResource} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource Type *
          </label>
          <select
            value={resourceData.resource_type}
            onChange={(e) => setResourceData({ ...resourceData, resource_type: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="person">Person</option>
            <option value="skill">Skill</option>
            <option value="tool">Tool</option>
            <option value="system">System</option>
            <option value="budget">Budget</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource Name *
          </label>
          <input
            type="text"
            value={resourceData.resource_name}
            onChange={(e) => setResourceData({ ...resourceData, resource_name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Business Analyst, Data Analysis Tool"
          />
        </div>

        {resourceData.resource_type === 'person' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned User
              </label>
              <select
                value={resourceData.assigned_user_id}
                onChange={(e) => setResourceData({ ...resourceData, assigned_user_id: e.target.value })}
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

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={resourceData.availability_confirmed}
                onChange={(e) => setResourceData({ ...resourceData, availability_confirmed: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Availability Confirmed
              </label>
            </div>
          </>
        )}

        {(resourceData.resource_type === 'skill' || resourceData.resource_type === 'person') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skill Required
              </label>
              <input
                type="text"
                value={resourceData.skill_required}
                onChange={(e) => setResourceData({ ...resourceData, skill_required: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Data Analysis, Project Management"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skill Level
              </label>
              <select
                value={resourceData.skill_level}
                onChange={(e) => setResourceData({ ...resourceData, skill_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select level...</option>
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estimated Effort (Hours)
          </label>
          <input
            type="number"
            value={resourceData.estimated_effort_hours || ''}
            onChange={(e) => setResourceData({ ...resourceData, estimated_effort_hours: e.target.value ? parseFloat(e.target.value) : null })}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estimated Cost
          </label>
          <input
            type="number"
            value={resourceData.estimated_cost || ''}
            onChange={(e) => setResourceData({ ...resourceData, estimated_cost: e.target.value ? parseFloat(e.target.value) : null })}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Currency
          </label>
          <select
            value={resourceData.cost_currency}
            onChange={(e) => setResourceData({ ...resourceData, cost_currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required From Date
          </label>
          <input
            type="date"
            value={resourceData.required_from_date}
            onChange={(e) => setResourceData({ ...resourceData, required_from_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required To Date
          </label>
          <input
            type="date"
            value={resourceData.required_to_date}
            onChange={(e) => setResourceData({ ...resourceData, required_to_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resource Description
        </label>
        <textarea
          value={resourceData.resource_description}
          onChange={(e) => setResourceData({ ...resourceData, resource_description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe the resource and its purpose..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={resourceData.notes}
          onChange={(e) => setResourceData({ ...resourceData, notes: e.target.value })}
          rows={2}
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
          {saving ? 'Saving...' : isEdit ? 'Update Resource' : 'Add Resource'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            6. Resources
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
          Add Resource
        </button>
      </div>

      {/* Summary */}
      {summary.resource_count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Resources</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.resource_count}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Effort</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
              <Clock className="h-5 w-5" />
              {summary.total_effort_hours.toFixed(1)} hrs
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
              {summary.total_cost.toLocaleString()} USD
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || showEditForm) && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {showEditForm ? 'Edit Resource' : 'Add Resource'}
          </h4>
          {renderResourceForm(!!showEditForm)}
        </div>
      )}

      {/* Resources List */}
      <div className="space-y-4">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No resources added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Resource
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Assigned/Skill
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Effort
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cost
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Availability
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource, index) => (
                  <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {resource.resource_name}
                      </div>
                      {resource.resource_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {resource.resource_description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getResourceTypeColor(resource.resource_type)}`}>
                        {resource.resource_type}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {resource.assigned?.full_name || resource.assigned?.email || resource.skill_required || '-'}
                      {resource.skill_level && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Level: {resource.skill_level}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {resource.estimated_effort_hours ? `${resource.estimated_effort_hours} hrs` : '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {resource.estimated_cost ? `${resource.cost_currency} ${parseFloat(resource.estimated_cost).toLocaleString()}` : '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      {resource.availability_confirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="h-3 w-3" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          <XCircle className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveResource(resource.id)}
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
