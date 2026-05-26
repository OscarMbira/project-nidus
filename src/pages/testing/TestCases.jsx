import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { getTestCases, testCaseDetailPathSegment } from '../../services/testCaseService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'test_case_ref', label: 'Ref' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'test_type', label: 'Type' },
]

export default function TestCases() {
  return (
    <TestingPageShell title="Test cases" subtitle="All cases for the selected project.">
      {({ projectId }) => <CasesBody projectId={projectId} />}
    </TestingPageShell>
  )
}

function CasesBody({ projectId }) {
  const [searchParams] = useSearchParams()
  const suiteFilter = searchParams.get('suite') || ''
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTestCases(projectId, { suite_id: suiteFilter || undefined })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [projectId, suiteFilter])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <Link
          to={
            suiteFilter
              ? `/platform/testing/cases/new?suite=${encodeURIComponent(suiteFilter)}`
              : '/platform/testing/cases/new'
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New case
        </Link>
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="test_cases" disabled={!rows.length} />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Ref</th>
                <th className="p-3">Title</th>
                <th className="p-3 min-w-[12rem] max-w-md">Description</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 text-gray-400">{r.test_case_ref}</td>
                  <td className="p-3">
                    <Link className="text-emerald-400 hover:underline" to={`/platform/testing/cases/${testCaseDetailPathSegment(r)}`}>
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-400 max-w-md align-top">
                    {r.description?.trim() ? (
                      <p className="line-clamp-2 text-xs leading-relaxed whitespace-pre-wrap" title={r.description}>
                        {r.description}
                      </p>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300">{r.priority}</td>
                  <td className="p-3 text-gray-300">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
