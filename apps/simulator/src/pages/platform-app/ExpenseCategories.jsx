/**
 * Expense Categories Management Page (Simulator, v1226)
 * CRUD operations for the sim.expense_categories lookup table.
 * Route: /simulator/pmo-admin/expense-categories
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getSimExpenseCategories,
  createSimExpenseCategory,
  updateSimExpenseCategory,
  deleteSimExpenseCategory,
} from '../../services/simExpenseCategoryService';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const defaultFormData = { category_code: '', category_name: '', category_description: '', is_active: true };

export default function ExpenseCategories() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState(defaultFormData);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSimExpenseCategories({ active: undefined });
      if (result.success) {
        setCategories(result.data || []);
      } else {
        toast.error('Failed to load expense categories');
      }
    } catch (error) {
      console.error('Error loading expense categories:', error);
      toast.error('Error loading expense categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (formTab !== 'audit' || !editing) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editing.created_by, editing.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, editing]);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setFormData(defaultFormData);
    setFormTab('details');
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((category) => {
    setEditing(category);
    setFormTab('details');
    setFormData({
      category_code: category.category_code || '',
      category_name: category.category_name || '',
      category_description: category.category_description || '',
      is_active: category.is_active !== undefined ? category.is_active : true,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.category_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const result = await deleteSimExpenseCategory(category.id);
      if (result.success) {
        toast.success('Expense category deleted successfully');
        load();
      } else {
        toast.error(result.error || 'Failed to delete expense category');
      }
    } catch (error) {
      console.error('Error deleting expense category:', error);
      toast.error('Error deleting expense category');
    }
  }, [load]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    setFormData(defaultFormData);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editing
        ? await updateSimExpenseCategory(editing.id, formData)
        : await createSimExpenseCategory(formData);
      if (result.success) {
        toast.success(`Expense category ${editing ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditing(null);
        load();
      } else {
        toast.error(result.error || `Failed to ${editing ? 'update' : 'create'} expense category`);
      }
    } catch (error) {
      console.error('Error saving expense category:', error);
      toast.error(error.message || `Error ${editing ? 'updating' : 'creating'} expense category`);
    } finally {
      setSaving(false);
    }
  }, [editing, formData, load]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.category_name.localeCompare(b.category_name)),
    [categories],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading expense categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Expense Categories</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Manage the categories used to classify expense claim line items</p>
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

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? 'Edit Expense Category' : 'Add Expense Category'}
            </h2>
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            {formTab === 'audit' ? (
              <div className="mt-4">
                {!editing ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this category is saved.</p>
                ) : (
                  <AuditDetailsPanel description="Who created or changed this category.">
                    <AuditCard title="Identity" description="How this category is labelled.">
                      <AuditField label="Category code" value={editing.category_code} />
                      <AuditField label="Category name" value={editing.category_name} />
                    </AuditCard>
                    <AuditCard title="Classification" description="Status.">
                      <AuditField label="Active" value={editing.is_active ? 'Yes' : 'No'} />
                    </AuditCard>
                    <AuditCard title="Record history" description="When this category was created and last changed.">
                      <AuditField label="Created by" value={editing.created_by ? auditUserLabels[editing.created_by] || null : null} />
                      <AuditTimestampPair dateLabel="Created at" value={editing.created_at} />
                      <AuditField label="Updated by" value={editing.updated_by ? auditUserLabels[editing.updated_by] || null : null} />
                      <AuditTimestampPair dateLabel="Last updated" value={editing.updated_at} />
                    </AuditCard>
                  </AuditDetailsPanel>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Code *
                    </label>
                    <input
                      id="category_code"
                      type="text"
                      value={formData.category_code}
                      onChange={(e) => handleFormChange('category_code', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., travel, meals"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="category_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Name *
                    </label>
                    <input
                      id="category_name"
                      type="text"
                      value={formData.category_name}
                      onChange={(e) => handleFormChange('category_name', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Travel, Meals"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="category_description"
                    value={formData.category_description}
                    onChange={(e) => handleFormChange('category_description', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="What this category covers"
                  />
                </div>

                <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No expense categories found. Click "Add Category" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedCategories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{category.category_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{category.category_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            category.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Edit"
                            aria-label={`Edit ${category.category_name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete"
                            aria-label={`Delete ${category.category_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
