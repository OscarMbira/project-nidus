import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestExecutionRow from '../../components/testing/TestExecutionRow'
import TestExecutionProgressBar from '../../components/testing/TestExecutionProgressBar'
import AutoDefectAlert from '../../components/testing/AutoDefectAlert'
import { getTestRunById, getExecutionsByRun, updateExecution } from '../../services/testRunService'
import {
  listEvidenceForRun,
  uploadExecutionEvidence,
  softDeleteExecutionEvidence,
  getEvidenceRequirementSettings,
} from '../../services/testCaseExecutionEvidenceService'
import { useProjectRole } from '../../hooks/useProjectRole'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import {
  resolveTestEvidenceRequirement,
  canRemoveTestEvidence,
} from '@nidus/shared/utils/testEvidenceRequirement'

const CLOSED_RUN_STATUSES = new Set(['completed', 'cancelled', 'aborted'])

export default function TestRunExecute() {
  const { runId } = useParams()
  return (
    <TestingPageShell title="Execute test run" subtitle="Mark each case pass, fail, blocked, or skipped.">
      {() => <RunExecuteBody runId={runId} />}
    </TestingPageShell>
  )
}

function RunExecuteBody({ runId }) {
  const [run, setRun] = useState(null)
  const [execs, setExecs] = useState([])
  const [evidence, setEvidence] = useState([])
  const [requirement, setRequirement] = useState('optional')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [autoDefect, setAutoDefect] = useState(null)
  const { canEdit: isProjectManager } = useProjectRole(run?.project_id)

  const refresh = useCallback(async () => {
    if (!runId) return
    const [r, e, ev] = await Promise.all([
      getTestRunById(runId),
      getExecutionsByRun(runId),
      listEvidenceForRun(runId),
    ])
    setRun(r)
    setExecs(e)
    setEvidence(ev)
    if (r?.project_id) {
      try {
        const settings = await getEvidenceRequirementSettings(r.project_id)
        setRequirement(resolveTestEvidenceRequirement(settings))
      } catch (err) {
        console.error('Could not load evidence settings', err)
      }
    }
  }, [runId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    resolveInternalUserId().then(setCurrentUserId)
  }, [])

  const onUpdate = async (executionId, updates) => {
    try {
      const uid = await resolveInternalUserId()
      const merged = { ...updates, executed_by: uid || undefined }
      const row = await updateExecution(executionId, merged)
      let defect = row?.defect
      if (merged.status === 'failed' && !defect?.id) {
        const list = await getExecutionsByRun(runId)
        defect = list.find((e) => e.id === executionId)?.defect
      }
      if (merged.status === 'failed' && defect?.id) {
        setAutoDefect(defect)
      }
      await refresh()
      toast.success(merged.status ? `Marked as ${merged.status.replace('_', ' ')}.` : 'Notes saved.')
    } catch (e) {
      console.error(e)
      toast.error('Could not save this change. Please try again.')
    }
  }

  const onAttach = async (execution, file) => {
    try {
      await uploadExecutionEvidence({
        executionId: execution.id,
        runId,
        projectId: run.project_id,
        file,
      })
      await refresh()
      toast.success('Evidence attached.')
    } catch (e) {
      console.error(e)
      toast.error('Could not attach this file. Please try again.')
    }
  }

  const onRemoveEvidence = async (ev) => {
    if (!window.confirm(`Remove ${ev.file_name}? It stays in the audit history.`)) return
    try {
      await softDeleteExecutionEvidence(ev.id)
      await refresh()
      toast.success('Evidence removed.')
    } catch (e) {
      console.error(e)
      toast.error('Could not remove this file. Please try again.')
    }
  }

  if (!run) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>

  const runClosed = CLOSED_RUN_STATUSES.has(run.status)
  const canRemoveFor = (ev) =>
    canRemoveTestEvidence({
      runClosed,
      isUploader: Boolean(currentUserId) && ev.uploaded_by === currentUserId,
      isProjectManager,
    })

  const evidenceByExecution = evidence.reduce((acc, ev) => {
    const key = ev.test_case_execution_id
    ;(acc[key] ||= []).push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <Link to={`/platform/testing/runs/${runId}`} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
        ← Run detail
      </Link>
      {autoDefect && <AutoDefectAlert defect={autoDefect} />}
      <TestExecutionProgressBar summary={run.summary} />
      <div className="space-y-3">
        {execs.map((ex) => (
          <TestExecutionRow
            key={ex.id}
            execution={ex}
            onUpdate={onUpdate}
            disabled={false}
            evidence={evidenceByExecution[ex.id] || []}
            requirement={requirement}
            canRemoveEvidence={canRemoveFor}
            onAttach={onAttach}
            onRemoveEvidence={onRemoveEvidence}
          />
        ))}
      </div>
    </div>
  )
}
