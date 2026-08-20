import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { simDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import {
  resolveOversightProjectScope,
  listOversightDocuments,
} from '@nidus/shared/services/documentOversightService.js'
import { orgTemplateDetailPath } from '@nidus/shared/utils/organisationalTemplateRoutes.js'
import { toProjectDocumentLabel } from '@nidus/shared/utils/projectDocumentNaming.js'

const DETAIL_LIST_BASE = '/simulator/pm/documents/project'

const TIER_META = {
  portfolio: { menuCode: 'sim_pmo_portfolio_document_oversight', defaultTitle: 'Document Oversight', empty: 'You are not currently the manager of any portfolio, so there are no documents to show.' },
  programme: { menuCode: 'sim_pmo_programme_document_oversight', defaultTitle: 'Document Oversight', empty: 'You are not currently the manager of any programme, so there are no documents to show.' },
  pmo: { menuCode: 'sim_pmo_document_oversight', defaultTitle: 'Document Oversight', empty: 'No project documents with a signatory requirement exist yet.' },
}

const STATUS_LABELS = {
  pending: 'Pending',
  partially_signed: 'Partially signed',
  fully_signed: 'Fully signed',
  declined: 'Declined',
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

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'name', label: 'Document' },
  { key: 'project_name', label: 'Project' },
  { key: 'statusLabel', label: 'Status' },
  { key: 'signersLabel', label: 'Signed by' },
]

/**
 * Document Oversight (v897) — read-only cross-project register for Portfolio/Programme/PMO
 * roles: project documents (with a signatory requirement) scoped to their own branch of
 * the hierarchy, with current signing status. No edit/capture actions — view only, links
 * out to the existing Project Documents detail page. Simulator (`sim` schema) mirror of
 * pmo-module/pages/DocumentOversightPage.jsx.
 * @param {{ tier: 'portfolio'|'programme'|'pmo' }} props
 */
export default function DocumentOversightPage({ tier }) {
  const navigate = useNavigate()
  const meta = TIER_META[tier] || TIER_META.pmo
  const [pageTitle, setPageTitle] = useState(meta.defaultTitle)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [viewMode, setViewMode] = useViewMode(`sim-document-oversight-${tier}`, 'list')

  useEffect(() => {
    getMenuLabel(simDb, meta.menuCode, meta.defaultTitle).then(setPageTitle)
  }, [meta.menuCode, meta.defaultTitle])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) {
        setDocuments([])
        return
      }
      const scopeResult = await resolveOversightProjectScope(simDb, { tier, schema: 'sim' })
      if (!scopeResult.success) throw new Error(scopeResult.message)
      const docsResult = await listOversightDocuments(simDb, {
        accountId,
        projectScope: scopeResult.data,
        schema: 'sim',
      })
      if (!docsResult.success) throw new Error(docsResult.message)
      setDocuments(docsResult.data)
    } catch (e) {
      toast.error(e.message || 'Failed to load document oversight register')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [tier])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => {
    const withLabels = documents.map((d) => ({
      ...d,
      statusLabel: STATUS_LABELS[d.status] || d.status,
      signersLabel: d.signed_slots.map((s) => `${s.role_label}: ${s.signer_label || 'Unknown'}`).join('; '),
    }))
    const q = search.trim().toLowerCase()
    let filtered = withLabels
    if (q) {
      filtered = filtered.filter(
        (r) =>
          displayDocName(r.name).toLowerCase().includes(q) ||
          (r.project_name || '').toLowerCase().includes(q),
      )
    }
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }
    if (sortKey && sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1
      filtered = [...filtered].sort((a, b) => {
        const av = String(sortKey === 'name' ? displayDocName(a.name) : a[sortKey] ?? '').toLowerCase()
        const bv = String(sortKey === 'name' ? displayDocName(b.name) : b[sortKey] ?? '').toLowerCase()
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return 0
      })
    }
    return filtered
  }, [documents, search, statusFilter, sortKey, sortDir])

  const exportRows = useMemo(
    () => withExportRowNumbers(EXPORT_COLS.filter((c) => c.key !== '_rowNumber'), rows),
    [rows],
  )

  const goToDetail = (row) => {
    navigate(orgTemplateDetailPath(DETAIL_LIST_BASE, row.template_reference || row.id))
  }

  const onSort = (col) => {
    const next = cycleSort(sortKey, sortDir, col)
    setSortKey(next.key)
    setSortDir(next.dir)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only view of signed/signatory-tracked project documents in your{' '}
            {tier === 'pmo' ? 'organisation' : tier}. Click a document to open it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportListMenu
            columns={EXPORT_COLS}
            data={exportRows}
            baseFilename="document_oversight"
            disabled={!rows.length}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search documents or projects…"
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
          <option value="pending">Pending</option>
          <option value="partially_signed">Partially signed</option>
          <option value="fully_signed">Fully signed</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {!loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {rows.length} document{rows.length === 1 ? '' : 's'}
        </p>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{meta.empty}</p>
      )}

      {!loading && viewMode === 'list' && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('name')}>
                    Document <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'name')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('project_name')}>
                    Project <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'project_name')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('statusLabel')}>
                    Status <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'statusLabel')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Signed by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={() => goToDetail(row)}
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{displayDocName(row.name)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.project_name}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.statusLabel}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {row.signed_slots.length
                      ? row.signed_slots.map((s) => `${s.role_label}: ${s.signer_label || 'Unknown'}`).join('; ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && viewMode !== 'list' && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => (
            <article
              key={row.id}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
              onClick={() => goToDetail(row)}
            >
              <div className="mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
              </div>
              <h2 className="font-medium text-gray-900 dark:text-gray-100">{displayDocName(row.name)}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{row.project_name}</p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{row.statusLabel}</p>
              {row.signed_slots.length > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {row.signed_slots.map((s) => `${s.role_label}: ${s.signer_label || 'Unknown'}`).join('; ')}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
