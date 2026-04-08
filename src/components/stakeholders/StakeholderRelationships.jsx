/**
 * StakeholderRelationships – list and CRUD for inter-stakeholder relationships.
 * Theme-aware; supports projectId and optional stakeholderId filter.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { getStakeholderRelationships, saveStakeholderRelationship, deleteStakeholderRelationship, getStakeholders } from '../../services/stakeholderService'

const REL_TYPES = [
  { value: 'influences', label: 'Influences' },
  { value: 'collaborates-with', label: 'Collaborates with' },
  { value: 'conflicts-with', label: 'Conflicts with' },
  { value: 'reports-to', label: 'Reports to' },
  { value: 'advises', label: 'Advises' },
  { value: 'depends-on', label: 'Depends on' },
]

export default function StakeholderRelationships({ projectId, stakeholderId = null }) {
  const [relationships, setRelationships] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState({
    from_stakeholder_id: stakeholderId || '',
    to_stakeholder_id: '',
    relationship_type: 'influences',
    relationship_strength: '',
    notes: '',
  })

  const loadRels = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getStakeholderRelationships({
        project_id: projectId,
        ...(stakeholderId ? { stakeholder_id: stakeholderId } : {}),
      })
      setRelationships(data || [])
    } catch (e) {
      console.error(e)
      setRelationships([])
    } finally {
      setLoading(false)
    }
  }, [projectId, stakeholderId])

  useEffect(() => {
    if (!projectId) {
      setRelationships([])
      setLoading(false)
      return
    }
    loadRels()
  }, [projectId, stakeholderId, loadRels])

  useEffect(() => {
    if (!projectId) return
    getStakeholders({ project_id: projectId, limit: 500 }).then((data) => setStakeholders(data || [])).catch(() => {})
  }, [projectId])

  const resetForm = () => {
    setForm({
      from_stakeholder_id: stakeholderId || '',
      to_stakeholder_id: '',
      relationship_type: 'influences',
      relationship_strength: '',
      notes: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (row) => {
    setEditingId(row.id)
    setForm({
      from_stakeholder_id: row.from_stakeholder_id,
      to_stakeholder_id: row.to_stakeholder_id,
      relationship_type: row.relationship_type || 'influences',
      relationship_strength: row.relationship_strength ?? '',
      notes: row.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectId || !form.from_stakeholder_id || !form.to_stakeholder_id || form.from_stakeholder_id === form.to_stakeholder_id) return
    setSaving(true)
    try {
      await saveStakeholderRelationship(
        {
          project_id: projectId,
          from_stakeholder_id: form.from_stakeholder_id,
          to_stakeholder_id: form.to_stakeholder_id,
          relationship_type: form.relationship_type,
          relationship_strength: form.relationship_strength === '' ? null : Number(form.relationship_strength),
          notes: form.notes || null,
        },
        editingId
      )
      resetForm()
      loadRels()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this relationship?')) return
    setDeletingId(id)
    try {
      await deleteStakeholderRelationship(id)
      loadRels()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const name = (s) => s?.stakeholder_name || s?.stakeholder_reference || '—'

  if (!projectId) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-500 dark:text-gray-400">
        Select a project to manage stakeholder relationships.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Stakeholder relationships</h3>
        {!stakeholderId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...form, from_stakeholder_id: '', to_stakeholder_id: '' }) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" /> Add relationship
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From stakeholder *</label>
              <select
                value={form.from_stakeholder_id}
                onChange={(e) => setForm((f) => ({ ...f, from_stakeholder_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={!!stakeholderId}
              >
                <option value="">Select</option>
                {stakeholders.map((s) => (
                  <option key={s.id} value={s.id}>{s.stakeholder_name || s.stakeholder_reference || s.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To stakeholder *</label>
              <select
                value={form.to_stakeholder_id}
                onChange={(e) => setForm((f) => ({ ...f, to_stakeholder_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select</option>
                {stakeholders.filter((s) => s.id !== form.from_stakeholder_id).map((s) => (
                  <option key={s.id} value={s.id}>{s.stakeholder_name || s.stakeholder_reference || s.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select
                value={form.relationship_type}
                onChange={(e) => setForm((f) => ({ ...f, relationship_type: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {REL_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strength (1–5)</label>
              <select
                value={form.relationship_strength}
                onChange={(e) => setForm((f) => ({ ...f, relationship_strength: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        {relationships.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">No relationships yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {relationships.map((rel) => (
              <div
                key={rel.id}
                className="flex flex-wrap items-center gap-2 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <span className="font-medium text-gray-900 dark:text-white">{name(rel.from_stakeholder)}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-900 dark:text-white">{name(rel.to_stakeholder)}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {REL_TYPES.find((r) => r.value === rel.relationship_type)?.label || rel.relationship_type}
                  {rel.relationship_strength != null ? ` (${rel.relationship_strength})` : ''}
                </span>
                {rel.notes && <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={rel.notes}>{rel.notes}</span>}
                <div className="ml-auto flex gap-1">
                  <button type="button" onClick={() => handleEdit(rel)} className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => handleDelete(rel.id)} disabled={deletingId === rel.id} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
