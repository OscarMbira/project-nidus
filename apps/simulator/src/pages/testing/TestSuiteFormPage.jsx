import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestSuiteForm from '../../components/testing/TestSuiteForm'
import { createTestSuite, getTestSuiteById, updateTestSuite } from '../../services/testSuiteService'
import { getTestEnvironments } from '../../services/testEnvironmentService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function TestSuiteFormPage() {
  const { suiteId } = useParams()
  const isNew = !suiteId
  return (
    <TestingPageShell
      title={isNew ? 'New test suite' : 'Edit test suite'}
      subtitle="Name, type, and status for this suite."
    >
      {({ projectId }) => <Editor isNew={isNew} suiteId={suiteId} projectId={projectId} />}
    </TestingPageShell>
  )
}

function Editor({ isNew, suiteId, projectId }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const environmentsPath = searchParams.toString()
    ? `/platform/testing/environments?${searchParams.toString()}`
    : '/platform/testing/environments'
  const { showSuccess, modal } = useSuccessModal()
  const [suite, setSuite] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (isNew || !suiteId) return undefined
    let cancelled = false
    setLoading(true)
    getTestSuiteById(suiteId)
      .then((row) => { if (!cancelled) setSuite(row) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Could not load this suite.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isNew, suiteId])

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>
  if (loading) return <p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p>
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {modal}
      <TestSuiteForm
        layout="inline"
        suite={isNew ? null : suite}
        projectId={projectId}
        fetchEnvironments={getTestEnvironments}
        environmentsPath={environmentsPath}
        onClose={() => navigate(-1)}
        onSave={async (payload) => {
          if (isNew) {
            const created = await createTestSuite(payload)
            showSuccess({
              recordId: created.name,
              operation: 'created',
              message: 'The suite was created.',
              onOk: () => navigate(`/platform/testing/suites/${created.id}`),
            })
            return
          }
          const updated = await updateTestSuite(suiteId, payload)
          showSuccess({
            recordId: updated.name || suite?.name,
            operation: 'updated',
            message: 'The suite was updated.',
            onOk: () => navigate(`/platform/testing/suites/${suiteId}`),
          })
        }}
      />
    </div>
  )
}
