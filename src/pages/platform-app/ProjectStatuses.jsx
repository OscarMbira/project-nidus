/**
 * Project Statuses Management Page
 * CRUD operations for project_statuses lookup table
 * Route: /platform/pmo-admin/project-statuses
 * 
 * Optimized with:
 * - useCallback for event handlers and async functions
 * - useMemo for computed values
 * - memo for child components to prevent unnecessary re-renders
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProjectStatuses, createProjectStatus, updateProjectStatus, deleteProjectStatus } from '../../services/projectStatusService';

// Memoized table row component to prevent unnecessary re-renders
const StatusTableRow = memo(function StatusTableRow({ status, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-gray-750">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-mono text-gray-300">{status.status_code}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {status.status_color && (
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: status.status_color }}
            ></div>
          )}
          <span className="text-sm text-gray-100">{status.status_name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-400">{status.status_order ?? '—'}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {status.is_initial_status && (
            <span className="px-2 py-1 text-xs rounded bg-blue-900/30 text-blue-300">Initial</span>
          )}
          {status.is_final_status && (
            <span className="px-2 py-1 text-xs rounded bg-purple-900/30 text-purple-300">Final</span>
          )}
          {!status.is_initial_status && !status.is_final_status && (
            <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-400">Regular</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 text-xs rounded ${
            status.is_active
              ? 'bg-green-900/30 text-green-300'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {status.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(status)}
            className="text-blue-400 hover:text-blue-300"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(status)}
            className="text-red-400 hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function ProjectStatuses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status_code: '',
    status_name: '',
    status_description: '',
    status_color: '#3B82F6',
    status_icon: '',
    status_order: null,
    is_initial_status: false,
    is_final_status: false,
    is_active_status: true,
    is_active: true
  });

  // Default form data constant to avoid recreating on each render
  const defaultFormData = useMemo(() => ({
    status_code: '',
    status_name: '',
    status_description: '',
    status_color: '#3B82F6',
    status_icon: '',
    status_order: null,
    is_initial_status: false,
    is_final_status: false,
    is_active_status: true,
    is_active: true
  }), []);

  // Memoize loadProjectStatuses to prevent recreation on every render
  const loadProjectStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getProjectStatuses({ active: undefined }); // Get all, including inactive
      if (result.success) {
        setProjectStatuses(result.data || []);
      } else {
        toast.error('Failed to load project statuses');
      }
    } catch (error) {
      console.error('Error loading project statuses:', error);
      toast.error('Error loading project statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectStatuses();
  }, [loadProjectStatuses]);

  // Memoize handleAdd to prevent recreation
  const handleAdd = useCallback(() => {
    setEditingStatus(null);
    setFormData(defaultFormData);
    setShowForm(true);
  }, [defaultFormData]);

  // Memoize handleEdit to prevent recreation
  const handleEdit = useCallback((status) => {
    setEditingStatus(status);
    setFormData({
      status_code: status.status_code || '',
      status_name: status.status_name || '',
      status_description: status.status_description || '',
      status_color: status.status_color || '#3B82F6',
      status_icon: status.status_icon || '',
      status_order: status.status_order || null,
      is_initial_status: status.is_initial_status || false,
      is_final_status: status.is_final_status || false,
      is_active_status: status.is_active_status !== undefined ? status.is_active_status : true,
      is_active: status.is_active !== undefined ? status.is_active : true
    });
    setShowForm(true);
  }, []);

  // Memoize handleDelete to prevent recreation
  const handleDelete = useCallback(async (status) => {
    if (!confirm(`Are you sure you want to delete "${status.status_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteProjectStatus(status.id);
      if (result.success) {
        toast.success('Project status deleted successfully');
        loadProjectStatuses();
      } else {
        toast.error(result.error || 'Failed to delete project status');
      }
    } catch (error) {
      console.error('Error deleting project status:', error);
      toast.error('Error deleting project status');
    }
  }, [loadProjectStatuses]);

  // Memoize handleSubmit to prevent recreation
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let result;
      if (editingStatus) {
        result = await updateProjectStatus(editingStatus.id, formData);
      } else {
        result = await createProjectStatus(formData);
      }

      if (result.success) {
        toast.success(`Project status ${editingStatus ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingStatus(null);
        loadProjectStatuses();
      } else {
        toast.error(result.error || `Failed to ${editingStatus ? 'update' : 'create'} project status`);
      }
    } catch (error) {
      console.error('Error saving project status:', error);
      toast.error(`Error ${editingStatus ? 'updating' : 'creating'} project status`);
    } finally {
      setSaving(false);
    }
  }, [editingStatus, formData, loadProjectStatuses]);

  // Memoize handleCancel to prevent recreation
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingStatus(null);
    setFormData(defaultFormData);
  }, [defaultFormData]);

  // Optimized form change handler using useCallback
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Memoize sorted statuses to avoid recalculation on every render
  const sortedStatuses = useMemo(() => {
    return [...projectStatuses].sort((a, b) => {
      // Sort by order first (nulls last), then by name
      if (a.status_order !== null && b.status_order !== null) {
        return a.status_order - b.status_order;
      }
      if (a.status_order !== null) return -1;
      if (b.status_order !== null) return 1;
      return a.status_name.localeCompare(b.status_name);
    });
  }, [projectStatuses]);

  // Memoize header content
  const headerContent = useMemo(() => (
    <div className="mb-8">
      <button
        onClick={() => navigate('/platform/pmo-admin')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to PMO Admin
      </button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Project Statuses</h1>
          <p className="mt-2 text-gray-400">Manage project status definitions (Initial Status)</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Project Status
        </button>
      </div>
    </div>
  ), [navigate, handleAdd]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading project statuses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {headerContent}

        {/* Form */}
        {showForm && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              {editingStatus ? 'Edit Project Status' : 'Add Project Status'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status Code *
                  </label>
                  <input
                    type="text"
                    value={formData.status_code}
                    onChange={(e) => handleFormChange('status_code', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., PLANNED, IN_PROGRESS, COMPLETED"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status Name *
                  </label>
                  <input
                    type="text"
                    value={formData.status_name}
                    onChange={(e) => handleFormChange('status_name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Planned, In Progress, Completed"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.status_description}
                  onChange={(e) => handleFormChange('status_description', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Description of this project status"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.status_color}
                    onChange={(e) => handleFormChange('status_color', e.target.value)}
                    className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Icon (Icon Name)
                  </label>
                  <input
                    type="text"
                    value={formData.status_icon}
                    onChange={(e) => handleFormChange('status_icon', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., clock, check-circle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={formData.status_order || ''}
                    onChange={(e) => handleFormChange('status_order', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Display order"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_initial_status"
                    checked={formData.is_initial_status}
                    onChange={(e) => handleFormChange('is_initial_status', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_initial_status" className="text-sm text-gray-300">
                    Initial Status
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_final_status"
                    checked={formData.is_final_status}
                    onChange={(e) => handleFormChange('is_final_status', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_final_status" className="text-sm text-gray-300">
                    Final Status
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_status"
                    checked={formData.is_active_status}
                    onChange={(e) => handleFormChange('is_active_status', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active_status" className="text-sm text-gray-300">
                    Active Status
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editingStatus ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedStatuses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No project statuses found. Click "Add Project Status" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedStatuses.map((status) => (
                    <StatusTableRow
                      key={status.id}
                      status={status}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
