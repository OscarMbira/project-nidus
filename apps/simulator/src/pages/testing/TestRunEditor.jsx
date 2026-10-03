import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestRunForm from '../../components/testing/TestRunForm'
import { getTestSuites } from '../../services/testSuiteService'
import {
  getTestRunById,
  createTestRun,
  updateTestRun,
  bootstrapTestRunExecutions,
} from '../../services/testRunService'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function TestRunEditor() {
  const { runId } = useParams()
  const isNew = !runId
  return (
    <TestingPageShell
      title={isNew ? 'New test run' : 'Edit test run'}
      subtitle={isNew ? 'Start an execution session for a suite.' : 'Update this test run.'}
    >
      {({ projectId }) => <EditorBody projectId={projectId} runId={isNew ? null : runId} />}
    </TestingPageShell>
  )
}

function EditorBody({ projectId, runId }) {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [suites, setSuites] = useState([])
  const [run, setRun] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(Boolean(runId))

  useEffect(() => {
    if (!projectId) {
      setSuites([])
      return
    }
    let cancelled = false
    setSuites([])
    getTestSuites(projectId)
      .then((data) => {
        if (!cancelled) setSuites((data || []).filter((suite) => suite.project_id === projectId))
      })
      .catch(() => {
        if (!cancelled) setSuites([])
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    setLoading(true)
    getTestRunById(runId)
      .then((data) => {
        if (!cancelled) setRun(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load this test run.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [runId])

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>
  if (loading) return <p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p>
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (runId && !run) return <p className="text-sm text-gray-700 dark:text-gray-200">Test run not found.</p>

  return (
    <>
      {modal}
      <TestRunForm
        projectId={projectId}
        suites={suites}
        run={run}
        onSave={async (payload) => {
          if (run) {
            const updated = await updateTestRun(run.id, payload)
            showSuccess({
              recordId: updated.run_name || run.run_name,
              operation: 'updated',
              message: 'The test run was updated.',
              onOk: () => navigate(`/platform/testing/runs/${run.id}`),
            })
            return
          }
          const uid = await resolveInternalUserId()
          const created = await createTestRun({ ...payload, run_by: uid || null })
          if (payload.suite_id) {
            await bootstrapTestRunExecutions(created.id, projectId, payload.suite_id)
          }
          showSuccess({
            recordId: created.run_name,
            operation: 'created',
            message: 'The test run was created.',
            onOk: () => navigate(`/platform/testing/runs/${created.id}`),
          })
        }}
      />
    </>
  )
}
