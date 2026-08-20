import { useState, useEffect } from 'react'
import { X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import SmartAmountInput from '@nidus/ui/SmartAmountInput'
import DelayOwnerHistory from '../../components/delays/DelayOwnerHistory'
import { DELAY_CATEGORIES, DELAY_SEVERITIES, DELAY_STATUSES } from '@nidus/shared/constants/delayConstants'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

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
  variant = 'modal',
}) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [doneRef, setDoneRef] = useState(null)
  const [form, setForm] = useState(() => initial || {})
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (open) {
      setStep(0)
      setDoneRef(null)
      setForm(initial || {})
      setFormTab('details')
    }
  }, [open, initial])

  useEffect(() => {
    if (formTab !== 'audit' || !form?.id) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [form.created_by, form.resolution_owner_id])
      setAuditUserLabels(labels)
    })()
  }, [formTab, form?.id, form?.created_by, form?.resolution_owner_id])

  if (!open) return null

  const auto = form.is_auto_linked
  const write = !readOnly
  const formTitle = !form.id ? 'Log delay' : readOnly ? 'View delay' : 'Edit delay'

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const fieldClass =
    'mt-1 w-full rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100 disabled:opacity-60'

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

  const panel = (
      <div
        className={`w-full overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm ${
          variant === 'page' ? 'max-w-4xl' : 'max-w-lg max-h-[90vh] shadow-xl'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{formTitle}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
        </div>

        {formTab === 'audit' && (
          <div className="px-4 py-4">
            {!form.id ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this delay is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who logged or changed this delay, and how it is classified.">
                <AuditCard title="Identity" description="How this delay is labelled and tracked.">
                  <AuditField label="Reference" value={form.delay_reference} />
                  <AuditField label="Title" value={form.title} />
                  <AuditField label="Status" value={humanizeAuditToken(form.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="How this delay is categorised.">
                  <AuditField label="Category" value={humanizeAuditToken(form.delay_category)} />
                  <AuditField label="Severity" value={humanizeAuditToken(form.severity)} />
                  <AuditField label="Resolution owner" value={form.resolution_owner_id ? auditUserLabels[form.resolution_owner_id] || null : null} />
                </AuditCard>
                <AuditCard title="Record history" description="When this delay was logged and last changed.">
                  <AuditField label="Created by" value={form.created_by ? auditUserLabels[form.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={form.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={form.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
            {form.id && fetchOwnerHistory && (
              <div className="mt-4">
                <DelayOwnerHistory delayId={form.id} fetchHistory={fetchOwnerHistory} />
              </div>
            )}
          </div>
        )}

        {formTab === 'details' && (
        <>
        <div className="px-4 py-3 flex gap-1 flex-wrap">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`text-xs px-2 py-1 rounded ${step === i ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {doneRef && (
          <div className="mx-4 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            Success — reference <strong>{doneRef}</strong>
          </div>
        )}

        <div className="px-4 pb-4 space-y-3">
          {step === 0 && (
            <>
              <label className="block text-sm">
                Title *
                <input
                  className={fieldClass}
                  value={form.title || ''}
                  disabled={!write}
                  onChange={(e) => set('title', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Category
                <select
                  className={fieldClass}
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
                  className={fieldClass}
                  value={form.responsible_party || ''}
                  disabled={!write}
                  onChange={(e) => set('responsible_party', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Identified date
                <input
                  type="date"
                  className={fieldClass}
                  value={form.identified_date || ''}
                  disabled={!write}
                  onChange={(e) => set('identified_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Severity
                <select
                  className={fieldClass}
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
                    className={fieldClass}
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
                  className={fieldClass}
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
                  inputClassName={fieldClass}
                />
              </div>
              <label className="block text-sm">
                Scope impact
                <textarea
                  className={fieldClass}
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
                  className={fieldClass}
                  value={form.original_baseline_date || ''}
                  disabled={!write}
                  onChange={(e) => set('original_baseline_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Revised forecast date
                <input
                  type="date"
                  className={fieldClass}
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
                  className={fieldClass}
                  rows={3}
                  value={form.resolution_plan || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_plan', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Resolution owner (user id)
                <input
                  className={`${fieldClass} font-mono text-xs`}
                  value={form.resolution_owner_id || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_owner_id', e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                Resolution target date
                <input
                  type="date"
                  className={fieldClass}
                  value={form.resolution_target_date || ''}
                  disabled={!write}
                  onChange={(e) => set('resolution_target_date', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Status
                <select
                  className={fieldClass}
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
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
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
                          className={`${fieldClass} font-mono text-xs`}
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

          {write && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                disabled={saving}
                onClick={() => submit('draft')}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
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
        </>
        )}
      </div>
  )

  if (variant === 'page') {
    return <div className="mt-2">{panel}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      {panel}
    </div>
  )
}
