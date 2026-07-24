import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { simDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { listTemplateLibraryNodes } from '@nidus/shared/services/pmTemplateLibraryService.js'
import { archiveTemplateNode } from '@nidus/shared/services/pmTemplateNodeService.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { METHODOLOGY_TRACK_DEFS, normalizeProjectDeliveryTrack } from '@nidus/config/methodologyMenuUtils.js'

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Tier' },
  { key: 'domain', label: 'Domain' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'status', label: 'Status' },
]

const TIER_LABELS = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project', pmo: 'PMO' }

function methodologyLabel(m) {
  if (m == null || String(m).trim() === '') return 'Common'
  const def = METHODOLOGY_TRACK_DEFS.find((d) => d.track === normalizeProjectDeliveryTrack(m))
  return def?.shortLabel || m
}

/**
 * Organisational Templates — the account's own copies/customisations of Global
 * Templates (is_system_synced=false). Separate page/menu entry from the Global
 * Template Library by design (v805) — this is where PMO views, edits, and retires
 * the organisation's own template set.
 * Route: /simulator/pmo/organisational-templates
 */
export default function OrganisationalTemplatesPage() {
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState(() => searchParams.get('tier') || '')
  const [domainFilter, setDomainFilter] = useState(() => searchParams.get('domain') || '')
  const [methodologyFilter, setMethodologyFilter] = useState(() => searchParams.get('methodology') || '')
  const [deletingId, setDeletingId] = useState(null)
  const [viewMode, setViewMode] = useViewMode('sim-pmo-organisational-templates', 'list')
  // Titles/cross-links mirror the DB-driven menu_items rows — no hardcoded duplicate
  // strings that can drift out of sync with an admin-renamed menu item.
  const [pageTitle, setPageTitle] = useState('Organisational Templates')
  const [globalLinkLabel, setGlobalLinkLabel] = useState('Global Template Library')

  useEffect(() => {
    getMenuLabel(simDb, 'sim_tpl_organisational', 'Organisational Templates').then(setPageTitle)
    getMenuLabel(simDb, 'sim_tpl_library', 'Global Template Library').then(setGlobalLinkLabel)
  }, [])

  // Sidebar leaves (v807) link to this same page with different ?tier=&domain=&methodology=
  // query strings — sync filters when navigating between sibling leaves, not just on mount.
  useEffect(() => {
    setTierFilter(searchParams.get('tier') || '')
    setDomainFilter(searchParams.get('domain') || '')
    setMethodologyFilter(searchParams.get('methodology') || '')
  }, [searchParams])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) {
        setRows([])
        return
      }
      const data = await listTemplateLibraryNodes(simDb, accountId, { isSystemSynced: false })
      setRows(data)
    } catch (e) {
      toast.error(e.message || 'Failed to load organisational templates')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRows() }, [loadRows])

  const filtered = useMemo(() => {
    let list = rows
    if (tierFilter) list = list.filter((r) => r.tier === tierFilter)
    if (domainFilter) list = list.filter((r) => r.domain === domainFilter)
    if (methodologyFilter) list = list.filter((r) => r.methodology === methodologyFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.name, r.domain, r.tier, r.category, r.methodology]
          .some((v) => String(v || '').toLowerCase().includes(q)),
      )
    }
    return list
  }, [rows, tierFilter, domainFilter, methodologyFilter, search])

  const { columns: exportCols, rows: exportRows } = useMemo(
    () => withExportRowNumbers(
      EXPORT_COLS.filter((c) => c.key !== '_rowNumber'),
      filtered.map((r) => ({ ...r, methodology: r.methodology || 'common' })),
    ),
    [filtered],
  )

  const handleDelete = async (row) => {
    if (!window.confirm(`Retire "${row.name}"? It will no longer appear in Organisational Templates or be inherited by downstream tiers.`)) {
      return
    }
    setDeletingId(row.id)
    try {
      await archiveTemplateNode(simDb, row.id)
      toast.success(`Retired "${row.name}"`)
      await loadRows()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your organisation's own customised templates — copied from the Global Template Library and editable.
            Downstream Portfolio/Programme/Project tiers inherit from these, not the raw Global versions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportListMenu
            columns={exportCols}
            data={exportRows}
            baseFilename="organisational_templates"
            disabled={!filtered.length}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="">All tiers</option>
          {Object.entries(TIER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="">All domains</option>
          <option value="fields">Fields</option>
          <option value="form_template">Forms</option>
          <option value="process_template">Process docs</option>
          <option value="portfolio_template">Portfolio templates</option>
          <option value="programme_template">Programme templates</option>
          <option value="project_template">Project templates</option>
          <option value="opa">OPA</option>
        </select>
        <select
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={methodologyFilter}
          onChange={(e) => setMethodologyFilter(e.target.value)}
        >
          <option value="">All methodologies</option>
          {METHODOLOGY_TRACK_DEFS.map((d) => (
            <option key={d.track} value={d.track}>{d.shortLabel}</option>
          ))}
        </select>
        <Link
          to="/simulator/pmo/template-library"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {globalLinkLabel}
        </Link>
      </div>

      {!loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {rows.length} template{rows.length === 1 ? '' : 's'}
        </p>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No organisational templates yet. Copy one from the{' '}
          <Link to="/simulator/pmo/template-library" className="text-blue-600 hover:underline dark:text-blue-400">
            {globalLinkLabel}
          </Link>.
        </p>
      )}

      {!loading && viewMode === 'list' && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Tier</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Domain</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Methodology</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                    {row.name}
                    {row.parent_node_id ? (
                      <span className="ml-2 text-xs text-gray-400">from Global</span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">custom draft</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{TIER_LABELS[row.tier] || row.tier}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.domain}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{methodologyLabel(row.methodology)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/simulator/pmo/organisational-templates/${row.template_reference || row.id}`}
                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-3 w-3" />
                        View / Edit
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingId === row.id ? 'Retiring…' : 'Retire'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && viewMode !== 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row, index) => (
            <article
              key={row.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-2 text-xs text-gray-400">#{getDisplayRowNumber(index)}</div>
              <h2 className="font-medium text-gray-900 dark:text-gray-100">{row.name}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {TIER_LABELS[row.tier] || row.tier} · {row.domain} · {methodologyLabel(row.methodology)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{row.parent_node_id ? 'from Global' : 'custom draft'}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/simulator/pmo/organisational-templates/${row.template_reference || row.id}`}
                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-3 w-3" />
                  View / Edit
                </Link>
                <button
                  type="button"
                  disabled={deletingId === row.id}
                  onClick={() => handleDelete(row)}
                  className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingId === row.id ? 'Retiring…' : 'Retire'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
