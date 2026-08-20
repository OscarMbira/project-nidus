import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { platformDb } from '@nidus/supabase'
import * as delayApi from '../../services/delayService'
import * as simDelayApi from '../../services/sim/simDelayService'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import ViewToggle from '@nidus/ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useDelayPermissions } from '@nidus/shared/hooks/useDelayPermissions'
import DelayTemplateForm from './DelayTemplateForm'
import { resolveOversightFormVariant } from '@nidus/ui/FormSurface'
import { DELAY_CATEGORIES, TEMPLATE_STATUSES } from '@nidus/shared/constants/delayConstants'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'delay_category', label: 'Category' },
  { key: 'default_severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'tags', label: 'Tags' },
  { key: 'created_at', label: 'Created' },
]

export default function DelayTemplates({ isSim = false }) {
  const location = useLocation()
  const isPmoRoute =
    location.pathname.includes('/pmo/delays') || location.pathname.includes('/simulator/pmo/delays')
  const templateFormVariant = resolveOversightFormVariant(location.pathname)

  const { loading: permLoading, canManageTemplates } = useDelayPermissions()
  const canEdit = canManageTemplates && isPmoRoute

  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode(isSim ? 'sim-delay-tpl' : 'delay-tpl', 'list')
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [usage, setUsage] = useState({})

  const svc = isSim ? simDelayApi : delayApi

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: isSim ? 'nidus-sim-delay-tpl-sort' : 'nidus-delay-tpl-sort',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let c = false
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      let uid = null
      if (user) {
        const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        uid = data?.id || null
      }
      if (!c) {
        setAccountId(aid)
        setUserId(uid)
        setReady(true)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  const load = async () => {
    if (!accountId) return
    setLoading(true)
    try {
      const data = await svc.getDelayTemplates(accountId)
      setRows(data || [])
      const u = {}
      for (const t of data || []) {
        u[t.id] = await svc.countDelaysForTemplate(t.id)
      }
      setUsage(u)
    } catch (e) {
      toast.error(e?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [accountId, isSim])

  const filtered = useMemo(() => {
    const t = debounced.trim().toLowerCase()
    let r = rows
    if (t) {
      r = r.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(t) ||
          (x.delay_cause || '').toLowerCase().includes(t)
      )
    }
    if (statusFilter) r = r.filter((x) => x.status === statusFilter)
    return r
  }, [rows, debounced, statusFilter])

  const accessors = useMemo(
    () => ({
      name: (r) => r.name ?? '',
      delay_category: (r) => r.delay_category ?? '',
      default_severity: (r) => r.default_severity ?? '',
      status: (r) => r.status ?? '',
      tags: (r) => (Array.isArray(r.tags) ? r.tags.join(', ') : ''),
      created_at: (r) => r.created_at ?? '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(filtered, accessors), [filtered, sortedData, accessors])

  async function archiveRow(row) {
    if (!window.confirm('Archive this template?')) return
    try {
      await svc.deleteDelayTemplate(row.id)
      toast.success('Archived')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  if (!ready || permLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-wrap justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Delay templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Organisation-level reusable delay definitions (PMO).</p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={displayRows} baseFilename="Delay_Templates" disabled={!displayRows.length} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditRow(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            >
              <Plus className="h-5 w-5" /> New template
            </button>
          )}
        </div>
      </div>

      {!(formOpen && templateFormVariant === 'page') && (
      <>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            className="bg-transparent outline-none text-slate-900 dark:text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
          />
        </div>
        <select
          className="rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {TEMPLATE_STATUSES.map((s, index) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && viewMode === 'card' && (
        <div className="grid md:grid-cols-2 gap-4">
          {displayRows.map((r, index) => (
            <div key={r.id} className="rounded-xl border border-slate-600 p-4 bg-slate-900/40">
                          <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0 mb-2" />
              <div className="font-semibold text-slate-100">{r.name}</div>
              <div className="text-xs text-slate-400 mt-1 capitalize">{r.delay_category?.replace(/_/g, ' ')}</div>
              <div className="text-xs text-slate-500 mt-2">Used by {usage[r.id] ?? 0} project delay(s)</div>
              {canEdit && (
                <RowActionButton
                  variant="edit"
                  label="Edit delay template"
                  className="mt-2"
                  onClick={() => { setEditRow(r); setFormOpen(true); }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && viewMode === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {EXPORT_COLS.map((col) => (
                  <th key={col.key} className="px-3 py-2">
                    <button type="button" className="inline-flex gap-1" onClick={() => handleSort(col.key)}>
                      {col.label}
                      <span className="text-[10px]">{getSortDirectionForColumn(col.key)}</span>
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2">Usage</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, index) => (
                <tr key={r.id} className="border-t border-slate-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 capitalize">{r.delay_category?.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{r.default_severity}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{(r.tags || []).join(', ')}</td>
                  <td className="px-3 py-2 text-xs">{r.created_at}</td>
                  <td className="px-3 py-2">{usage[r.id] ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <>
                        <RowActionButton
                          variant="edit"
                          label="Edit delay template"
                          onClick={() => { setEditRow(r); setFormOpen(true); }}
                        />
                        <button type="button" className="text-red-400" onClick={() => archiveRow(r)}>
                          Archive
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      <DelayTemplateForm
        open={formOpen}
        variant={templateFormVariant}
        onClose={() => { setFormOpen(false); setEditRow(null); }}
        onSaved={() => load()}
        initial={editRow}
        accountId={accountId}
        userId={userId}
        isSim={isSim}
        canEdit={canEdit}
      />
    </div>
  )
}
