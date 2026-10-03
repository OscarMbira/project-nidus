/**
 * Change Decisions tab (taxonomy §3, Change Control > Change Decisions: Pending/Approved/
 * Rejected/Deferred). Reuses the existing change_approvals table + changeManagementService.js
 * functions — real backend, never had a UI surface before this.
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Gavel } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { fetchChangeApprovals, createChangeApproval, updateChangeApproval } from '../../services/changeManagementService'

const DECISION_OPTIONS = ['pending', 'approved', 'approved-with-conditions', 'rejected', 'deferred', 'escalated']

const DECISION_COLORS = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'approved-with-conditions': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  deferred: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}

const EMPTY_FORM = { approval_level: 'project-manager', approval_type: 'business', requested_date: new Date().toISOString().slice(0, 10), decision_rationale: '' }

export default function ChangeDecisions({ changeRequestId, projectId }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!changeRequestId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await fetchChangeApprovals(changeRequestId)
      setDecisions(data || [])
      const { data: { user } } = await platformDb.auth.getUser()
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load decisions')
    } finally {
      setLoading(false)
    }
  }, [changeRequestId])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createChangeApproval({
        change_request_id: changeRequestId,
        project_id: projectId,
        approval_level: form.approval_level,
        approval_type: form.approval_type,
        requested_date: form.requested_date,
        decision: 'pending',
        approver_user_id: uid,
        created_by: uid,
      })
      toast.success('Decision request added')
      setFormOpen(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDecide = async (decision, value) => {
    setSaving(true)
    try {
      await updateChangeApproval(decision.id, {
        decision: value,
        decision_date: new Date().toISOString().slice(0, 10),
        decision_rationale: form.decision_rationale || decision.decision_rationale || null,
        updated_by: uid,
      })
      toast.success('Decision recorded')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Plus className="h-4 w-4" /> Request decision
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={form.approval_level} onChange={(e) => setForm({ ...form, approval_level: e.target.value })}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
            {['project-manager', 'change-board', 'project-board', 'sponsor'].map((v) => (
              <option key={v} value={v}>{v.replace('-', ' ')}</option>
            ))}
          </select>
          <select value={form.approval_type} onChange={(e) => setForm({ ...form, approval_type: e.target.value })}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
            {['technical', 'financial', 'business', 'final'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <input type="date" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">Add</button>
          </div>
        </form>
      )}

      {decisions.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700">
          <Gavel className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No decisions requested yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <div key={d.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{d.approval_level?.replace('-', ' ')} · {d.approval_type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Requested {d.requested_date}{d.decision_date ? ` · Decided ${d.decision_date}` : ''}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DECISION_COLORS[d.decision] || DECISION_COLORS.pending}`}>
                  {(d.decision || 'pending').replace('-', ' ')}
                </span>
              </div>
              {d.decision_rationale && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{d.decision_rationale}</p>}
              {d.decision === 'pending' && (
                <div className="flex items-center gap-2 mt-3">
                  {['approved', 'rejected', 'deferred'].map((v) => (
                    <button key={v} type="button" onClick={() => handleDecide(d, v)} disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 capitalize disabled:opacity-50">
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
