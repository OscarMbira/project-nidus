/**
 * Reminder Lead Times (v1352 Slice 1, 1.3a / PRD D7) — PMO Configuration.
 * How many days before a review, due date or sign-off people get their reminder, per record type.
 * Record types, defaults and texts come from the database (public.reminder_record_types, rule 25.1);
 * an empty value means "use the default". Only PMO Admins and the account owner can save.
 * Route: /platform/pmo-admin/reminder-lead-times
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import {
  countOverrides, effectiveLeadDays, leadDaysError, leadTimeChanges, leadTimeFormFromItems,
} from '@nidus/shared/utils/reminderLeadTimes'
import { getReminderLeadTimes, saveReminderLeadTimes } from '../../services/reminderLeadTimeService'

const inputClass = 'w-28 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

function ReminderLeadTimesBody() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})

  const items = useMemo(() => data?.items || [], [data])
  const canManage = Boolean(data?.can_manage)
  const changes = useMemo(() => leadTimeChanges(items, form), [items, form])
  const errors = useMemo(() => Object.fromEntries(Object.entries(form).map(([k, v]) => [k, leadDaysError(v)])), [form])
  const hasErrors = Object.values(errors).some(Boolean)
  useUnsavedChangesGuard(canManage && changes.length > 0)

  useEffect(() => {
    let cancelled = false
    getReminderLeadTimes()
      .then((next) => {
        if (cancelled) return
        setData(next)
        setForm(leadTimeFormFromItems(next?.items))
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Could not load reminder lead times') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!canManage || changes.length === 0 || hasErrors) return
    setSaving(true)
    try {
      const next = await saveReminderLeadTimes(changes)
      setData(next)
      setForm(leadTimeFormFromItems(next?.items))
      showSuccess({
        recordId: next?.account_code || next?.account_name || 'Organisation',
        operation: 'updated',
        message: `Reminder lead times saved (${changes.length} ${changes.length === 1 ? 'change' : 'changes'}).`,
      })
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button type="button" onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reminder Lead Times</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
          How many days before a date people get their reminder. A second reminder follows once if the date passes.
          Reminders show in the app; email arrives once a day as a summary.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!error && (
          <>
            <div className="mb-6">
              <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {activeTab === 'details' ? (
              <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {!canManage && (
                  <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    You can view these lead times, but only a PMO Admin or the account owner can change them.
                  </div>
                )}
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No reminder types are set up yet.</p>
                ) : (
                  <fieldset disabled={!canManage} className="space-y-4 disabled:opacity-70">
                    {items.map((item) => {
                      const id = `lead-${item.record_type}`
                      const err = errors[item.record_type]
                      return (
                        <div key={item.record_type} className="flex flex-col sm:flex-row sm:items-start gap-3 border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                          <div className="flex-1 min-w-0">
                            <FieldLabelWithHelp helpKey="public.reminder_lead_time_settings.lead_days" htmlFor={id}
                              className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.label}
                            </FieldLabelWithHelp>
                            {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>}
                          </div>
                          <div className="sm:w-56">
                            <div className="flex items-center gap-2">
                              <input id={id} type="number" inputMode="numeric" min="0" max="365" step="1"
                                value={form[item.record_type] ?? ''}
                                placeholder={String(item.default_lead_days)}
                                aria-invalid={Boolean(err)}
                                onChange={(e) => setForm((f) => ({ ...f, [item.record_type]: e.target.value }))}
                                className={`${inputClass} ${err ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                              <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
                              {canManage && (form[item.record_type] ?? '') !== '' && (
                                <button type="button" title="Use the default" aria-label={`Use the default for ${item.label}`}
                                  onClick={() => setForm((f) => ({ ...f, [item.record_type]: '' }))}
                                  className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${err ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {err || `Default ${item.default_lead_days} · in use ${effectiveLeadDays(item, form[item.record_type])}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {canManage && (
                      <div className="flex items-center gap-3 pt-2">
                        <button type="submit" disabled={saving || changes.length === 0 || hasErrors}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </fieldset>
                )}
              </form>
            ) : (
              <AuditDetailsPanel description="Who set this organisation’s reminder lead times and when.">
                <AuditCard title="Identity" description="Whose settings these are.">
                  <AuditField label="Organisation" value={data?.account_name} />
                  <AuditField label="Account code" value={data?.account_code} />
                  <AuditField label="Settings" value="Reminder lead times" />
                </AuditCard>
                <AuditCard title="Classification" description="What the settings cover.">
                  <AuditField label="Scope" value="Organisation" />
                  <AuditField label="Reminder types" value={items.length} />
                  <AuditField label="Changed from the default" value={countOverrides(items)} />
                </AuditCard>
                <AuditCard title="Record history" description="When these settings were first set and last changed.">
                  {data?.created_at ? (
                    <>
                      <AuditTimestampPair dateLabel="Created at" value={data.created_at} />
                      <AuditField label="Created by" value={data.created_by_name} />
                      <AuditTimestampPair dateLabel="Last updated" value={data.updated_at} />
                      <AuditField label="Last updated by" value={data.updated_by_name} />
                    </>
                  ) : (
                    <AuditField label="History" value="Audit details appear after the first lead time is saved." />
                  )}
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </>
        )}
      </div>
      {modal}
    </div>
  )
}

// v1352 rule 76: field help for this page (public.reminder_lead_time_settings.<column>).
const HELP_KEYS = ['lead_days'].map((name) => `public.reminder_lead_time_settings.${name}`)

export default function ReminderLeadTimes(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ReminderLeadTimesBody {...props} />
    </FieldHelpScope>
  )
}
