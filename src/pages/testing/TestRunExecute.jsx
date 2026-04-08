import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestExecutionRow from '../../components/testing/TestExecutionRow'
import TestExecutionProgressBar from '../../components/testing/TestExecutionProgressBar'
import AutoDefectAlert from '../../components/testing/AutoDefectAlert'
import { getTestRunById, getExecutionsByRun, updateExecution } from '../../services/testRunService'
import { resolveInternalUserId } from '../../utils/resolveInternalUserId'

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
  const [autoDefect, setAutoDefect] = useState(null)

  const refresh = useCallback(async () => {
    if (!runId) return
    const [r, e] = await Promise.all([getTestRunById(runId), getExecutionsByRun(runId)])
    setRun(r)
    setExecs(e)
  }, [runId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onUpdate = async (executionId, updates) => {
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
  }

  if (!run) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-4">
      <Link to={`/platform/testing/runs/${runId}`} className="text-sm text-emerald-400 hover:underline">
        ← Run detail
      </Link>
      {autoDefect && <AutoDefectAlert defect={autoDefect} />}
      <TestExecutionProgressBar summary={run.summary} />
      <div className="space-y-3">
        {execs.map((ex) => (
          <TestExecutionRow key={ex.id} execution={ex} onUpdate={onUpdate} disabled={false} />
        ))}
      </div>
    </div>
  )
}
