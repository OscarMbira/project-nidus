import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import DefectStatusBadge from '../../components/testing/DefectStatusBadge'
import DefectSeverityBadge from '../../components/testing/DefectSeverityBadge'
import { getDefects, deleteDefect } from '../../services/defectService'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import { formatAuditDate, humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

const EXPORT_COLS = [
  { key: 'defect_ref', label: 'Ref' },
  { key: 'title', label: 'Title' },
  { key: 'severity', label: 'Severity' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'defect_type', label: 'Type' },
  { key: 'environment', label: 'Environment' },
  { key: 'assigned_to_name', label: 'Assigned to' },
  { key: 'reported_by_name', label: 'Reported by' },
  { key: 'created_label', label: 'Created' },
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
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState(null)

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

  const defectPath = (row) => `/platform/testing/defects/${encodeURIComponent(row.id)}`

  const handleDelete = async (row) => {
    const label = row.defect_ref || row.title || 'this defect'
    if (!window.confirm(`Delete defect ${label}?`)) return
    setActionError(null)
    try {
      const uid = await resolveInternalUserId()
      await deleteDefect(row.id, uid || undefined)
      showSuccess({
        recordId: row.defect_ref || row.title,
        operation: 'deleted',
        message: 'The defect was removed from this project.',
      })
      await load()
    } catch (e) {
      setActionError(e?.message || 'Could not delete the defect.')
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>

  const exportRows = rows.map((r) => ({
    ...r,
    defect_type: humanizeAuditToken(r.defect_type),
    created_label: formatAuditDate(r.created_at),
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
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      {modal}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search ref or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All statuses</option>
          {['new', 'open', 'in_progress', 'resolved', 'closed', 'reopened', 'deferred', 'duplicate'].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Apply
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Ref</th>
                <th className="p-3">Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Type</th>
                <th className="p-3">Environment</th>
                <th className="p-3">Assigned to</th>
                <th className="p-3">Reported by</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 whitespace-nowrap">
                    <Link to={defectPath(r)} className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                      {r.defect_ref || r.id}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-900 dark:text-gray-100">{r.title}</td>
                  <td className="p-3">
                    <DefectSeverityBadge severity={r.severity} />
                  </td>
                  <td className="p-3">
                    <DefectSeverityBadge severity={r.priority} />
                  </td>
                  <td className="p-3">
                    <DefectStatusBadge status={r.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{humanizeAuditToken(r.defect_type) || '—'}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.environment || '—'}</td>
                  <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{r.assigned_to_name || '—'}</td>
                  <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{r.reported_by_name || '—'}</td>
                  <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{formatAuditDate(r.created_at)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <RowActionButton variant="view" label="View defect" onClick={() => navigate(defectPath(r))} />
                      <RowActionButton variant="edit" label="Edit defect" onClick={() => navigate(defectPath(r), { state: { edit: true } })} />
                      <RowActionButton variant="delete" label="Delete defect" onClick={() => handleDelete(r)} />
                    </div>
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
