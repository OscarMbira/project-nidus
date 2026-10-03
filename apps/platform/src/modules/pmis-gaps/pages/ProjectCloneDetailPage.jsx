/**
 * Project Clone Job — read-only detail (GAP-22, v963 Phase 16). Jobs are not user-editable once
 * started (status is system-managed), so there is no edit mode — just view + Audit tab.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy } from 'lucide-react'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { getCloneJob } from '../services/projectCloneService'

const STATUS_BADGE = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  running: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
}

export default function ProjectCloneDetailPage({ basePath = '/pmo/admin/project-clone' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  const load = useCallback(async () => {
    setLoading(true)
    const row = await getCloneJob(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setJob(row)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const goToList = () => navigate(basePath)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading clone job…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Clone job not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Project Cloning</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={goToList} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Copy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clone Job</h1>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[job.job_status] || STATUS_BADGE.pending}`}>{job.job_status}</span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <div className="p-6 space-y-4">
            {job.job_status === 'failed' && job.error_message && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                {job.error_message}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Source project</div>
                <div className="font-mono text-xs text-gray-900 dark:text-gray-100">{job.source_project_id}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Target project</div>
                <div className="font-mono text-xs text-gray-900 dark:text-gray-100">{job.target_project_id || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Date shift</div>
                <div className="text-gray-900 dark:text-gray-100">{job.date_shift_days || 0} days</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Cloned entities</div>
                <div className="text-gray-900 dark:text-gray-100">
                  Project core{job.clone_options?.includeTasks ? ', Tasks' : ''}
                </div>
              </div>
              {job.target_project_id && (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/pm/dashboard?projectId=${job.target_project_id}`)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Open cloned project →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <AuditDetailsPanel description="Who started this clone, and its outcome.">
              <AuditCard title="Identity" description="Which project this job cloned.">
                <AuditField label="Source project" value={job.source_project_id} />
                <AuditField label="Target project" value={job.target_project_id || 'Not created (failed before completion)'} />
              </AuditCard>
              <AuditCard title="Classification" description="What this job configured.">
                <AuditField label="Status" value={job.job_status} />
                <AuditField label="Date shift" value={`${job.date_shift_days || 0} days`} />
              </AuditCard>
              <AuditCard title="Record history" description="When this job ran.">
                <AuditTimestampPair dateLabel="Created at" value={job.created_at} />
                <AuditTimestampPair dateLabel="Started at" value={job.started_at} />
                <AuditTimestampPair dateLabel="Completed at" value={job.completed_at} />
              </AuditCard>
            </AuditDetailsPanel>
          </div>
        )}
      </div>
    </div>
  )
}
