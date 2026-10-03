/**
 * Timesheet Work Categories Management Page (v1170)
 * CRUD operations for timesheet_work_categories lookup table — replaces the old hardcoded
 * CHECK constraint on timesheet_entries.work_category.
 * Route: /platform/pmo-admin/timesheet-work-categories
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getWorkCategories, createWorkCategory, updateWorkCategory, deleteWorkCategory } from '../../services/timesheetWorkCategoryService';
import { RowActionButton } from '@nidus/ui';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const DEFAULT_FORM = {
  code: '',
  name: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

export default function TimesheetWorkCategories() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getWorkCategories({ active: undefined });
      if (result.success) {
        setCategories(result.data || []);
      } else {
        toast.error('Failed to load work categories');
      }
    } catch (error) {
      console.error('Error loading work categories:', error);
      toast.error('Error loading work categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (formTab !== 'audit' || !editingCategory) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editingCategory.created_by, editingCategory.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, editingCategory]);

  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setFormData(DEFAULT_FORM);
    setFormTab('details');
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((category) => {
    setEditingCategory(category);
    setFormTab('details');
    setFormData({
      code: category.code || '',
      name: category.name || '',
      description: category.description || '',
      sort_order: category.sort_order ?? 0,
      is_active: category.is_active !== undefined ? category.is_active : true,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (category) => {
    if (!window.confirm(`Delete the "${category.name}" category? This action cannot be undone.`)) return;
    try {
      const result = await deleteWorkCategory(category.id);
      if (result.success) {
        toast.success('Work category deleted successfully');
        loadCategories();
      } else {
        toast.error(result.error || 'Failed to delete work category');
      }
    } catch (error) {
      console.error('Error deleting work category:', error);
      toast.error('Error deleting work category');
    }
  }, [loadCategories]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingCategory
        ? await updateWorkCategory(editingCategory.id, formData)
        : await createWorkCategory(formData);

      if (result.success) {
        toast.success(`Work category ${editingCategory ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingCategory(null);
        loadCategories();
      } else {
        toast.error(result.error || `Failed to ${editingCategory ? 'update' : 'create'} work category`);
      }
    } catch (error) {
      console.error('Error saving work category:', error);
      toast.error(`Error ${editingCategory ? 'updating' : 'creating'} work category`);
    } finally {
      setSaving(false);
    }
  }, [editingCategory, formData, loadCategories]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData(DEFAULT_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timesheet Work Categories</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage the category options (Governance, Data Migration, Defect Fixing, etc.) offered when logging time.
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Category
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingCategory ? 'Edit Work Category' : 'Add Work Category'}
            </h2>
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            {formTab === 'audit' ? (
              <div className="mt-4">
                {!editingCategory ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this category is saved.</p>
                ) : (
                  <AuditDetailsPanel description="Who created or changed this work category.">
                    <AuditCard title="Identity" description="How this category is labelled.">
                      <AuditField label="Code" value={editingCategory.code} />
                      <AuditField label="Name" value={editingCategory.name} />
                    </AuditCard>
                    <AuditCard title="Classification" description="Display order and status.">
                      <AuditField label="Sort order" value={editingCategory.sort_order} />
                      <AuditField label="Active" value={editingCategory.is_active ? 'Yes' : 'No'} />
                    </AuditCard>
                    <AuditCard title="Record history" description="When this category was created and last changed.">
                      <AuditField label="Created by" value={editingCategory.created_by ? auditUserLabels[editingCategory.created_by] || null : null} />
                      <AuditTimestampPair dateLabel="Created at" value={editingCategory.created_at} />
                      <AuditField label="Updated by" value={editingCategory.updated_by ? auditUserLabels[editingCategory.updated_by] || null : null} />
                      <AuditTimestampPair dateLabel="Last updated" value={editingCategory.updated_at} />
                    </AuditCard>
                  </AuditDetailsPanel>
                )}
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleFormChange('code', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., governance"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Governance"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="When a user should pick this category"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => handleFormChange('sort_order', e.target.value ? parseInt(e.target.value, 10) : 0)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Display order"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
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
                  {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Loading…</td>
                  </tr>
                ) : sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No work categories found. Click "Add Category" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedCategories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{category.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{category.name}</span>
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{category.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{category.sort_order ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            category.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RowActionButton variant="edit" label="Edit work category" onClick={() => handleEdit(category)} />
                          <RowActionButton variant="delete" label="Delete work category" onClick={() => handleDelete(category)} />
                        </div>
                      </td>
                    </tr>
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
