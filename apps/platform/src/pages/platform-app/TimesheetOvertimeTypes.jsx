/**
 * Timesheet Overtime Types Management Page (v1174)
 * CRUD operations for timesheet_overtime_types lookup table — classifies why overtime happened
 * (After Hours, Public Holiday, etc.) on the Overtime grid. The Weekend row is system-managed
 * (auto-assigned by the grid for non-working days) and can't be edited or deleted here.
 * Route: /platform/pmo-admin/timesheet-overtime-types
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getOvertimeTypes, createOvertimeType, updateOvertimeType, deleteOvertimeType } from '../../services/timesheetOvertimeTypeService';
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

export default function TimesheetOvertimeTypes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getOvertimeTypes({ active: undefined });
      if (result.success) {
        setTypes(result.data || []);
      } else {
        toast.error('Failed to load overtime types');
      }
    } catch (error) {
      console.error('Error loading overtime types:', error);
      toast.error('Error loading overtime types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  useEffect(() => {
    if (formTab !== 'audit' || !editingType) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editingType.created_by, editingType.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, editingType]);

  const handleAdd = useCallback(() => {
    setEditingType(null);
    setFormData(DEFAULT_FORM);
    setFormTab('details');
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((type) => {
    if (type.is_system) return;
    setEditingType(type);
    setFormTab('details');
    setFormData({
      code: type.code || '',
      name: type.name || '',
      description: type.description || '',
      sort_order: type.sort_order ?? 0,
      is_active: type.is_active !== undefined ? type.is_active : true,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (type) => {
    if (type.is_system) return;
    if (!window.confirm(`Delete the "${type.name}" overtime type? This action cannot be undone.`)) return;
    try {
      const result = await deleteOvertimeType(type.id);
      if (result.success) {
        toast.success('Overtime type deleted successfully');
        loadTypes();
      } else {
        toast.error(result.error || 'Failed to delete overtime type');
      }
    } catch (error) {
      console.error('Error deleting overtime type:', error);
      toast.error('Error deleting overtime type');
    }
  }, [loadTypes]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingType
        ? await updateOvertimeType(editingType.id, formData)
        : await createOvertimeType(formData);

      if (result.success) {
        toast.success(`Overtime type ${editingType ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingType(null);
        loadTypes();
      } else {
        toast.error(result.error || `Failed to ${editingType ? 'update' : 'create'} overtime type`);
      }
    } catch (error) {
      console.error('Error saving overtime type:', error);
      toast.error(`Error ${editingType ? 'updating' : 'creating'} overtime type`);
    } finally {
      setSaving(false);
    }
  }, [editingType, formData, loadTypes]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingType(null);
    setFormData(DEFAULT_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [types]);

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timesheet Overtime Types</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage the classification options (After Hours, Public Holiday, etc.) offered on the Overtime grid. The Weekend type is assigned automatically and can't be edited here.
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Type
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingType ? 'Edit Overtime Type' : 'Add Overtime Type'}
            </h2>
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            {formTab === 'audit' ? (
              <div className="mt-4">
                {!editingType ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this type is saved.</p>
                ) : (
                  <AuditDetailsPanel description="Who created or changed this overtime type.">
                    <AuditCard title="Identity" description="How this type is labelled.">
                      <AuditField label="Code" value={editingType.code} />
                      <AuditField label="Name" value={editingType.name} />
                    </AuditCard>
                    <AuditCard title="Classification" description="Display order and status.">
                      <AuditField label="Sort order" value={editingType.sort_order} />
                      <AuditField label="Active" value={editingType.is_active ? 'Yes' : 'No'} />
                    </AuditCard>
                    <AuditCard title="Record history" description="When this type was created and last changed.">
                      <AuditField label="Created by" value={editingType.created_by ? auditUserLabels[editingType.created_by] || null : null} />
                      <AuditTimestampPair dateLabel="Created at" value={editingType.created_at} />
                      <AuditField label="Updated by" value={editingType.updated_by ? auditUserLabels[editingType.updated_by] || null : null} />
                      <AuditTimestampPair dateLabel="Last updated" value={editingType.updated_at} />
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
                    placeholder="e.g., after_hours"
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
                    placeholder="e.g., After Hours"
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
                  placeholder="When a reviewer should pick this type"
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
                  {saving ? 'Saving...' : editingType ? 'Update' : 'Create'}
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
                ) : sortedTypes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No overtime types found. Click "Add Type" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedTypes.map((type, index) => (
                    <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{type.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {type.name}
                          {type.is_system && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">System</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{type.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{type.sort_order ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            type.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {type.is_system ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Not editable</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <RowActionButton variant="edit" label="Edit overtime type" onClick={() => handleEdit(type)} />
                            <RowActionButton variant="delete" label="Delete overtime type" onClick={() => handleDelete(type)} />
                          </div>
                        )}
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
