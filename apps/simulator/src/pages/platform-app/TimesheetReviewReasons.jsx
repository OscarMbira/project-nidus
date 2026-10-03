/**
 * Timesheet Review Reasons Management Page (v1169)
 * CRUD for timesheet_entry_approve_reasons / timesheet_entry_reject_reasons — the predefined
 * reason catalogs a reviewer picks from when approving/rejecting a timesheet entry
 * (TeamTimesheetsPage.jsx). One page, two tabs (Approve reasons / Reject reasons), same
 * scaffolding shape as AssignmentRoles.jsx.
 * Route: /platform/pmo-admin/timesheet-review-reasons
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getReviewReasons, createReviewReason, updateReviewReason, deleteReviewReason } from '../../services/timesheetReasonCatalogService';
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

const DECISIONS = [
  { value: 'approved', label: 'Approve reasons' },
  { value: 'rejected', label: 'Reject reasons' },
];

export default function TimesheetReviewReasons() {
  const navigate = useNavigate();
  const [decision, setDecision] = useState('approved');
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const loadReasons = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getReviewReasons(decision, { active: undefined });
      if (result.success) {
        setReasons(result.data || []);
      } else {
        toast.error('Failed to load reasons');
      }
    } catch (error) {
      console.error('Error loading review reasons:', error);
      toast.error('Error loading reasons');
    } finally {
      setLoading(false);
    }
  }, [decision]);

  useEffect(() => { loadReasons(); }, [loadReasons]);

  useEffect(() => {
    setShowForm(false);
    setEditingReason(null);
  }, [decision]);

  useEffect(() => {
    if (formTab !== 'audit' || !editingReason) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editingReason.created_by, editingReason.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [formTab, editingReason]);

  const handleAdd = useCallback(() => {
    setEditingReason(null);
    setFormData(DEFAULT_FORM);
    setFormTab('details');
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((reason) => {
    setEditingReason(reason);
    setFormTab('details');
    setFormData({
      code: reason.code || '',
      name: reason.name || '',
      description: reason.description || '',
      sort_order: reason.sort_order ?? 0,
      is_active: reason.is_active !== undefined ? reason.is_active : true,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (reason) => {
    if (!window.confirm(`Delete the "${reason.name}" reason? This action cannot be undone.`)) return;
    try {
      const result = await deleteReviewReason(decision, reason.id);
      if (result.success) {
        toast.success('Reason deleted successfully');
        loadReasons();
      } else {
        toast.error(result.error || 'Failed to delete reason');
      }
    } catch (error) {
      console.error('Error deleting review reason:', error);
      toast.error('Error deleting reason');
    }
  }, [decision, loadReasons]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingReason
        ? await updateReviewReason(decision, editingReason.id, formData)
        : await createReviewReason(decision, formData);

      if (result.success) {
        toast.success(`Reason ${editingReason ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingReason(null);
        loadReasons();
      } else {
        toast.error(result.error || `Failed to ${editingReason ? 'update' : 'create'} reason`);
      }
    } catch (error) {
      console.error('Error saving review reason:', error);
      toast.error(`Error ${editingReason ? 'updating' : 'creating'} reason`);
    } finally {
      setSaving(false);
    }
  }, [decision, editingReason, formData, loadReasons]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingReason(null);
    setFormData(DEFAULT_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const sortedReasons = useMemo(() => {
    return [...reasons].sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [reasons]);

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timesheet Review Reasons</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage the predefined reasons a reviewer selects from when approving or rejecting a timesheet entry.
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Reason
            </button>
          </div>
        </div>

        {/* Approve / Reject tab switch */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-fit">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDecision(d.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                decision === d.value
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white dark:shadow-none'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingReason ? 'Edit Reason' : 'Add Reason'} — {DECISIONS.find((d) => d.value === decision)?.label}
            </h2>
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            {formTab === 'audit' ? (
              <div className="mt-4">
                {!editingReason ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this reason is saved.</p>
                ) : (
                  <AuditDetailsPanel description="Who created or changed this reason.">
                    <AuditCard title="Identity" description="How this reason is labelled.">
                      <AuditField label="Code" value={editingReason.code} />
                      <AuditField label="Name" value={editingReason.name} />
                    </AuditCard>
                    <AuditCard title="Classification" description="Display order and status.">
                      <AuditField label="Sort order" value={editingReason.sort_order} />
                      <AuditField label="Active" value={editingReason.is_active ? 'Yes' : 'No'} />
                    </AuditCard>
                    <AuditCard title="Record history" description="When this reason was created and last changed.">
                      <AuditField label="Created by" value={editingReason.created_by ? auditUserLabels[editingReason.created_by] || null : null} />
                      <AuditTimestampPair dateLabel="Created at" value={editingReason.created_at} />
                      <AuditField label="Updated by" value={editingReason.updated_by ? auditUserLabels[editingReason.updated_by] || null : null} />
                      <AuditTimestampPair dateLabel="Last updated" value={editingReason.updated_at} />
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
                    placeholder="e.g., missing_details"
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
                    placeholder="e.g., Missing details"
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
                  placeholder="When a reviewer should pick this reason"
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
                  {saving ? 'Saving...' : editingReason ? 'Update' : 'Create'}
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
                ) : sortedReasons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No reasons found. Click "Add Reason" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedReasons.map((reason, index) => (
                    <tr key={reason.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{reason.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{reason.name}</span>
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{reason.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{reason.sort_order ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            reason.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {reason.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RowActionButton variant="edit" label="Edit reason" onClick={() => handleEdit(reason)} />
                          <RowActionButton variant="delete" label="Delete reason" onClick={() => handleDelete(reason)} />
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
