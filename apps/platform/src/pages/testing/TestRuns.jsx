import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { getTestRuns, deleteTestRun } from '../../services/testRunService'
import { getTestSuites } from '../../services/testSuiteService'
import { getTestEnvironments } from '../../services/testEnvironmentService'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled', 'aborted', 'on_hold']

const filterClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

function optionLabel(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

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
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [suites, setSuites] = useState([])
  const [environments, setEnvironments] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [environment, setEnvironment] = useState('')
  const [suiteId, setSuiteId] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    Promise.all([
      getTestSuites(projectId).catch(() => []),
      getTestEnvironments(projectId, { activeOnly: true }).catch(() => []),
    ]).then(([suiteRows, environmentRows]) => {
      if (cancelled) return
      setSuites(suiteRows || [])
      setEnvironments(environmentRows || [])
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTestRuns(projectId, {
        search: search || undefined,
        status: status || undefined,
        environment: environment || undefined,
        suite_id: suiteId || undefined,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [projectId, search, status, environment, suiteId])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (row) => {
    const label = row.run_name || 'this test run'
    if (!window.confirm(`Delete test run ${label}?`)) return
    setActionError(null)
    try {
      const uid = await resolveInternalUserId()
      await deleteTestRun(row.id, uid || undefined)
      showSuccess({
        recordId: row.run_name,
        operation: 'deleted',
        message: 'The test run was removed from this project.',
      })
      await load()
    } catch (e) {
      setActionError(e?.message || 'Could not delete the test run.')
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>

  const filtersActive = Boolean(searchInput || status || environment || suiteId)
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setEnvironment('')
    setSuiteId('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/platform/testing/runs/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
        >
          <Plus className="h-4 w-4" />
          New run
        </button>
        <ExportListMenu columns={COLS} data={rows} baseFilename="test_runs" disabled={!rows.length} />
      </div>
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      {modal}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Search run name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`${filterClass} min-w-[220px] flex-1 placeholder:text-gray-500`}
          aria-label="Search test runs"
        />
        <select
          value={suiteId}
          onChange={(e) => setSuiteId(e.target.value)}
          className={filterClass}
          aria-label="Filter by suite"
        >
          <option value="">All suites</option>
          {suites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className={filterClass}
          aria-label="Filter by environment"
        >
          <option value="">All environments</option>
          {environments.map((env) => (
            <option key={env.id} value={env.name}>{env.name}</option>
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
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Run</th>
                <th className="p-3">Env</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-700 dark:text-gray-200">
                    {filtersActive ? 'No test runs match these filters.' : 'No test runs yet.'}
                  </td>
                </tr>
              )}
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3">
                    <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-300" to={`/platform/testing/runs/${r.id}`}>
                      {r.run_name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.environment}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{optionLabel(r.status)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.run_date}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <RowActionButton variant="view" label="View test run" onClick={() => navigate(`/platform/testing/runs/${r.id}`)} />
                      <RowActionButton variant="edit" label="Edit test run" onClick={() => navigate(`/platform/testing/runs/${r.id}/edit`)} />
                      <RowActionButton variant="delete" label="Delete test run" onClick={() => handleDelete(r)} />
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
