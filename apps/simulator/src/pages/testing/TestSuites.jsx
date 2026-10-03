import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { getTestSuites, deleteTestSuite } from '../../services/testSuiteService'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const SUITE_TYPES = ['functional', 'regression', 'smoke', 'uat', 'performance', 'security', 'integration', 'exploratory', 'sanity']
const STATUSES = ['draft', 'active', 'archived']

const filterClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

function optionLabel(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [suiteType, setSuiteType] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTestSuites(projectId, {
        search: search || undefined,
        suite_type: suiteType || undefined,
        status: status || undefined,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [projectId, search, suiteType, status])

  useEffect(() => {
    load()
  }, [load])

  const withQuery = (path) => {
    const query = searchParams.toString()
    return query ? `${path}?${query}` : path
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete suite ${row.name}?`)) return
    setActionError(null)
    try {
      const uid = await resolveInternalUserId()
      await deleteTestSuite(row.id, uid)
      showSuccess({
        recordId: row.name,
        operation: 'deleted',
        message: 'The suite was removed from this project.',
      })
      await load()
    } catch (e) {
      setActionError(e?.message || 'Could not delete the suite.')
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>

  const filtersActive = Boolean(searchInput || suiteType || status)
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setSuiteType('')
    setStatus('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(withQuery('/platform/testing/suites/new'))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New suite
        </button>
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="test_suites" disabled={!rows.length} />
      </div>
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      {modal}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Search suite name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`${filterClass} min-w-[220px] flex-1 placeholder:text-gray-500`}
          aria-label="Search test suites"
        />
        <select
          value={suiteType}
          onChange={(e) => setSuiteType(e.target.value)}
          className={filterClass}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {SUITE_TYPES.map((t) => (
            <option key={t} value={t}>{optionLabel(t)}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={filterClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{optionLabel(s)}</option>
          ))}
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-700 dark:text-gray-200">
                    {filtersActive ? 'No suites match these filters.' : 'No suites yet.'}
                  </td>
                </tr>
              )}
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3">
                    <Link to={`/platform/testing/suites/${r.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                      {r.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.suite_type}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.status}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <RowActionButton variant="view" label="View suite" onClick={() => navigate(`/platform/testing/suites/${r.id}`)} />
                      <RowActionButton variant="edit" label="Edit suite" onClick={() => navigate(withQuery(`/platform/testing/suites/${r.id}/edit`))} />
                      <RowActionButton variant="delete" label="Delete suite" onClick={() => handleDelete(r)} />
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
