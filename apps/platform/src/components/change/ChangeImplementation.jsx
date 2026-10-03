/**
 * Change Implementation tab (taxonomy §3, Change Control > Change Implementation: Actions,
 * Baseline Updates, Communication, Verification). Reuses the existing change_implementations
 * table + changeManagementService.js functions — real backend, never had a UI surface before.
 * Baseline Updates / Communication share the table's general `notes` field (no dedicated
 * columns exist for them) rather than adding new columns for two free-text facets.
 */
import { useState, useEffect, useCallback } from 'react'
import { Save, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { fetchChangeImplementation, createChangeImplementation, updateChangeImplementation } from '../../services/changeManagementService'

const STATUS_OPTIONS = ['planned', 'in-progress', 'completed', 'on-hold', 'cancelled']

const EMPTY_FORM = {
  implementation_plan: '',
  planned_start_date: '',
  planned_end_date: '',
  status: 'planned',
  notes: '',
  verification_criteria: '',
  verification_notes: '',
}

export default function ChangeImplementation({ changeRequestId, projectId }) {
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState(null)

  const load = useCallback(async () => {
    if (!changeRequestId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await fetchChangeImplementation(changeRequestId)
      setRecord(data)
      if (data) {
        setForm({
          implementation_plan: data.implementation_plan || '',
          planned_start_date: data.planned_start_date || '',
          planned_end_date: data.planned_end_date || '',
          status: data.status || 'planned',
          notes: data.notes || '',
          verification_criteria: data.verification_criteria || '',
          verification_notes: data.verification_notes || '',
        })
      }
      const { data: { user } } = await platformDb.auth.getUser()
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load implementation')
    } finally {
      setLoading(false)
    }
  }, [changeRequestId])

  useEffect(() => { load() }, [load])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        implementation_plan: form.implementation_plan || null,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        status: form.status,
        notes: form.notes || null,
        verification_criteria: form.verification_criteria || null,
      }
      if (record) {
        await updateChangeImplementation(record.id, { ...payload, updated_by: uid })
      } else {
        await createChangeImplementation({
          change_request_id: changeRequestId,
          project_id: projectId,
          implementation_owner_user_id: uid,
          created_by: uid,
          ...payload,
        })
      }
      toast.success('Implementation saved')
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    if (!record) return
    setSaving(true)
    try {
      await updateChangeImplementation(record.id, {
        verified: true,
        verified_by: uid,
        verification_date: new Date().toISOString().slice(0, 10),
        verification_notes: form.verification_notes || null,
        updated_by: uid,
      })
      toast.success('Implementation verified')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Verify failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actions / Implementation Plan</label>
        <textarea rows={4} value={form.implementation_plan} onChange={(e) => setForm({ ...form, implementation_plan: e.target.value })}
          placeholder="What actions are being taken to implement this change?"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Planned start</label>
          <input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Planned end</label>
          <input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm capitalize">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Baseline Updates &amp; Communication</label>
        <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Which baselines were updated, and how/who was notified of this change?"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Verification
          {record?.verified && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">Verified {record.verification_date}</span>}
        </h3>
        <textarea rows={2} value={form.verification_criteria} onChange={(e) => setForm({ ...form, verification_criteria: e.target.value })}
          placeholder="Verification criteria"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm mb-2" />
        {!record?.verified && (
          <textarea rows={2} value={form.verification_notes} onChange={(e) => setForm({ ...form, verification_notes: e.target.value })}
            placeholder="Verification notes (required to mark verified)"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
        )}
        {record?.verification_notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{record.verification_notes}</p>}
      </div>

      <div className="flex justify-end gap-2">
        {record && !record.verified && (
          <button type="button" onClick={handleVerify} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> Mark verified
          </button>
        )}
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </form>
  )
}
