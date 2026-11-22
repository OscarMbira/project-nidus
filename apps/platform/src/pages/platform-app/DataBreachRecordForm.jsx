/**
 * Data breach record — create/edit (v1108). Routed non-modal page (rule 65) reached from
 * DataManagementAdmin.jsx's "Log Breach" button and its Breach Records list rows.
 * Routes: /platform/pmo-admin/data-management/breaches/new
 *         /platform/pmo-admin/data-management/breaches/:id/edit
 */
import { useState, useEffect } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels, humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'
import { createDataBreachRecord, updateDataBreachRecord } from '../../services/gdprService'

const SEVERITIES = ['low', 'medium', 'high', 'critical']
const STATUSES = ['detected', 'investigating', 'contained', 'remediated', 'closed']
const listPath = '/platform/pmo-admin/data-management'

function DataBreachRecordFormBody() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { showSuccess, modal } = useSuccessModal()

  const [formTab, setFormTab] = useState('details')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [record, setRecord] = useState(null)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const [breachType, setBreachType] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [status, setStatus] = useState('detected')
  const [affectedUsersCount, setAffectedUsersCount] = useState('')
  const [dataTypesAffected, setDataTypesAffected] = useState('')
  const [mitigationSteps, setMitigationSteps] = useState('')

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await platformDb.from('data_breach_records').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (error || !data) {
        toast.error('Failed to load breach record')
        navigate(listPath)
        return
      }
      setRecord(data)
      setBreachType(data.breach_type || '')
      setSeverity(data.severity || 'medium')
      setStatus(data.status || 'detected')
      setAffectedUsersCount(String(data.affected_users_count ?? ''))
      setDataTypesAffected((data.data_types_affected || []).join(', '))
      setMitigationSteps(data.mitigation_steps || '')
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, isEdit, navigate])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!breachType.trim()) {
      toast.error('Breach type is required')
      return
    }
    setSaving(true)
    try {
      const dataTypes = dataTypesAffected.split(',').map((s) => s.trim()).filter(Boolean)
      if (isEdit) {
        const res = await updateDataBreachRecord(id, {
          status,
          mitigation_steps: mitigationSteps,
        })
        if (!res.success) {
          toast.error(res.message || 'Failed to update breach record')
          return
        }
        showSuccess({
          recordId: res.data.breach_number,
          operation: 'updated',
          message: 'Data breach record updated.',
          onOk: () => navigate(listPath),
        })
      } else {
        const res = await createDataBreachRecord({
          breach_type: breachType,
          severity,
          affected_users: [],
          data_types_affected: dataTypes,
        })
        if (!res.success) {
          toast.error(res.message || 'Failed to log breach record')
          return
        }
        if (affectedUsersCount || mitigationSteps) {
          await updateDataBreachRecord(res.data.id, { mitigation_steps: mitigationSteps || undefined })
        }
        showSuccess({
          recordId: res.data.breach_number,
          operation: 'created',
          message: 'Data breach record logged.',
          onOk: () => navigate(listPath),
        })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <button
        type="button"
        onClick={() => navigate(listPath)}
        className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Data Management
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
        <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" />
        {isEdit ? `Breach Record ${record?.breach_number || ''}` : 'Log Data Breach'}
      </h1>

      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' ? (
        <AuditDetailsPanel description="Who logged and last updated this breach record.">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
          ) : (
            <>
              <AuditCard title="Identity" description="How this breach is labelled.">
                <AuditField label="Breach number" value={record.breach_number} />
                <AuditField label="Type" value={record.breach_type} />
              </AuditCard>
              <AuditCard title="Classification" description="Current severity and status.">
                <AuditField label="Severity" value={humanizeAuditToken(record.severity)} />
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this record was created and last changed.">
                <AuditField label="Logged by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Detected at" value={record.breach_detected_at} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </>
          )}
        </AuditDetailsPanel>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div>
            <FieldLabelWithHelp helpKey="public.data_breach_records.breach_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>Breach type *</FieldLabelWithHelp>
            <input
              type="text"
              required
              disabled={isEdit}
              value={breachType}
              onChange={(e) => setBreachType(e.target.value)}
              placeholder="e.g. Unauthorized access, Data leak, Lost device"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.data_breach_records.severity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</FieldLabelWithHelp>
              <select
                disabled={isEdit}
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white capitalize disabled:opacity-60"
              >
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <FieldLabelWithHelp helpKey="public.data_breach_records.status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</FieldLabelWithHelp>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white capitalize"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <FieldLabelWithHelp helpKey="public.data_breach_records.data_types_affected" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data types affected</FieldLabelWithHelp>
            <input
              type="text"
              disabled={isEdit}
              value={dataTypesAffected}
              onChange={(e) => setDataTypesAffected(e.target.value)}
              placeholder="Comma-separated, e.g. email, phone number, project data"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
            />
          </div>

          <div>
            <FieldLabelWithHelp helpKey="public.data_breach_records.mitigation_steps" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mitigation steps</FieldLabelWithHelp>
            <textarea
              rows={4}
              value={mitigationSteps}
              onChange={(e) => setMitigationSteps(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate(listPath)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Breach'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// v1345 slice 4: field help for this component (public.data_breach_records.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'breach_type', 'severity', 'status', 'data_types_affected', 'mitigation_steps',
].map((name) => `public.data_breach_records.${name}`)

export default function DataBreachRecordForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <DataBreachRecordFormBody {...props} />
    </FieldHelpScope>
  )
}
