import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestExecutionRow from '../../../components/testing/TestExecutionRow'
import TestExecutionProgressBar from '../../../components/testing/TestExecutionProgressBar'
import AutoDefectAlert from '../../../components/testing/AutoDefectAlert'
import {
  getPracticeTestRunById,
  getPracticeExecutionsByRun,
  updatePracticeExecution,
} from '../../../services/sim/practiceTestRunService'
import {
  listEvidenceForRun,
  uploadPracticeExecutionEvidence,
  softDeletePracticeExecutionEvidence,
  getPracticeEvidenceRequirementSettings,
} from '../../../services/sim/practiceTestCaseExecutionEvidenceService'
import { resolveSimInternalUserId } from '../../../utils/resolveSimInternalUserId'
import {
  resolveTestEvidenceRequirement,
  canRemoveTestEvidence,
} from '@nidus/shared/utils/testEvidenceRequirement'
import { SIM_TESTING_BASE } from './simTestingPaths'

const CLOSED_RUN_STATUSES = new Set(['completed', 'cancelled', 'aborted'])

export default function SimTestRunExecute() {
  const { runId } = useParams()
  return (
    <SimTestingPageShell title="Execute test run" subtitle="Mark each case pass, fail, blocked, or skipped.">
      {() => <RunExecuteBody runId={runId} />}
    </SimTestingPageShell>
  )
}

function RunExecuteBody({ runId }) {
  const [run, setRun] = useState(null)
  const [execs, setExecs] = useState([])
  const [evidence, setEvidence] = useState([])
  const [requirement, setRequirement] = useState('optional')
  const [ownerUserId, setOwnerUserId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [autoDefect, setAutoDefect] = useState(null)

  const refresh = useCallback(async () => {
    if (!runId) return
    const [r, e, ev] = await Promise.all([
      getPracticeTestRunById(runId),
      getPracticeExecutionsByRun(runId),
      listEvidenceForRun(runId),
    ])
    setRun(r)
    setExecs(e)
    setEvidence(ev)
    if (r?.practice_project_id) {
      try {
        const settings = await getPracticeEvidenceRequirementSettings(r.practice_project_id)
        setRequirement(resolveTestEvidenceRequirement(settings))
        setOwnerUserId(settings.ownerUserId)
      } catch (err) {
        console.error('Could not load evidence settings', err)
      }
    }
  }, [runId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    resolveSimInternalUserId().then(setCurrentUserId)
  }, [])

  const onAttach = async (execution, file) => {
    try {
      await uploadPracticeExecutionEvidence({
        executionId: execution.id,
        runId,
        practiceProjectId: run.practice_project_id,
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
      await softDeletePracticeExecutionEvidence(ev.id)
      await refresh()
      toast.success('Evidence removed.')
    } catch (e) {
      console.error(e)
      toast.error('Could not remove this file. Please try again.')
    }
  }

  const onUpdate = async (executionId, updates) => {
    try {
      const uid = await resolveSimInternalUserId()
      const merged = { ...updates, executed_by: uid || undefined }
      const row = await updatePracticeExecution(executionId, merged)
      let defect = row?.defect
      if (merged.status === 'failed' && !defect?.id) {
        const list = await getPracticeExecutionsByRun(runId)
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

  if (!run) return <p className="text-gray-500">Loading…</p>

  const runClosed = CLOSED_RUN_STATUSES.has(run.status)
  // The practice project owner plays the Project Manager role here (SQL/v1202).
  const isOwner = Boolean(currentUserId) && ownerUserId === currentUserId
  const canRemoveFor = (ev) =>
    canRemoveTestEvidence({
      runClosed,
      isUploader: Boolean(currentUserId) && ev.uploaded_by === currentUserId,
      isProjectManager: isOwner,
    })

  const evidenceByExecution = evidence.reduce((acc, ev) => {
    const key = ev.practice_test_case_execution_id
    ;(acc[key] ||= []).push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <Link to={`${SIM_TESTING_BASE}/runs/${runId}`} className="text-sm text-emerald-400 hover:underline">
        ← Run detail
      </Link>
      {autoDefect && (
        <AutoDefectAlert defect={autoDefect} defectDetailBasePath={`${SIM_TESTING_BASE}/defects`} />
      )}
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
