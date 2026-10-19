/**
 * v1272 — Organisation AI Settings (PRD stories 9, 10, 11; D6, D7, D8, D16a, D18).
 * Routed page (rule 65) in Platform, Simulator and Planner; settings are organisation-wide and
 * live in public.ai_settings, so this always uses platformDb.
 *
 *   - AI data-processing notice + one-click acceptance (Account Owner / PMO Admin)
 *   - AI on/off, retention periods within the Admin minimum/maximum, report language
 *   - usage meter for the current credit period
 *   - Audit details tab (rule 63.1)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import {
  acceptAiConsent,
  getAiStatus,
  getOrgAiSettingsRow,
  listAiLanguages,
  previewPurge,
  updateOrgAiSettings,
} from '@nidus/shared/services/askNidusService'
import DetailAuditTabList from '../DetailAuditTabList.jsx'
import AuditDetailsPanel from '../AuditDetailsPanel.jsx'
import AuditCard from '../AuditCard.jsx'
import AuditField from '../AuditField.jsx'

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '')

export default function AiSettingsPage() {
  const [tab, setTab] = useState('details')
  const [status, setStatus] = useState(null)
  const [row, setRow] = useState(null)
  const [languages, setLanguages] = useState([])
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { showSuccess, modal } = useSuccessModal()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const s = await getAiStatus(platformDb)
      setStatus(s)
      const [r, langs] = await Promise.all([
        s?.account_id ? getOrgAiSettingsRow(platformDb, s.account_id) : null,
        listAiLanguages(platformDb),
      ])
      setRow(r)
      setLanguages(langs)
      setForm({
        aiEnabled: Boolean(s?.ai_enabled),
        conversationMonths: s?.conversation_retention_months ?? 12,
        auditMonths: s?.audit_retention_months ?? 24,
        reportLanguageCode: s?.report_language_code || '',
      })
    } catch (e) {
      setError(e?.message || 'AI settings could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const original = useMemo(() => status && ({
    aiEnabled: Boolean(status.ai_enabled),
    conversationMonths: status.conversation_retention_months,
    auditMonths: status.audit_retention_months,
    reportLanguageCode: status.report_language_code || '',
  }), [status])
  const isDirty = Boolean(form && original && JSON.stringify(form) !== JSON.stringify(original))
  useUnsavedChangesGuard(isDirty)

  const canManage = Boolean(status?.can_manage)
  const lockedRetention = Boolean(status?.retention_admin_override)
  const min = status?.retention_min_months ?? 1
  const max = status?.retention_max_months ?? 60

  const accept = async () => {
    setSaving(true)
    setError('')
    try {
      const s = await acceptAiConsent(platformDb, status.account_id)
      setStatus(s)
      setForm((f) => ({ ...f, aiEnabled: true }))
      showSuccess({ recordId: 'AI settings', subject: 'AI notice', operation: 'updated', message: 'AI is now switched on for your organisation.' })
      load()
    } catch (e) {
      setError(e?.message || 'Could not record your acceptance.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    setError('')
    const months = Number(form.conversationMonths)
    const audit = Number(form.auditMonths)
    if (!lockedRetention && (months < min || months > max || audit < min || audit > max)) {
      setError(`Retention periods must be between ${min} and ${max} months.`)
      return
    }
    if (!lockedRetention && months < Number(original.conversationMonths)) {
      const count = await previewPurge(platformDb, status.account_id, months).catch(() => 0)
      if (count > 0 && !window.confirm(`${count} conversation(s) are older than ${months} months and will be deleted at the next daily clean-up. Continue?`)) return
    }
    setSaving(true)
    try {
      const s = await updateOrgAiSettings(platformDb, {
        accountId: status.account_id,
        aiEnabled: form.aiEnabled,
        conversationMonths: lockedRetention ? status.conversation_retention_months : months,
        auditMonths: lockedRetention ? status.audit_retention_months : audit,
        reportLanguageCode: form.reportLanguageCode || null,
      })
      setStatus(s)
      showSuccess({ recordId: 'AI settings', subject: 'Organisation AI settings', operation: 'updated' })
      load()
    } catch (e) {
      setError(e?.message || 'Could not save the AI settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-gray-500 dark:text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading AI settings…</div>
  }

  const pct = Math.min(Number(status?.percent) || 0, 100)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" /> AI Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Control Ask Nidus and the AI assistants for your whole organisation.</p>
      </div>

      <DetailAuditTabList activeTab={tab} onChange={setTab} ariaLabel="AI settings sections" />

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

      {tab === 'details' && status && form && (
        <div className="space-y-4">
          {!status.consent_accepted && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" /> AI data-processing notice
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
                <li>When someone asks Ask Nidus a question, the question and only the records needed to answer it are sent to our AI provider (Anthropic) to write the answer.</li>
                <li>AI only sees records the person asking is already allowed to see.</li>
                <li>Your data is not used to train AI models.</li>
                <li>Conversations are kept for {status.conversation_retention_months} months and usage records for {status.audit_retention_months} months, then deleted. You can change this below.</li>
                <li>Meeting recordings sent for transcription are processed by our transcription provider (OpenAI Whisper).</li>
                <li>You can switch AI off for your organisation at any time.</li>
              </ul>
              {canManage ? (
                <button type="button" onClick={accept} disabled={saving} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Accept and turn on AI'}
                </button>
              ) : (
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Only {status.owner_name || 'your Account Owner'} or a PMO Admin can accept this notice.</p>
              )}
            </section>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Usage this period</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {Number(status.used || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} of {Number(status.allowance || 0).toLocaleString()} AI credits used
              {status.period_end ? ` · renews ${new Date(status.period_end).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI credits used">
              <div className={`h-full ${pct >= 100 ? 'bg-red-600' : pct >= (status.warn_percent || 80) ? 'bg-yellow-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
            </div>
            {status.reason === 'kill_switch' && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">AI is temporarily switched off for everyone by the system administrator.</p>}
            {status.reason === 'admin_disabled' && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">The system administrator has switched AI off for your organisation.</p>}
          </section>

          <fieldset disabled={!canManage || saving} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <legend className="px-1 text-base font-semibold text-gray-900 dark:text-gray-100">Settings</legend>
            {!canManage && <p className="text-sm text-gray-600 dark:text-gray-400">Only the Account Owner or a PMO Admin can change these settings.</p>}

            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.aiEnabled} disabled={!status.consent_accepted}
                onChange={(e) => setForm((f) => ({ ...f, aiEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-600" />
              <span className="text-sm text-gray-800 dark:text-gray-100">AI features are on for my organisation</span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ai-conv-months" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Keep conversations for (months)</label>
                <input id="ai-conv-months" type="number" min={min} max={max} value={form.conversationMonths} disabled={lockedRetention}
                  onChange={(e) => setForm((f) => ({ ...f, conversationMonths: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label htmlFor="ai-audit-months" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Keep usage records for (months)</label>
                <input id="ai-audit-months" type="number" min={min} max={max} value={form.auditMonths} disabled={lockedRetention}
                  onChange={(e) => setForm((f) => ({ ...f, auditMonths: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {lockedRetention ? 'Retention for your organisation is set by the system administrator.' : `Allowed range: ${min}–${max} months. Usage records keep who used AI and how much, without the questions or answers.`}
            </p>

            <div>
              <label htmlFor="ai-report-lang" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Language for AI-drafted reports</label>
              <select id="ai-report-lang" value={form.reportLanguageCode} onChange={(e) => setForm((f) => ({ ...f, reportLanguageCode: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-72">
                <option value="">Each person's own language</option>
                {languages.map((l) => <option key={l.code} value={l.code}>{l.name}{l.native_name && l.native_name !== l.name ? ` (${l.native_name})` : ''}</option>)}
              </select>
            </div>

            {canManage && (
              <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <button type="button" onClick={() => setForm(original)} disabled={!isDirty} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200">Cancel</button>
                <button type="button" onClick={save} disabled={!isDirty || saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            )}
          </fieldset>
        </div>
      )}

      {tab === 'audit' && (
        row ? (
          <AuditDetailsPanel>
            <AuditCard title="Identity">
              <AuditField label="Record" value="Organisation AI settings" />
              <AuditField label="Organisation" value={status?.owner_name ? `Owned by ${status.owner_name}` : null} />
            </AuditCard>
            <AuditCard title="Classification">
              <AuditField label="AI notice accepted by" value={status?.consent_accepted_by} />
              <AuditField label="AI notice accepted on" value={fmtDate(row.data_privacy_accepted_at)} />
              <AuditField label="Retention set by administrator" value={lockedRetention ? 'Yes' : 'No'} />
            </AuditCard>
            <AuditCard title="Record history">
              <AuditField label="Created" value={fmtDate(row.created_at)} />
              <AuditField label="Last updated" value={fmtDate(row.updated_at)} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
        )
      )}
      {modal}
    </div>
  )
}
