import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { deleteTestEnvironment, getTestEnvironments } from '../../services/testEnvironmentService'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
]

export default function TestEnvironments() {
  return (
    <TestingPageShell title="Environments" subtitle="Target environments a test suite can run against.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTestEnvironments(projectId)
      setRows(data)
    } catch (err) {
      setError(err?.message || 'Could not load environments.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const withQuery = (path) => {
    const query = searchParams.toString()
    return query ? `${path}?${query}` : path
  }

  const visible = rows.filter((row) => !search || String(row.name || '').toLowerCase().includes(search))
  const exportRows = visible.map((row) => ({
    ...row,
    status: row.is_active ? 'Active' : 'Inactive',
  }))

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete environment ${row.name}?`)) return
    setError(null)
    try {
      const uid = await resolveInternalUserId()
      await deleteTestEnvironment(row.id, uid)
      showSuccess({
        recordId: row.name,
        operation: 'deleted',
        message: 'The environment was removed from this project.',
      })
      await load()
    } catch (err) {
      setError(err?.message || 'Could not delete the environment.')
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(withQuery('/platform/testing/environments/new'))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New environment
        </button>
        <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="test_environments" disabled={!exportRows.length} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {modal}
      <input
        type="search"
        placeholder="Search environment name…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        aria-label="Search environments"
      />
      {loading ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Name</th>
                <th className="p-3">Description</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-700 dark:text-gray-200">
                    {search ? 'No environments match this search.' : 'No environments yet.'}
                  </td>
                </tr>
              )}
              {visible.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{row.description || '—'}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{row.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <RowActionButton
                        variant="view"
                        label="View environment"
                        onClick={() => navigate(withQuery(`/platform/testing/environments/${encodeURIComponent(row.name)}`))}
                      />
                      <RowActionButton
                        variant="edit"
                        label="Edit environment"
                        onClick={() => navigate(withQuery(`/platform/testing/environments/${encodeURIComponent(row.name)}/edit`))}
                      />
                      <RowActionButton variant="delete" label="Delete environment" onClick={() => handleDelete(row)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
