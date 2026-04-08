/**
 * Practice Engagement Actions – sim version of EngagementActions (practice_project_id, practice_stakeholder_id).
 * Theme-aware; supports practiceProjectId and optional practiceStakeholderId filter.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getPracticeEngagementActions,
  savePracticeEngagementAction,
  deletePracticeEngagementAction,
  getPracticeStakeholders,
} from '../../services/sim/practiceStakeholderService'
import { platformDb } from '../../services/supabaseClient'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ACTION_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'report', label: 'Report' },
  { value: 'call', label: 'Call' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function PracticeEngagementActions({ practiceProjectId, practiceStakeholderId = null }) {
  const [actions, setActions] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState({
    action_description: '',
    practice_stakeholder_id: practiceStakeholderId || '',
    owner_user_id: '',
    due_date: '',
    status: 'open',
    action_type: 'other',
    priority: 'medium',
    outcome_notes: '',
  })

  const loadActions = useCallback(async () => {
    if (!practiceProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeEngagementActions({
        practice_project_id: practiceProjectId,
        ...(practiceStakeholderId ? { practice_stakeholder_id: practiceStakeholderId } : {}),
      })
      setActions(res.data || [])
    } catch (e) {
      console.error(e)
      setActions([])
    } finally {
      setLoading(false)
    }
  }, [practiceProjectId, practiceStakeholderId])

  useEffect(() => {
    if (!practiceProjectId) {
      setActions([])
      setLoading(false)
      return
    }
    loadActions()
  }, [practiceProjectId, practiceStakeholderId, loadActions])

  useEffect(() => {
    if (!practiceProjectId) return
    getPracticeStakeholders(practiceProjectId).then((res) => {
      setStakeholders(res.data || [])
    }).catch(() => {})
    platformDb.from('users').select('id, full_name, email').eq('is_deleted', false).order('full_name', { ascending: true }).then(({ data }) => {
      setUsers(data || [])
    }).catch(() => {})
  }, [practiceProjectId])

  const resetForm = () => {
    setForm({
      action_description: '',
      practice_stakeholder_id: practiceStakeholderId || '',
      owner_user_id: '',
      due_date: '',
      status: 'open',
      action_type: 'other',
      priority: 'medium',
      outcome_notes: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (row) => {
    setEditingId(row.id)
    setForm({
      action_description: row.action_description || '',
      practice_stakeholder_id: row.practice_stakeholder_id || '',
      owner_user_id: row.owner_user_id || '',
      due_date: row.due_date ? row.due_date.slice(0, 10) : '',
      status: row.status || 'open',
      action_type: row.action_type || 'other',
      priority: row.priority || 'medium',
      outcome_notes: row.outcome_notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!practiceProjectId || !form.action_description?.trim()) return
    const sid = practiceStakeholderId || form.practice_stakeholder_id
    if (!sid) return
    setSaving(true)
    try {
      const payload = {
        practice_project_id: practiceProjectId,
        practice_stakeholder_id: sid,
        action_description: form.action_description.trim(),
        owner_user_id: form.owner_user_id || null,
        due_date: form.due_date || null,
        status: form.status,
        action_type: form.action_type,
        priority: form.priority,
        outcome_notes: form.outcome_notes?.trim() || null,
        completion_date: form.status === 'completed' ? (form.completion_date || new Date().toISOString().slice(0, 10)) : null,
      }
      const res = await savePracticeEngagementAction(payload, editingId)
      if (!res.success) throw new Error(res.error)
      resetForm()
      loadActions()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to save action')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this engagement action?')) return
    setDeletingId(id)
    try {
      const res = await deletePracticeEngagementAction(id)
      if (!res.success) throw new Error(res.error)
      loadActions()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  if (!practiceProjectId) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-500 dark:text-gray-400">
        Select a practice project to manage engagement actions.
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Engagement actions</h3>
        {!practiceStakeholderId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm((f) => ({ ...f, action_description: '', practice_stakeholder_id: '' })) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" /> Add action
          </button>
        )}
        {practiceStakeholderId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm((f) => ({ ...f, action_description: '' })) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" /> Add action
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={form.action_description}
              onChange={(e) => setForm((f) => ({ ...f, action_description: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {!practiceStakeholderId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stakeholder</label>
              <select
                value={form.practice_stakeholder_id}
                onChange={(e) => setForm((f) => ({ ...f, practice_stakeholder_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select stakeholder</option>
                {stakeholders.map((s) => (
                  <option key={s.id} value={s.id}>{s.stakeholder_name || s.stakeholder_reference || s.id}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
              <select
                value={form.owner_user_id}
                onChange={(e) => setForm((f) => ({ ...f, owner_user_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={form.action_type}
                onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {ACTION_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          {(form.status === 'completed' || editingId) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcome notes</label>
              <textarea
                value={form.outcome_notes}
                onChange={(e) => setForm((f) => ({ ...f, outcome_notes: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        {actions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">No engagement actions yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  {!practiceStakeholderId && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {actions.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isOverdue(row.due_date, row.status) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.action_description || '—'}</td>
                    {!practiceStakeholderId && (
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {row.practice_stakeholder?.stakeholder_name || row.practice_stakeholder?.stakeholder_reference || '—'}
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{row.due_date ? new Date(row.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{row.status || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{row.action_type || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{row.priority || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => handleEdit(row)} className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(row.id)} disabled={deletingId === row.id} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
