import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { getTestCases, testCaseDetailPathSegment, deleteTestCase } from '../../services/testCaseService'
import { getTestSuites } from '../../services/testSuiteService'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'

const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUSES = ['draft', 'active', 'deprecated', 'archived']
const TEST_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automated', label: 'Automated' },
  { value: 'semi-automated', label: 'Semi-Automated' },
  { value: 'exploratory', label: 'Exploratory' },
]

const filterClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

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
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [searchParams] = useSearchParams()
  const suiteFromUrl = searchParams.get('suite') || ''
  const [rows, setRows] = useState([])
  const [suites, setSuites] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [testType, setTestType] = useState('')
  const [suiteId, setSuiteId] = useState(suiteFromUrl)

  useEffect(() => {
    setSuiteId(suiteFromUrl)
  }, [suiteFromUrl])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    getTestSuites(projectId)
      .then((data) => {
        if (!cancelled) setSuites(data || [])
      })
      .catch(() => {
        if (!cancelled) setSuites([])
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTestCases(projectId, {
        suite_id: suiteId || undefined,
        priority: priority || undefined,
        status: status || undefined,
        test_type: testType || undefined,
        search: search || undefined,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [projectId, suiteId, priority, status, testType, search])

  useEffect(() => {
    load()
  }, [load])

  const casePath = (row) => `/platform/testing/cases/${testCaseDetailPathSegment(row)}`
  const caseEditPath = (row) => {
    const query = searchParams.toString()
    return `${casePath(row)}/edit${query ? `?${query}` : ''}`
  }

  const handleDelete = async (row) => {
    const label = row.test_case_ref || row.title || 'this test case'
    if (!window.confirm(`Delete test case ${label}?`)) return
    setActionError(null)
    try {
      const uid = await resolveInternalUserId()
      await deleteTestCase(row.id, uid || undefined)
      showSuccess({
        recordId: row.test_case_ref || row.title,
        operation: 'deleted',
        message: 'The test case was removed from this project.',
      })
      await load()
    } catch (e) {
      setActionError(e?.message || 'Could not delete the test case.')
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>

  const filtersActive = Boolean(searchInput || priority || status || testType || suiteId)
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setPriority('')
    setStatus('')
    setTestType('')
    setSuiteId('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <Link
          to={
            suiteId
              ? `/platform/testing/cases/new?suite=${encodeURIComponent(suiteId)}`
              : '/platform/testing/cases/new'
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          New case
        </Link>
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="test_cases" disabled={!rows.length} />
      </div>
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      {modal}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Search ref, title, or description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`${filterClass} min-w-[220px] flex-1 placeholder:text-gray-500`}
          aria-label="Search test cases"
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
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={filterClass}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
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
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className={filterClass}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {TEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
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
                <th className="p-3">Ref</th>
                <th className="p-3">Title</th>
                <th className="p-3 min-w-[12rem] max-w-md">Description</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-700 dark:text-gray-200">
                    {filtersActive ? 'No test cases match these filters.' : 'No test cases yet.'}
                  </td>
                </tr>
              )}
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.test_case_ref}</td>
                  <td className="p-3">
                    <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-300" to={casePath(r)}>
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-200 max-w-md align-top">
                    {r.description?.trim() ? (
                      <p className="line-clamp-2 text-xs leading-relaxed whitespace-pre-wrap" title={r.description}>
                        {r.description}
                      </p>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.priority}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{r.status}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <RowActionButton variant="view" label="View test case" onClick={() => navigate(casePath(r))} />
                      <RowActionButton variant="edit" label="Edit test case" onClick={() => navigate(caseEditPath(r))} />
                      <RowActionButton variant="delete" label="Delete test case" onClick={() => handleDelete(r)} />
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
