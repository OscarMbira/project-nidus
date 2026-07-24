import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestExecutionRow from '../../../components/testing/TestExecutionRow'
import TestExecutionProgressBar from '../../../components/testing/TestExecutionProgressBar'
import AutoDefectAlert from '../../../components/testing/AutoDefectAlert'
import {
  getPracticeTestRunById,
  getPracticeExecutionsByRun,
  updatePracticeExecution,
} from '../../../services/sim/practiceTestRunService'
import { resolveSimInternalUserId } from '../../../utils/resolveSimInternalUserId'
import { SIM_TESTING_BASE } from './simTestingPaths'

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
  const [autoDefect, setAutoDefect] = useState(null)

  const refresh = useCallback(async () => {
    if (!runId) return
    const [r, e] = await Promise.all([getPracticeTestRunById(runId), getPracticeExecutionsByRun(runId)])
    setRun(r)
    setExecs(e)
  }, [runId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onUpdate = async (executionId, updates) => {
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
  }

  if (!run) return <p className="text-gray-500">Loading…</p>

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
          <TestExecutionRow key={ex.id} execution={ex} onUpdate={onUpdate} disabled={false} />
        ))}
      </div>
    </div>
  )
}
