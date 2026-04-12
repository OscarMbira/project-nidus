import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as delayApi from '../../services/delayService'
import * as simDelayApi from '../../services/sim/simDelayService'
import { DELAY_CATEGORIES, DELAY_SEVERITIES, TEMPLATE_STATUSES } from '../../constants/delayConstants'

export default function DelayTemplateForm({ open, onClose, onSaved, initial, accountId, userId, isSim, canEdit }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const [step, setStep] = useState(0)

  const svc = isSim ? simDelayApi : delayApi

  useEffect(() => {
    if (open) {
      setDone(null)
      setStep(0)
      setForm(
        initial || {
          name: '',
          delay_category: 'other',
          default_severity: 'medium',
          tags: [],
          status: 'draft',
          is_draft: false,
        }
      )
    }
  }, [open, initial])

  if (!open) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function save(asDraft) {
    if (!canEdit) return
    if (!accountId || !form.name?.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        organisation_id: accountId,
        name: form.name,
        delay_category: form.delay_category,
        delay_cause: form.delay_cause,
        responsible_party: form.responsible_party,
        default_severity: form.default_severity,
        resolution_plan_template: form.resolution_plan_template,
        tags: Array.isArray(form.tags) ? form.tags : (form.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
        status: asDraft ? 'draft' : (form.status || 'active'),
        is_draft: !!asDraft,
        draft_expires_at: form.draft_expires_at,
        created_by: form.id ? undefined : userId,
      }
      let res
      if (form.id) res = await svc.updateDelayTemplate(form.id, payload)
      else res = await svc.createDelayTemplate(payload)
      setDone(res.name)
      toast.success(`Saved template ${res.name}`)
      onSaved?.(res)
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 text-slate-100">
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit template' : 'New template'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-2 flex gap-2">
          <button type="button" className={`text-xs px-2 py-1 rounded ${step === 0 ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setStep(0)}>1. Info</button>
          <button type="button" className={`text-xs px-2 py-1 rounded ${step === 1 ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => setStep(1)}>2. Content</button>
        </div>
        {done && (
          <div className="mx-4 mb-2 rounded bg-emerald-900/40 border border-emerald-700/50 px-3 py-2 text-sm">
            Saved template <strong>{done}</strong>
          </div>
        )}
        <div className="px-4 pb-4 space-y-3">
          {step === 0 && (
            <>
              <label className="block text-sm">
                Name *
                <input className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={form.name || ''} disabled={!canEdit} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label className="block text-sm">
                Category
                <select className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={form.delay_category || 'other'} disabled={!canEdit} onChange={(e) => set('delay_category', e.target.value)}>
                  {DELAY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Default severity
                <select className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={form.default_severity || 'medium'} disabled={!canEdit} onChange={(e) => set('default_severity', e.target.value)}>
                  {DELAY_SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Tags (comma-separated)
                <input className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags || ''} disabled={!canEdit} onChange={(e) => set('tags', e.target.value)} />
              </label>
              <label className="block text-sm">
                Status
                <select className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={form.status || 'draft'} disabled={!canEdit} onChange={(e) => set('status', e.target.value)}>
                  {TEMPLATE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label className="block text-sm">
                Typical delay cause
                <textarea className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" rows={3} value={form.delay_cause || ''} disabled={!canEdit} onChange={(e) => set('delay_cause', e.target.value)} />
              </label>
              <label className="block text-sm">
                Responsible party (typical)
                <input className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" value={form.responsible_party || ''} disabled={!canEdit} onChange={(e) => set('responsible_party', e.target.value)} />
              </label>
              <label className="block text-sm">
                Resolution plan template
                <textarea className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2" rows={4} value={form.resolution_plan_template || ''} disabled={!canEdit} onChange={(e) => set('resolution_plan_template', e.target.value)} />
              </label>
            </>
          )}
          {canEdit && (
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={saving} onClick={() => save(true)} className="px-3 py-2 rounded-lg bg-slate-700 text-sm">Save draft</button>
              <button type="button" disabled={saving} onClick={() => save(false)} className="px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
