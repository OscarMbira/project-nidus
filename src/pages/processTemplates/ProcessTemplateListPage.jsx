import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, LayoutGrid, Table2, Download, ArrowLeft, Copy, Pause } from 'lucide-react'
import ProcessTemplateProjectScope, { useProcessTemplateScope } from '../../components/processTemplates/ProcessTemplateProjectScope'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '../../utils/exportUtils'
import {
  getTemplateBySlug,
  getHubBasePath,
  roleKeyFromPath,
  isSimRoleKey,
} from '../../components/processTemplates/processTemplatesRegistry'
import {
  getTemplateService,
  canCreateMasterTemplate,
  canEditMasterTemplate,
  canCopyTemplate,
  canDeleteTemplate,
  loadProcessTemplateRows,
} from '../../services/processTemplatesService'
import TemplateCopyModal from '../../components/processTemplates/TemplateCopyModal'
import { platformDb } from '../../services/supabase/supabaseClient'

const EXPORT_COLS = [
  { key: 'reference_code', label: 'Reference' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'is_master', label: 'Master' },
  { key: 'created_at', label: 'Created' },
]

function sortRows(rows, key, dir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'boolean') return (av === bv ? 0 : av ? 1 : -1) * mul
    return String(av ?? '').localeCompare(String(bv ?? '')) * mul
  })
}

export default function ProcessTemplateListPage({ roleKey: roleKeyProp, basePath, sim: simProp }) {
  const { slug } = useParams()
  const location = useLocation()
  const template = getTemplateBySlug(slug)
  const roleKey = roleKeyProp || roleKeyFromPath(location.pathname)
  const sim = simProp ?? isSimRoleKey(roleKey)
  const hubBase = basePath || getHubBasePath(roleKey)
  const { masterCatalog, projectId } = useProcessTemplateScope(roleKey)
  const viewKey = `pt-${slug}-view-v1`
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useState(() => { try { return localStorage.getItem(viewKey) || 'table' } catch { return 'table' } })
  const [exportOpen, setExportOpen] = useState(false)
  const [copyMaster, setCopyMaster] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => { try { localStorage.setItem(viewKey, view) } catch {} }, [view, viewKey])

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  const canCreate = canCreateMasterTemplate(roleKey)
  const canCopy = canCopyTemplate(roleKey)
  const listBase = `${hubBase}/t/${slug}`

  const load = async () => {
    if (!template) return
    setLoading(true)
    try {
      const data = await loadProcessTemplateRows(slug, { sim, masterCatalog, projectId })
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, slug, sim, masterCatalog])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    let list = t
      ? rows.filter((r) =>
          (r.title || '').toLowerCase().includes(t) ||
          (r.reference_code || '').toLowerCase().includes(t) ||
          (r.status || '').toLowerCase().includes(t)
        )
      : rows
    return sortRows(list, sortKey, sortDir)
  }, [rows, search, sortKey, sortDir])

  const cycleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
    if (sortKey === key && sortDir === 'desc') setSortKey('created_at')
  }

  const sortIcon = (key) => {
    if (sortKey !== key || !sortDir) return '⇅'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  const handleDelete = async (row) => {
    if (!canDeleteTemplate(roleKey, row, userId)) {
      toast.error('You cannot delete this record')
      return
    }
    if (!window.confirm('Delete this record?')) return
    try {
      const svc = getTemplateService(slug, { sim })
      await svc.remove(row.id)
      setRows((r) => r.filter((x) => x.id !== row.id))
      toast.success(`Deleted record ${row.reference_code || row.id}`)
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  const handleHold = async (row) => {
    try {
      const svc = getTemplateService(slug, { sim })
      await svc.setOnHold(row.id)
      toast.success('Record placed on hold')
      load()
    } catch (e) {
      toast.error(e?.message || 'Hold failed')
    }
  }

  const handleExport = (fmt) => {
    const name = `${slug}-${masterCatalog ? 'masters' : projectId || 'all'}`
    const exportRows = filtered.map((r) => ({
      ...r,
      is_master: r.is_master ? 'Yes' : 'No',
    }))
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, exportRows, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, exportRows, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, exportRows, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, exportRows, name, template?.label)
    setExportOpen(false)
  }

  if (!template || template.kind !== 'new') {
    return (
      <div className="p-6 text-gray-400">
        Template not found or not available for CRUD.
        <Link to={hubBase} className="block text-blue-400 mt-2">Back to hub</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <Link to={`${hubBase}/${template.group}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        {template.label}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-100">{template.label}</h1>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Link
              to={`${listBase}/new`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              New master
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-600 text-sm text-gray-200 hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 z-10 rounded-lg border border-gray-700 bg-gray-900 shadow-lg py-1 min-w-[120px]">
                {['csv', 'json', 'xml', 'print'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800 uppercase"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProcessTemplateProjectScope roleKey={roleKey} sim={sim} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 text-sm"
          />
        </div>
        <div className="flex rounded-lg border border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`px-3 py-2 text-sm ${view === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('card')}
            className={`px-3 py-2 text-sm ${view === 'card' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {masterCatalog ? 'No master templates yet.' : 'No templates found. Select a project to see workspace copies.'}
        </p>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((row, idx) => (
            <div key={row.id} className="relative rounded-xl border border-gray-700 bg-gray-900/60 p-4">
              <RowNumberBadge number={getDisplayRowNumber(idx, filtered.length)} className="absolute top-3 right-3" />
              <Link to={`${listBase}/${row.id}`} className="font-medium text-gray-100 hover:text-blue-400">
                {row.title || 'Untitled'}
              </Link>
              <p className="text-xs text-gray-500 mt-1">{row.reference_code || row.id}</p>
              <p className="text-xs capitalize text-gray-400 mt-1">{row.status}{row.is_master ? ' · Master' : ''}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {canCopy && row.is_master && (
                  <button type="button" onClick={() => setCopyMaster(row)} className="text-xs text-blue-400 flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                )}
                {canEditMasterTemplate(roleKey, row, userId) && (
                  <Link to={`${listBase}/${row.id}/edit`} className="text-xs text-gray-400 hover:text-gray-200">Edit</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800/80 text-gray-400">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left">
                  <button type="button" onClick={() => cycleSort('reference_code')}>Ref {sortIcon('reference_code')}</button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button type="button" onClick={() => cycleSort('title')}>Title {sortIcon('title')}</button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button type="button" onClick={() => cycleSort('status')}>Status {sortIcon('status')}</button>
                </th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <TableRowNumberCell rowIndex={idx} totalRows={filtered.length} />
                  <td className="px-3 py-2 text-gray-300">{row.reference_code || '—'}</td>
                  <td className="px-3 py-2">
                    <Link to={`${listBase}/${row.id}`} className="text-blue-400 hover:underline">{row.title || 'Untitled'}</Link>
                  </td>
                  <td className="px-3 py-2 capitalize text-gray-400">{row.status}</td>
                  <td className="px-3 py-2 text-gray-400">{row.is_master ? 'Master' : 'Copy'}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {canCopy && row.is_master && (
                      <button type="button" onClick={() => setCopyMaster(row)} className="text-blue-400 text-xs">Copy</button>
                    )}
                    {canEditMasterTemplate(roleKey, row, userId) && (
                      <Link to={`${listBase}/${row.id}/edit`} className="text-gray-400 text-xs hover:text-gray-200">Edit</Link>
                    )}
                    <button type="button" onClick={() => handleHold(row)} className="text-amber-400 text-xs inline-flex items-center gap-0.5">
                      <Pause className="h-3 w-3" /> Hold
                    </button>
                    {canDeleteTemplate(roleKey, row, userId) && (
                      <button type="button" onClick={() => handleDelete(row)} className="text-red-400 text-xs">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateCopyModal
        open={!!copyMaster}
        master={copyMaster}
        slug={slug}
        projectId={projectId}
        sim={sim}
        onClose={() => setCopyMaster(null)}
        onCopied={() => load()}
      />
    </div>
  )
}
