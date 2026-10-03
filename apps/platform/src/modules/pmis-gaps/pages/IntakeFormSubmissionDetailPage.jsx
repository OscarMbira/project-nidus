/**
 * Public Intake Forms (GAP-06) — single submission view. v963 Phase 9.
 * View-only for the submitted field values (submissions are created externally, via the
 * public form); the PM can only change the review status here. Audit tab per rule 63.1.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getSubmission, listSubmissionData, updateSubmissionStatus, listFields } from '../../../services/intakeFormService'

const STATUS_OPTIONS = ['received', 'processing', 'created', 'rejected', 'spam']

export default function IntakeFormSubmissionDetailPage({ sim = false }) {
  const { id, submissionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState(null)
  const [values, setValues] = useState([])
  const [fieldLabels, setFieldLabels] = useState({})
  const [activeTab, setActiveTab] = useState('details')

  const load = useCallback(async () => {
    setLoading(true)
    const sub = await getSubmission(submissionId, { sim })
    const [data, fields] = await Promise.all([
      listSubmissionData(submissionId, { sim }),
      sub?.form_id ? listFields(sub.form_id, { sim }) : Promise.resolve([]),
    ])
    setSubmission(sub)
    setValues(data)
    setFieldLabels(Object.fromEntries((fields || []).map((f) => [f.field_key, f.field_label])))
    setLoading(false)
  }, [submissionId, sim])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (status) => {
    await updateSubmissionStatus(submissionId, status, { sim })
    await load()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!submission) return <div className="p-8 text-gray-500 dark:text-gray-400">Submission not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate(id ? '..' : `../../${submission.form_id}/submissions`)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Submissions
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{submission.submitter_name || submission.submitter_email || 'Submission'}</h1>
        <select value={submission.submission_status} onChange={(e) => handleStatusChange(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Submission sections" />

      {activeTab === 'details' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Submitter email</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{submission.submitter_email || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Submitted</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Submitted values</h2>
            {values.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No field values recorded.</p>
            ) : (
              <dl className="divide-y divide-gray-100 dark:divide-gray-700">
                {values.map((v) => (
                  <div key={v.id} className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                    <dt className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-1">{fieldLabels[v.field_key] || v.field_key}</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 sm:col-span-2 whitespace-pre-wrap">{v.field_value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="Submission record metadata.">
          <AuditCard title="Identity">
            <AuditField label="Submitter" value={submission.submitter_name} />
            <AuditField label="Email" value={submission.submitter_email} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Status" value={submission.submission_status} />
            <AuditField label="Created entity" value={submission.created_entity_type} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Submitted at" value={submission.submitted_at} />
            <AuditTimestampPair dateLabel="Updated at" value={submission.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
