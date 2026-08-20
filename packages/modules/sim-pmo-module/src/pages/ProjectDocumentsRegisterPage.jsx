import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { simDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useProjectDocumentAccess } from '@nidus/shared/hooks/useProjectDocumentAccess.js'
import {
  loadProjectDocumentsRegister,
  captureOrRestoreProjectDocument,
  retireProjectDocument,
} from '@nidus/shared/services/projectDocumentsRegisterService.js'
import { orgTemplateDetailPath } from '@nidus/shared/utils/organisationalTemplateRoutes.js'
import { toProjectDocumentLabel } from '@nidus/shared/utils/projectDocumentNaming.js'
import { METHODOLOGY_TRACK_DEFS, normalizeProjectDeliveryTrack } from '@nidus/config/methodologyMenuUtils.js'

/** Fill-in form lives on the Project Documents detail route. */
const DETAIL_LIST_BASE = '/simulator/pm/documents/project'
const PROJECTS_PATH = '/simulator/practice-projects'

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'statusLabel', label: 'Status' },
  { key: 'tier', label: 'Source tier' },
  { key: 'methodology', label: 'Methodology' },
]

const TIER_LABELS = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project', pmo: 'PMO' }
const STATUS_LABELS = {
  captured: 'Captured',
  not_captured: 'Not yet captured',
  restorable: 'Retired (restorable)',
}

function methodologyLabel(m) {
  if (m == null || String(m).trim() === '') return 'Common'
  const def = METHODOLOGY_TRACK_DEFS.find((d) => d.track === normalizeProjectDeliveryTrack(m))
  return def?.shortLabel || m
}

function displayDocName(name) {
  return toProjectDocumentLabel(name) || name
}

function cycleSort(currentKey, currentDir, nextKey) {
  if (currentKey !== nextKey) return { key: nextKey, dir: 'asc' }
  if (currentDir === 'asc') return { key: nextKey, dir: 'desc' }
  return { key: '', dir: '' }
}

function sortIcon(sortKey, sortDir, col) {
  if (sortKey !== col) return '⇅'
  return sortDir === 'asc' ? '↑' : '↓'
}

/**
 * Project Documents register (v849) — Captured vs Not-yet-captured process documents.
 * Route entry: /simulator/pm/documents/project
 */
export default function ProjectDocumentsRegisterPage() {
  const navigate = useNavigate()
  const { projectId, loading: projectLoading } = usePlatformProjectId()
  const { loading: accessLoading, canManage, isMember } = useProjectDocumentAccess({
    db: simDb,
    projectId,
    schema: 'sim',
  })
  const [pageTitle, setPageTitle] = useState('Project Documents')
  const [captured, setCaptured] = useState([])
  const [available, setAvailable] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [busyId, setBusyId] = useState(null)
  const [viewMode, setViewMode] = useViewMode('sim-project-documents-register', 'list')

  useEffect(() => {
    getMenuLabel(simDb, 'sim_pm_project_documents', 'Project Documents').then(setPageTitle)
  }, [])

  const load = useCallback(async () => {
    if (!projectId) {
      setCaptured([])
      setAvailable([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) {
        setCaptured([])
        setAvailable([])
        return
      }
      const result = await loadProjectDocumentsRegister(simDb, {
        accountId,
        projectId,
        schema: 'sim',
      })
      setCaptured(result.captured)
      setAvailable(result.available)
    } catch (e) {
      toast.error(e.message || 'Failed to load project documents')
      setCaptured([])
      setAvailable([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const combined = useMemo(() => {
    const rows = [
      ...captured.map((r) => ({
        ...r,
        statusLabel: STATUS_LABELS.captured,
        sourceTier: r.tier,
      })),
      ...available.map((r) => ({
        ...r,
        statusLabel: STATUS_LABELS[r.registerStatus] || r.registerStatus,
        sourceTier: r.tier,
      })),
    ]
    const q = search.trim().toLowerCase()
    let filtered = rows
    if (q) {
      filtered = filtered.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.statusLabel || '').toLowerCase().includes(q) ||
          (r.methodology || '').toLowerCase().includes(q),
      )
    }
    if (statusFilter) {
      filtered = filtered.filter((r) => r.registerStatus === statusFilter)
    }
    if (sortKey && sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1
      filtered = [...filtered].sort((a, b) => {
        const av = String(
          sortKey === 'name' ? displayDocName(a.name) : a[sortKey] ?? '',
        ).toLowerCase()
        const bv = String(
          sortKey === 'name' ? displayDocName(b.name) : b[sortKey] ?? '',
        ).toLowerCase()
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return 0
      })
    }
    return filtered
  }, [captured, available, search, statusFilter, sortKey, sortDir])

  const exportCols = EXPORT_COLS
  const exportRows = useMemo(
    () =>
      withExportRowNumbers(
        EXPORT_COLS.filter((c) => c.key !== '_rowNumber'),
        combined.map((r) => ({
          ...r,
          tier: TIER_LABELS[r.tier] || r.tier,
          methodology: methodologyLabel(r.methodology),
        })),
      ),
    [combined],
  )

  // Prefer UUID in the URL — getTemplateNode resolves it reliably; the detail page
  // replaces with template_reference when known (rule 16.1).
  const goToDetail = (nodeOrRow) => {
    const id = nodeOrRow?.id
    if (!id) return
    navigate(orgTemplateDetailPath(DETAIL_LIST_BASE, id))
  }

  const handleCaptureOrRestore = async (row) => {
    setBusyId(row.id)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) throw new Error('Could not resolve your organisation account')
      const { node, mode } = await captureOrRestoreProjectDocument(simDb, {
        accountId,
        projectId,
        sourceNode: row,
        archivedNode: row.archivedNode || null,
      })
      toast.success(
        mode === 'restore'
          ? `Restored "${displayDocName(node?.name || row.name)}"`
          : `Captured "${displayDocName(node?.name || row.name)}"`,
      )
      goToDetail(node || row.archivedNode)
    } catch (e) {
      if (e.code === 'ALREADY_COPIED' && e.existingNode?.id) {
        toast.success('Opening your existing project copy')
        goToDetail(e.existingNode)
        return
      }
      toast.error(e.message || 'Action failed')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleRetire = async (row) => {
    if (
      !window.confirm(
        `Retire "${displayDocName(row.name)}"? It will leave Captured and can be restored later from Not yet captured.`,
      )
    ) {
      return
    }
    setBusyId(row.id)
    try {
      await retireProjectDocument(simDb, row)
      toast.success(`Retired "${displayDocName(row.name)}"`)
      await load()
    } catch (e) {
      toast.error(e.message || 'Retire failed')
    } finally {
      setBusyId(null)
    }
  }

  const onSort = (col) => {
    const next = cycleSort(sortKey, sortDir, col)
    setSortKey(next.key)
    setSortDir(next.dir)
  }

  const renderActions = (row) => {
    if (row.registerStatus === 'captured') {
      // v897 Part B — team_lead/team_member get View only, no Edit/Retire.
      if (!canManage) {
        return <RowActionButton variant="view" label={`View ${row.name}`} onClick={() => goToDetail(row)} />
      }
      return (
        <div className="inline-flex items-center gap-0.5">
          <RowActionButton variant="view" label={`View ${row.name}`} onClick={() => goToDetail(row)} />
          <RowActionButton variant="edit" label={`Edit ${row.name}`} onClick={() => goToDetail(row)} />
          <RowActionButton
            variant="delete"
            label={`Retire ${row.name}`}
            disabled={busyId === row.id}
            onClick={() => handleRetire(row)}
          />
        </div>
      )
    }
    // Nothing to view yet, and read-only roles don't get a Capture/Restore action.
    if (!canManage) return null
    const label =
      row.registerStatus === 'restorable'
        ? busyId === row.id
          ? 'Restoring…'
          : 'Restore'
        : busyId === row.id
          ? 'Capturing…'
          : 'Capture'
    return (
      <button
        type="button"
        disabled={busyId === row.id}
        onClick={() => handleCaptureOrRestore(row)}
        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {label}
      </button>
    )
  }

  if (projectLoading || accessLoading) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>Select a project first to view and capture its process documents.</p>
        <Link to={PROJECTS_PATH} className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400">
          Go to Projects
        </Link>
      </div>
    )
  }

  // v897 Part B — team_lead/team_member only see documents for a project they're an
  // assigned member of, not every project in the account.
  if (!canManage && !isMember) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>You're not a member of this project, so its documents aren't available to view here.</p>
        <Link to={PROJECTS_PATH} className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400">
          Go to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Process documents available to this project — capture to create a project-owned copy, or
            restore a previously retired one.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportListMenu
            columns={exportCols}
            data={exportRows}
            baseFilename="project_documents"
            disabled={!combined.length}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="captured">Captured</option>
          <option value="not_captured">Not yet captured</option>
          <option value="restorable">Retired (restorable)</option>
        </select>
      </div>

      {!loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {combined.length} document{combined.length === 1 ? '' : 's'} (
          {captured.length} captured, {available.length} available)
        </p>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && combined.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No process documents apply to this project yet. Ask your PMO administrator to set up
          organisational process document defaults.
        </p>
      )}

      {!loading && viewMode === 'list' && combined.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('name')}>
                    Name <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'name')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => onSort('statusLabel')}
                  >
                    Status <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'statusLabel')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('tier')}>
                    Source tier <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'tier')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => onSort('methodology')}
                  >
                    Methodology{' '}
                    <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'methodology')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((row, index) => (
                <tr
                  key={`${row.registerStatus}-${row.id}`}
                  className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{displayDocName(row.name)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.statusLabel}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {TIER_LABELS[row.tier] || row.tier}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {methodologyLabel(row.methodology)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{renderActions(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && viewMode !== 'list' && combined.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {combined.map((row, index) => (
            <article
              key={`${row.registerStatus}-${row.id}`}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
              </div>
              <h2 className="font-medium text-gray-900 dark:text-gray-100">{displayDocName(row.name)}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {row.statusLabel} · {TIER_LABELS[row.tier] || row.tier} ·{' '}
                {methodologyLabel(row.methodology)}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1">{renderActions(row)}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
