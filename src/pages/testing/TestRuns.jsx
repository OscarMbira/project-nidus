import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestRunForm from '../../components/testing/TestRunForm'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { getTestRuns, createTestRun, bootstrapTestRunExecutions } from '../../services/testRunService'
import { getTestSuites } from '../../services/testSuiteService'
import { resolveInternalUserId } from '../../utils/resolveInternalUserId'

const COLS = [
  { key: 'run_name', label: 'Run' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status' },
  { key: 'run_date', label: 'Date' },
]

export default function TestRuns() {
  return (
    <TestingPageShell title="Test runs" subtitle="Execution sessions tied Suites.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const [rows, setRows] = useState([])
  const [suites, setSuites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [r, s] = await Promise.all([getTestRuns(projectId), getTestSuites(projectId)])
      setRows(r)
      setSuites(s)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New run
        </button>
        <ExportListMenu columns={COLS} data={rows} baseFilename="test_runs" disabled={!rows.length} />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-left">
              <tr>
                <th className="p-3">Run</th>
                <th className="p-3">Env</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="p-3">
                    <Link className="text-emerald-400 hover:underline" to={`/platform/testing/runs/${r.id}`}>
                      {r.run_name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-300">{r.environment}</td>
                  <td className="p-3 text-gray-300">{r.status}</td>
                  <td className="p-3 text-gray-400">{r.run_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <TestRunForm
          projectId={projectId}
          suites={suites}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            const uid = await resolveInternalUserId()
            const run = await createTestRun({ ...payload, run_by: uid || null })
            if (payload.suite_id) {
              await bootstrapTestRunExecutions(run.id, projectId, payload.suite_id)
            }
            setShowForm(false)
            load()
          }}
        />
      )}
    </div>
  )
}
