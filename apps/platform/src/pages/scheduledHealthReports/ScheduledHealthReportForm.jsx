/**
 * Scheduled Health Report — create/edit (v963 Phase 20, GAP-23).
 * Routes: .../reporting/scheduled/create, .../reporting/scheduled/:id/edit
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlanningProjectId } from '../../components/planning/PlanningProjectBar'
import { getSchedule, createSchedule, updateSchedule } from '../../services/scheduledHealthReportService'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly']

const emptyForm = { schedule_name: '', frequency: 'weekly', recipient_emails: '', is_active: true }

export default function ScheduledHealthReportForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const projectId = usePlanningProjectId()
  const isEdit = Boolean(id)
  const listPath = location.pathname.replace(/\/(create|[^/]+\/edit)$/, '')

  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const { showSuccess, modal: successModal } = useSuccessModal()

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      try {
        const row = await getSchedule(id)
        setExisting(row)
        setForm({
          schedule_name: row?.schedule_name || '',
          frequency: row?.frequency || 'weekly',
          recipient_emails: (row?.recipient_emails || []).join(', '),
          is_active: row?.is_active ?? true,
        })
      } catch (e) {
        setError(e?.message || 'Failed to load schedule')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  useEffect(() => {
    if (formTab !== 'audit' || !existing) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [existing.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, existing])

  const isDirty = useMemo(() => {
    const base = existing
      ? {
          schedule_name: existing.schedule_name || '',
          frequency: existing.frequency || 'weekly',
          recipient_emails: (existing.recipient_emails || []).join(', '),
          is_active: existing.is_active ?? true,
        }
      : emptyForm
    return JSON.stringify(form) !== JSON.stringify(base)
  }, [form, existing])

  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this scheduled report.')

  const handleBack = () => confirmDiscard(() => navigate(listPath))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.schedule_name.trim()) {
      setError('Schedule name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        schedule_name: form.schedule_name.trim(),
        frequency: form.frequency,
        recipient_emails: form.recipient_emails
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        is_active: form.is_active,
        ...(isEdit ? {} : { project_id: projectId }),
      }
      const saved = isEdit ? await updateSchedule(id, payload) : await createSchedule(payload)
      showSuccess({
        recordId: saved.schedule_name,
        operation: isEdit ? 'updated' : 'created',
        message: 'Scheduled health report saved.',
        onOk: () => navigate(`${listPath}/${saved.id}`),
      })
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {isEdit ? 'Edit Scheduled Health Report' : 'New Scheduled Health Report'}
      </h1>

      <div className="mb-4">
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      </div>

      {formTab === 'audit' ? (
        !existing ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this schedule is saved.</p>
        ) : (
          <AuditDetailsPanel description="How this schedule is configured and tracked.">
            <AuditCard title="Identity" description="Name and scope of this schedule.">
              <AuditField label="Schedule name" value={existing.schedule_name} />
              <AuditField label="Project" value={existing.project_id} />
            </AuditCard>
            <AuditCard title="Classification" description="Frequency and recipients.">
              <AuditField label="Frequency" value={humanizeAuditToken(existing.frequency)} />
              <AuditField label="Active" value={existing.is_active ? 'Yes' : 'No'} />
              <AuditField label="Recipients" value={(existing.recipient_emails || []).join(', ')} />
            </AuditCard>
            <AuditCard title="Record history" description="When this schedule was created and last changed.">
              <AuditField label="Created by" value={existing.created_by ? auditUserLabels[existing.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={existing.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={existing.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {error && <p className="text-red-600 dark:text-red-400" role="alert">{error}</p>}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule name *</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
              value={form.schedule_name}
              onChange={(e) => setForm((f) => ({ ...f, schedule_name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipient emails (comma-separated)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
              value={form.recipient_emails}
              onChange={(e) => setForm((f) => ({ ...f, recipient_emails: e.target.value }))}
              placeholder="pm@example.com, sponsor@example.com"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}
      {successModal}
    </div>
  )
}
