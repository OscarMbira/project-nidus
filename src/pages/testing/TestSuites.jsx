import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestSuiteForm from '../../components/testing/TestSuiteForm'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { getTestSuites, createTestSuite, deleteTestSuite } from '../../services/testSuiteService'
import { resolveInternalUserId } from '../../utils/resolveInternalUserId'

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'suite_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
]

export default function TestSuites() {
  return (
    <TestingPageShell title="Test suites" subtitle="Group and organise test cases.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const [rows, setRows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTestSuites(projectId)
      setRows(data)
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New suite
        </button>
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="test_suites" disabled={!rows.length} />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="p-3 text-white">
                    <Link to={`/platform/testing/suites/${r.id}`} className="text-emerald-400 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-300">{r.suite_type}</td>
                  <td className="p-3 text-gray-300">{r.status}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={async () => {
                        if (!confirm('Archive this suite?')) return
                        const uid = await resolveInternalUserId()
                        await deleteTestSuite(r.id, uid)
                        load()
                      }}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <TestSuiteForm
          projectId={projectId}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            await createTestSuite(payload)
            setShowForm(false)
            load()
          }}
        />
      )}
    </div>
  )
}
