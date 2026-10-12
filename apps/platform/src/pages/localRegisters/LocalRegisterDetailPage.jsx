/**
 * Local Register Engine — generic detail/view page (v931), with the mandatory Details/Audit
 * tab pair per CLAUDE.md rule 63.1 (this is a record-CRUD form like any other register).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, ShieldCheck } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import RecordStatusBadge from '@nidus/ui/RecordStatusBadge'
import AuthorisationRequestModal from '@nidus/ui/AuthorisationRequestModal'
import { useToast } from '@nidus/shared/hooks/useToast'
import { getRegisterDefinition } from '../../services/localRegisterService'
import {
  getRecord,
  getRecordApprovalChain,
  submitRecordForAuthorisation,
} from '../../services/localRegisterRecordService'
import { supabase } from '../../services/supabaseClient'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'

function fieldValueToText(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field.field_type === 'boolean') return value ? 'Yes' : 'No'
  if (field.field_type === 'currency') return `$${Number(value).toLocaleString()}`
  return String(value)
}

export default function LocalRegisterDetailPage() {
  const { registerId, recordId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [register, setRegister] = useState(null)
  const [record, setRecord] = useState(null)
  const [userLabels, setUserLabels] = useState({})
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [approvalChain, setApprovalChain] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [registerResult, recordResult] = await Promise.all([
        getRegisterDefinition(registerId),
        getRecord(recordId),
      ])
      if (cancelled) return
      setRegister(registerResult.data)
      setRecord(recordResult.data)

      // Self-correct a raw-UUID register segment to the friendly register_key (rule 16.3).
      if (
        registerResult.data?.register_key &&
        isLikelyDatabaseUuid(registerId) &&
        registerId !== registerResult.data.register_key
      ) {
        navigate(`/platform/local-registers/${registerResult.data.register_key}/${recordId}`, { replace: true })
      }

      const userIds = [recordResult.data?.owner_user_id, recordResult.data?.created_by, recordResult.data?.updated_by]
        .filter(Boolean)
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, full_name').in('id', userIds)
        if (!cancelled && users) {
          setUserLabels(Object.fromEntries(users.map((u) => [u.id, u.full_name])))
        }
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [registerId, recordId])

  // "Decide" (approve/reject) is deliberately NOT built here — the existing generic
  // pmo/authorisation/queue and pm/authorisation/queue pages already list pending requests for
  // ANY table_name, local_register_records included, with zero changes needed to those pages
  // (rule 62 — reuse, don't duplicate). This only wires the "submit" side.
  const openSubmitModal = async () => {
    const chainResult = await getRecordApprovalChain(record.account_id, record.project_id)
    setApprovalChain(chainResult.data || [])
    setSubmitModalOpen(true)
  }

  const handleSubmitForAuthorisation = async (notes) => {
    setSubmitting(true)
    const result = await submitRecordForAuthorisation(record.id, notes)
    setSubmitting(false)
    setSubmitModalOpen(false)
    if (!result.success) {
      toast.error(result.error || 'Failed to submit for authorisation')
      return
    }
    toast.success('Submitted for authorisation.')
    const refreshed = await getRecord(recordId)
    setRecord(refreshed.data)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!register || !record) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Record not found.</div>
  }

  const routeKey = register.register_key || registerId
  const statusLabel = (register.status_workflow || []).find((s) => s.key === record.status)?.label || record.status

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {register.label}
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{record.title}</h1>
            {register.requires_approval && <RecordStatusBadge status={record.record_status} />}
          </div>
          {record.display_id && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{record.display_id}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {register.requires_approval && record.record_status === 'live' && (
            <button
              type="button"
              onClick={openSubmitModal}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <ShieldCheck className="h-4 w-4" />
              Submit for Authorisation
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/platform/local-registers/${routeKey}/${recordId}/edit`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel={`${register.label} sections`} />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              {statusLabel}
            </span>
          </div>
          {record.description && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{record.description}</p>
            </div>
          )}
          {(register.fields || []).map((field) => (
            <div key={field.id}>
              <p className="text-xs uppercase text-gray-400 mb-1">{field.field_label}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {fieldValueToText(field, record.field_values?.[field.field_key])}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this record.">
          <AuditCard title="Identity">
            <AuditField label="Display ID" value={record.display_id || '—'} />
            <AuditField label="Register" value={register.label} />
            <AuditField label="Status" value={statusLabel} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Scope" value={register.scope_level} />
            <AuditField label="Owner" value={userLabels[record.owner_user_id] || '—'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditField label="Created by" value={userLabels[record.created_by] || '—'} />
            <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
            <AuditField label="Updated by" value={userLabels[record.updated_by] || '—'} />
            <AuditTimestampPair dateLabel="Updated at" value={record.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {register.requires_approval && (
        <AuthorisationRequestModal
          open={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          onSubmit={handleSubmitForAuthorisation}
          chain={approvalChain}
          mode="submit"
          loading={submitting}
        />
      )}
    </div>
  )
}
