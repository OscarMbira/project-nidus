import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Eye, Pencil, Archive } from 'lucide-react'
import { useOPATailoringContext } from '../../hooks/useOPATailoringContext'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table'

const EXPORT_COLS = [
  { key: 'custom_title', label: 'Title' },
  { key: 'source_title', label: 'Source OPA' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

export default function ProjectOPATemplates() {
  const navigate = useNavigate()
  const { projectId, base, opaBrowsePath, svc } = useOPATailoringContext()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('project-opa-templates', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-project-opa-templates-sort',
  })

  const accessors = useMemo(
    () => ({
      custom_title: (r) => r.custom_title ?? '',
      source_title: (r) => r.source?.title ?? '',
      status: (r) => r.status ?? '',
      version: (r) => r.version ?? '',
      updated_at: (r) => r.updated_at ?? '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(rows, accessors), [rows, sortedData, accessors])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await svc.listProjectCustomisations(projectId, { search: debounced })
      if (cancelled) return
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, debounced, svc])

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => ({
        custom_title: r.custom_title,
        source_title: r.source?.title,
        status: r.status,
        version: r.version,
        updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '',
      })),
    [displayRows]
  )

  async function handleArchive(id) {
    if (!window.confirm('Archive this customised template?')) return
    const { error } = await svc.archiveCustomisation(id)
    if (error) {
      setErr(error.message)
      return
    }
    const { data } = await svc.listProjectCustomisations(projectId, { search: debounced })
    setRows(data || [])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={opaBrowsePath} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Browse PMO templates
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My project OPA templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tailored copies of PMO templates for this project.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Project_OPA_Templates" disabled={!exportRows.length} />
          <Link
            to={opaBrowsePath}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
          >
            Browse PMO templates
          </Link>
          <Link
            to={`${base}/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm min-h-[44px]"
          >
            <Plus className="h-5 w-5" /> New from template
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or source…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Template list layout" />
      </div>

      {err && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRows.map((r, index) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2"
            >
              <button
                type="button"
                onClick={() => navigate(`${base}/${r.id}`)}
                className="text-left font-semibold text-gray-900 dark:text-white hover:underline"
              >
                {r.custom_title}
              </button>
              <p className="text-xs text-gray-500">Source: {r.source?.title || '—'}</p>
              <p className="text-xs text-gray-500">
                {r.status} · v{r.version || '1.0'}
                {r.is_on_hold ? ' · On hold' : ''}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button type="button" className="text-sm text-sky-600" onClick={() => navigate(`${base}/${r.id}`)}>
                  <Eye className="h-4 w-4 inline" /> View
                </button>
                <button type="button" className="text-sm text-gray-700" onClick={() => navigate(`${base}/${r.id}/edit`)}>
                  <Pencil className="h-4 w-4 inline" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('custom_title')} onSort={() => handleSort('custom_title')}>
                  Title
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('source_title')} onSort={() => handleSort('source_title')}>
                  Source
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell>Version</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('updated_at')} onSort={() => handleSort('updated_at')}>
                  Updated
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.custom_title}</TableCell>
                  <TableCell>{r.source?.title || '—'}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.version || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-sky-600 text-sm" onClick={() => navigate(`${base}/${r.id}`)}>
                      View
                    </button>
                    <button type="button" className="text-gray-700 text-sm" onClick={() => navigate(`${base}/${r.id}/edit`)}>
                      Edit
                    </button>
                    <button type="button" className="text-amber-700 text-sm" onClick={() => handleArchive(r.id)}>
                      <Archive className="h-3 w-3 inline" /> Archive
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !displayRows.length && (
        <div className="text-center text-gray-500 py-12 space-y-4">
          <p>No tailored templates yet. Browse PMO templates and copy one into this project.</p>
          <Link to={opaBrowsePath} className="inline-flex px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">
            Browse OPA templates
          </Link>
        </div>
      )}
    </div>
  )
}
