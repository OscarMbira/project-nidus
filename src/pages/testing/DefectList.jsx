import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '../../components/ui/ExportListMenu'
import DefectStatusBadge from '../../components/testing/DefectStatusBadge'
import DefectSeverityBadge from '../../components/testing/DefectSeverityBadge'
import { getDefects } from '../../services/defectService'

const EXPORT_COLS = [
  { key: 'defect_ref', label: 'Ref' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'severity', label: 'Severity' },
  { key: 'priority', label: 'Priority' },
]

export default function DefectList() {
  return (
    <TestingPageShell title="Defects" subtitle="Issues from failed tests or raised manually.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getDefects(projectId, {
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      })
      setRows(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>

  const exportRows = rows.map((r) => ({
    ...r,
    status: r.status,
    severity: r.severity,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/platform/testing/defects/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New defect
        </button>
        <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="defects" disabled={!exportRows.length} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search ref or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {['new', 'open', 'in_progress', 'resolved', 'closed', 'reopened', 'deferred', 'duplicate'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="px-3 py-2 rounded-lg border border-gray-600 text-sm text-gray-200"
        >
          Apply
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-left">
              <tr>
                <th className="p-3">Ref</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Severity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="p-3">
                    <Link to={`/platform/testing/defects/${r.id}`} className="text-emerald-400 hover:underline">
                      {r.defect_ref || r.id}
                    </Link>
                  </td>
                  <td className="p-3 text-white">{r.title}</td>
                  <td className="p-3">
                    <DefectStatusBadge status={r.status} />
                  </td>
                  <td className="p-3">
                    <DefectSeverityBadge severity={r.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-4 text-gray-500 text-sm">No defects for this project.</p>}
        </div>
      )}
    </div>
  )
}
