/**
 * Project Types Management Page
 * CRUD operations for project_types lookup table
 * Route: /platform/pmo-admin/project-types
 * 
 * Optimized with:
 * - useCallback for event handlers and async functions
 * - useMemo for computed values
 * - memo for child components to prevent unnecessary re-renders
 */

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProjectTypes, createProjectType, updateProjectType, deleteProjectType } from '../../services/projectTypeService';

// Memoized table row component to prevent unnecessary re-renders
const TypeTableRow = memo(function TypeTableRow({ type, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-gray-750">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-mono text-gray-300">{type.type_code}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {type.type_color && (
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: type.type_color }}
            ></div>
          )}
          <span className="text-sm text-gray-100">{type.type_name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-400">{type.type_category || '—'}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 text-xs rounded ${
            type.is_active
              ? 'bg-green-900/30 text-green-300'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {type.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(type)}
            className="text-blue-400 hover:text-blue-300"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(type)}
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

export default function ProjectTypes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectTypes, setProjectTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);
  // Default form data constant to avoid recreating on each render
  const defaultFormData = useMemo(() => ({
    type_code: '',
    type_name: '',
    type_description: '',
    type_color: '#3B82F6',
    type_icon: '',
    type_category: '',
    is_active: true
  }), []);

  const [formData, setFormData] = useState(defaultFormData);

  // Memoize loadProjectTypes to prevent recreation on every render
  const loadProjectTypes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getProjectTypes({ active: undefined }); // Get all, including inactive
      if (result.success) {
        setProjectTypes(result.data || []);
      } else {
        toast.error('Failed to load project types');
      }
    } catch (error) {
      console.error('Error loading project types:', error);
      toast.error('Error loading project types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectTypes();
  }, [loadProjectTypes]);

  // Memoize handleAdd to prevent recreation
  const handleAdd = useCallback(() => {
    setEditingType(null);
    setFormData(defaultFormData);
    setShowForm(true);
  }, [defaultFormData]);

  // Memoize handleEdit to prevent recreation
  const handleEdit = useCallback((type) => {
    setEditingType(type);
    setFormData({
      type_code: type.type_code || '',
      type_name: type.type_name || '',
      type_description: type.type_description || '',
      type_color: type.type_color || '#3B82F6',
      type_icon: type.type_icon || '',
      type_category: type.type_category || '',
      is_active: type.is_active !== undefined ? type.is_active : true
    });
    setShowForm(true);
  }, []);

  // Memoize handleDelete to prevent recreation
  const handleDelete = useCallback(async (type) => {
    if (!confirm(`Are you sure you want to delete "${type.type_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteProjectType(type.id);
      if (result.success) {
        toast.success('Project type deleted successfully');
        loadProjectTypes();
      } else {
        toast.error(result.error || 'Failed to delete project type');
      }
    } catch (error) {
      console.error('Error deleting project type:', error);
      toast.error('Error deleting project type');
    }
  }, [loadProjectTypes]);

  // Use useRef to access latest formData without including it in dependencies
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Memoize handleSubmit to prevent recreation
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let result;
      if (editingType) {
        result = await updateProjectType(editingType.id, formDataRef.current);
      } else {
        result = await createProjectType(formDataRef.current);
      }

      if (result.success) {
        toast.success(`Project type ${editingType ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingType(null);
        loadProjectTypes();
      } else {
        console.error('Service returned error:', result.error);
        toast.error(result.error || `Failed to ${editingType ? 'update' : 'create'} project type`);
      }
    } catch (error) {
      console.error('Error saving project type:', error);
      toast.error(error.message || `Error ${editingType ? 'updating' : 'creating'} project type`);
    } finally {
      setSaving(false);
    }
  }, [editingType, loadProjectTypes]);

  // Memoize handleCancel to prevent recreation
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingType(null);
    setFormData(defaultFormData);
  }, [defaultFormData]);

  // Optimized form change handler using useCallback
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Memoize sorted types to avoid recalculation on every render
  const sortedTypes = useMemo(() => {
    return [...projectTypes].sort((a, b) => a.type_name.localeCompare(b.type_name));
  }, [projectTypes]);

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
          <h1 className="text-3xl font-bold text-gray-100">Project Types</h1>
          <p className="mt-2 text-gray-400">Manage project type definitions</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Project Type
        </button>
      </div>
    </div>
  ), [navigate, handleAdd]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading project types...</p>
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
              {editingType ? 'Edit Project Type' : 'Add Project Type'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type Code *
                  </label>
                  <input
                    type="text"
                    value={formData.type_code}
                    onChange={(e) => handleFormChange('type_code', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., INTERNAL, CLIENT, R&D"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type Name *
                  </label>
                  <input
                    type="text"
                    value={formData.type_name}
                    onChange={(e) => handleFormChange('type_name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Internal Project, Client Project"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.type_description}
                  onChange={(e) => handleFormChange('type_description', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Description of this project type"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.type_color}
                    onChange={(e) => handleFormChange('type_color', e.target.value)}
                    className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Icon (Icon Name)
                  </label>
                  <input
                    type="text"
                    value={formData.type_icon}
                    onChange={(e) => handleFormChange('type_icon', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., folder, briefcase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.type_category}
                    onChange={(e) => handleFormChange('type_category', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., internal, external, client"
                  />
                </div>
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

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editingType ? 'Update' : 'Create'}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedTypes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      No project types found. Click "Add Project Type" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedTypes.map((type) => (
                    <TypeTableRow
                      key={type.id}
                      type={type}
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
