/**
 * Assignment Roles Management Page
 * CRUD operations for assignment_roles lookup table (v1164/v1165)
 * Route: /platform/pmo-admin/assignment-roles
 *
 * Default sort is sort_order (then name) rather than alphabetical — this is a curated,
 * ordered RACI-style list (same exception already used by ProjectStatuses' status_order),
 * not a generic alphabetical register (rule 40.1).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAssignmentRoles, createAssignmentRole, updateAssignmentRole, deleteAssignmentRole } from '../../services/assignmentRoleService';
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

export default function AssignmentRoles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAssignmentRoles({ active: undefined });
      if (result.success) {
        setRoles(result.data || []);
      } else {
        toast.error('Failed to load assignment roles');
      }
    } catch (error) {
      console.error('Error loading assignment roles:', error);
      toast.error('Error loading assignment roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  useEffect(() => {
    if (formTab !== 'audit' || !editingRole) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editingRole.created_by, editingRole.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, editingRole]);

  const handleAdd = useCallback(() => {
    setEditingRole(null);
    setFormData(DEFAULT_FORM);
    setFormTab('details');
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((role) => {
    setEditingRole(role);
    setFormTab('details');
    setFormData({
      code: role.code || '',
      name: role.name || '',
      description: role.description || '',
      sort_order: role.sort_order ?? 0,
      is_active: role.is_active !== undefined ? role.is_active : true,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (role) => {
    if (!window.confirm(`Delete the "${role.name}" assignment role? This action cannot be undone.`)) return;
    try {
      const result = await deleteAssignmentRole(role.id);
      if (result.success) {
        toast.success('Assignment role deleted successfully');
        loadRoles();
      } else {
        toast.error(result.error || 'Failed to delete assignment role');
      }
    } catch (error) {
      console.error('Error deleting assignment role:', error);
      toast.error('Error deleting assignment role');
    }
  }, [loadRoles]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingRole
        ? await updateAssignmentRole(editingRole.id, formData)
        : await createAssignmentRole(formData);

      if (result.success) {
        toast.success(`Assignment role ${editingRole ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingRole(null);
        loadRoles();
      } else {
        toast.error(result.error || `Failed to ${editingRole ? 'update' : 'create'} assignment role`);
      }
    } catch (error) {
      console.error('Error saving assignment role:', error);
      toast.error(`Error ${editingRole ? 'updating' : 'creating'} assignment role`);
    } finally {
      setSaving(false);
    }
  }, [editingRole, formData, loadRoles]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingRole(null);
    setFormData(DEFAULT_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading assignment roles...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignment Roles</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage the role options (Lead, Contributor, Reviewer, etc.) offered when assigning a resource.
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Role
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingRole ? 'Edit Assignment Role' : 'Add Assignment Role'}
            </h2>
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            {formTab === 'audit' ? (
              <div className="mt-4">
                {!editingRole ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this role is saved.</p>
                ) : (
                  <AuditDetailsPanel description="Who created or changed this assignment role.">
                    <AuditCard title="Identity" description="How this role is labelled.">
                      <AuditField label="Code" value={editingRole.code} />
                      <AuditField label="Name" value={editingRole.name} />
                    </AuditCard>
                    <AuditCard title="Classification" description="Display order and status.">
                      <AuditField label="Sort order" value={editingRole.sort_order} />
                      <AuditField label="Active" value={editingRole.is_active ? 'Yes' : 'No'} />
                    </AuditCard>
                    <AuditCard title="Record history" description="When this role was created and last changed.">
                      <AuditField label="Created by" value={editingRole.created_by ? auditUserLabels[editingRole.created_by] || null : null} />
                      <AuditTimestampPair dateLabel="Created at" value={editingRole.created_at} />
                      <AuditField label="Updated by" value={editingRole.updated_by ? auditUserLabels[editingRole.updated_by] || null : null} />
                      <AuditTimestampPair dateLabel="Last updated" value={editingRole.updated_at} />
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
                    placeholder="e.g., lead, contributor"
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
                    placeholder="e.g., Lead, Contributor"
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
                  placeholder="What this role means on an assignment"
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
                  {saving ? 'Saving...' : editingRole ? 'Update' : 'Create'}
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
                {sortedRoles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No assignment roles found. Click "Add Role" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedRoles.map((role, index) => (
                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{role.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{role.name}</span>
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{role.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{role.sort_order ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            role.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RowActionButton variant="edit" label="Edit assignment role" onClick={() => handleEdit(role)} />
                          <RowActionButton variant="delete" label="Delete assignment role" onClick={() => handleDelete(role)} />
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
