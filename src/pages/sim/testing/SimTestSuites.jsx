import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestSuiteForm from '../../../components/testing/TestSuiteForm'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import {
  getPracticeTestSuites,
  createPracticeTestSuite,
  deletePracticeTestSuite,
} from '../../../services/sim/practiceTestSuiteService'
import { resolveSimInternalUserId } from '../../../utils/resolveSimInternalUserId'
import { SIM_TESTING_BASE } from './simTestingPaths'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'suite_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
]

const PID_KEY = 'practice_project_id'

export default function SimTestSuites() {
  return (
    <SimTestingPageShell title="Test suites" subtitle="Group and organise practice test cases.">
      {({ projectId }) => <Body projectId={projectId} />}
    </SimTestingPageShell>
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
      const data = await getPracticeTestSuites(projectId)
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a practice project.</p>

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
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="practice_test_suites" disabled={!rows.length} />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 text-white">
                    <Link to={`${SIM_TESTING_BASE}/suites/${r.id}`} className="text-emerald-400 hover:underline">
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
                        const uid = await resolveSimInternalUserId()
                        await deletePracticeTestSuite(r.id, uid)
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
          projectIdKey={PID_KEY}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            await createPracticeTestSuite(payload)
            setShowForm(false)
            load()
          }}
        />
      )}
    </div>
  )
}
