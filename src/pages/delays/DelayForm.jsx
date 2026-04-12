import { useState, useEffect } from 'react'
import { X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import SmartAmountInput from '../../components/ui/SmartAmountInput'
import DelayOwnerHistory from '../../components/delays/DelayOwnerHistory'
import { DELAY_CATEGORIES, DELAY_SEVERITIES, DELAY_STATUSES } from '../../constants/delayConstants'

const STEPS = ['Basic', 'Impact', 'Resolution', 'Links']

export default function DelayForm({
  open,
  onClose,
  onSaved,
  initial,
  userId,
  isSim,
  readOnly,
  saveFns,
  fetchOwnerHistory,
}) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [doneRef, setDoneRef] = useState(null)
  const [form, setForm] = useState(() => initial || {})

  useEffect(() => {
    if (open) {
      setStep(0)
      setDoneRef(null)
      setForm(initial || {})
    }
  }, [open, initial])

  if (!open) return null

  const auto = form.is_auto_linked
  const write = !readOnly

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(finalStatus = 'submit') {
    if (!write) return
    if (!form.title?.trim()) {
      toast.error('Title is required')
      return
    }
    const pidKey = isSim ? 'practice_project_id' : 'project_id'
    if (!form[pidKey]) {
      toast.error('Project is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        created_by: form.id ? form.created_by : userId,
        is_draft: finalStatus === 'draft',
        draft_expires_at: finalStatus === 'draft' ? form.draft_expires_at : null,
      }
      let res
      if (form.id) {
        res = await saveFns.update(form.id, payload, form)
      } else {
        res = await saveFns.create(payload)
      }
      setDoneRef(res.delay_reference || res.id)
      toast.success(`Saved ${res.delay_reference || 'delay'}`)
      onSaved?.(res)
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 text-slate-100 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit delay' : 'Log delay'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3 flex gap-1 flex-wrap">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`text-xs px-2 py-1 rounded ${step === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {doneRef && (
          <div className="mx-4 mb-3 rounded-lg bg-emerald-900/40 border border-emerald-700/50 px-3 py-2 text-sm">
            Success — reference <strong>{doneRef}</strong>
          </div>
        )}

        <div className="px-4 pb-4 space-y-3">
          {step === 0 && (
            <>
              <label className="block text-sm">
                Title *
                <input
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.title || ''}
                  disabled={!write}
                  onChange={(e) => set('title', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Category
                <select
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.delay_category || 'other'}
                  disabled={!write}
                  onChange={(e) => set('delay_category', e.target.value)}
                >
                  {DELAY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Responsible party
                <input
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.responsible_party || ''}
                  disabled={!write}
                  onChange={(e) => set('responsible_party', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Identified date
                <input
                  type="date"
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.identified_date || ''}
                  disabled={!write}
                  onChange={(e) => set('identified_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Severity
                <select
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.severity || 'medium'}
                  disabled={!write}
                  onChange={(e) => set('severity', e.target.value)}
                >
                  {DELAY_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {form.source_type === 'from_template' && (
                <label className="block text-sm">
                  Tailoring notes
                  <textarea
                    className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                    rows={2}
                    value={form.tailoring_notes || ''}
                    disabled={!write}
                    onChange={(e) => set('tailoring_notes', e.target.value)}
                  />
                </label>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <label className="block text-sm">
                Schedule impact (days)
                <input
                  type="number"
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.impact_schedule_days ?? ''}
                  disabled={!write}
                  onChange={(e) => set('impact_schedule_days', e.target.value ? Number(e.target.value) : null)}
                />
              </label>
              <div className="text-sm">
                Cost impact
                <SmartAmountInput
                  value={form.impact_cost != null ? Number(form.impact_cost) : null}
                  onChange={(n) => set('impact_cost', n)}
                  disabled={!write}
                  inputClassName="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
                />
              </div>
              <label className="block text-sm">
                Scope impact
                <textarea
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  rows={2}
                  value={form.impact_scope || ''}
                  disabled={!write}
                  onChange={(e) => set('impact_scope', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Original baseline date
                <input
                  type="date"
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.original_baseline_date || ''}
                  disabled={!write}
                  onChange={(e) => set('original_baseline_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Revised forecast date
                <input
                  type="date"
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.revised_forecast_date || ''}
                  disabled={!write}
                  onChange={(e) => set('revised_forecast_date', e.target.value)}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <label className="block text-sm">
                Resolution plan
                <textarea
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  rows={3}
                  value={form.resolution_plan || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_plan', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Resolution owner (user id)
                <input
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2 font-mono text-xs"
                  value={form.resolution_owner_id || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_owner_id', e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                Resolution target date
                <input
                  type="date"
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.resolution_target_date || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_target_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Status
                <select
                  className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2"
                  value={form.status || 'identified'}
                  disabled={!write}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {DELAY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              {auto ? (
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Links are auto-managed for this delay.
                </p>
              ) : (
                <>
                  {['linked_issue_id', 'linked_risk_id', 'linked_defect_id', 'linked_work_package_id', 'linked_change_request_id'].map(
                    (k) => (
                      <label key={k} className="block text-sm">
                        {k.replace(/_/g, ' ')}
                        <input
                          className="mt-1 w-full rounded bg-slate-800 border border-slate-600 px-3 py-2 font-mono text-xs"
                          value={form[k] || ''}
                          disabled={!write}
                          onChange={(e) => set(k, e.target.value || null)}
                        />
                      </label>
                    )
                  )}
                </>
              )}
            </>
          )}

          {form.id && fetchOwnerHistory && (
            <DelayOwnerHistory delayId={form.id} fetchHistory={fetchOwnerHistory} />
          )}

          {write && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                disabled={saving}
                onClick={() => submit('draft')}
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm"
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => submit('submit')}
                className="px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
