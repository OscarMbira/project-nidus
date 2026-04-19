/**
 * Funding Sources Management (PMO Admin)
 * CRUD for funding_sources lookup – used in project budget categories.
 * Route: /platform/pmo-admin/funding-sources
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getFundingSources,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource
} from '../../services/fundingSourceService';

export default function FundingSources() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const defaultForm = useMemo(() => ({
    name: '',
    code: '',
    description: '',
    is_active: true
  }), []);
  const [formData, setFormData] = useState(defaultForm);
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getFundingSources({ activeOnly: false });
      if (result.success) setSources(result.data || []);
      else toast.error(result?.error || 'Failed to load funding sources');
    } catch (e) {
      const msg = e?.message || e?.error_description || 'Failed to load funding sources';
      console.error(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setFormData(defaultForm);
    setShowForm(true);
  }, [defaultForm]);

  const handleEdit = useCallback((row) => {
    setEditing(row);
    setFormData({
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      is_active: row.is_active !== undefined ? row.is_active : true
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (row) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      const result = await deleteFundingSource(row.id);
      if (result.success) {
        toast.success('Funding source deleted');
        load();
      } else toast.error(result.error || 'Delete failed');
    } catch (e) {
      toast.error('Delete failed');
    }
  }, [load]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = formDataRef.current;
      const result = editing
        ? await updateFundingSource(editing.id, data)
        : await createFundingSource(data);
      if (result.success) {
        toast.success(editing ? 'Updated' : 'Created');
        setShowForm(false);
        setEditing(null);
        load();
      } else toast.error(result.error || 'Save failed');
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [editing, load]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    setFormData(defaultForm);
  }, [defaultForm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-3xl font-bold text-gray-100">Funding Sources</h1>
              <p className="mt-2 text-gray-400">Manage funding sources for budget categories (e.g. Donors, IT Department)</p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Funding Source
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              {editing ? 'Edit Funding Source' : 'Add Funding Source'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Donors, IT Department"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., DONORS, IT"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">Active</label>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCancel} className="flex items-center gap-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    No funding sources. Add one to use in project budget categories.
                  </td>
                </tr>
              ) : (
                sources.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 text-sm text-gray-100">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{row.code || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${row.is_active ? 'bg-green-900/30 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300 p-1" title="Edit"><Edit className="h-4 w-4 inline" /></button>
                      <button onClick={() => handleDelete(row)} className="text-red-400 hover:text-red-300 p-1 ml-2" title="Delete"><Trash2 className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
