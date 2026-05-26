import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Pencil, Search, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb } from '../../services/supabase/supabaseClient'
import * as itto from '../../services/ittoService'
import * as simItto from '../../services/simIttoService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import ITTOCard from '../../components/itto/ITTOCard'
import ITTOTemplateForm from './ITTOTemplateForm'
import ITTOProcessGroupBadge from '../../components/itto/ITTOProcessGroupBadge'
import { ITTO_PROCESS_GROUPS, ITTO_KNOWLEDGE_AREAS } from '../../constants/ittoConstants'
import { useIttoPermissions } from '../../hooks/useIttoPermissions'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'process_group', label: 'Process group' },
  { key: 'knowledge_area', label: 'Knowledge area' },
  { key: 'status', label: 'Status' },
  { key: 'is_draft', label: 'Draft' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Updated' },
]

export default function ITTOTemplateList({ isSim = false }) {
  const location = useLocation()
  const isPmoItoRoute =
    location.pathname.includes('/pmo/itto') || location.pathname.includes('/simulator/pmo/itto')
  const isPmItoRoute = location.pathname.includes('/pm/itto') || location.pathname.includes('/simulator/pm/itto')
  const { loading: permLoading, canManageOrgTemplates, canCopyTemplate } = useIttoPermissions()

  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [pgFilter, setPgFilter] = useState('')
  const [kaFilter, setKaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode(
    isSim ? 'sim-itto-templates' : 'platform-itto-templates',
    'list'
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: isSim ? 'nidus-sim-itto-tpl-sort' : 'nidus-itto-tpl-sort',
  })

  const svc = isSim ? simItto : itto

  /** Template CRUD only on PMO ITTO routes (not /pm/ or /platform/ read+copy views). */
  const canEdit = canManageOrgTemplates && isPmoItoRoute
  const showCopy =
    canCopyTemplate &&
    (isPmItoRoute ||
      location.pathname.includes('/platform/itto') ||
      location.pathname.includes('/simulator/itto') ||
      isPmoItoRoute)

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
    setErr(null)
    try {
      const data = await svc.getITTOTemplates(accountId, {
        process_group: pgFilter || undefined,
        knowledge_area: kaFilter || undefined,
        status: statusFilter || undefined,
      })
      setRows(data)
    } catch (e) {
      setErr(e?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready || !accountId) {
      if (ready && !accountId) setLoading(false)
      return
    }
    load()
  }, [ready, accountId, pgFilter, kaFilter, statusFilter])

  const filtered = useMemo(() => {
    const t = debounced.trim().toLowerCase()
    let r = rows
    if (t) {
      r = r.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(t) ||
          (x.description || '').toLowerCase().includes(t) ||
          (x.tags || []).some((tag) => String(tag).toLowerCase().includes(t))
      )
    }
    return r
  }, [rows, debounced])

  const accessors = useMemo(
    () => ({
      name: (r) => r.name ?? '',
      process_group: (r) => r.process_group ?? '',
      knowledge_area: (r) => r.knowledge_area ?? '',
      status: (r) => r.status ?? '',
      is_draft: (r) => (r.is_draft ? 'Yes' : 'No'),
      created_at: (r) => r.created_at ?? '',
      updated_at: (r) => r.updated_at ?? '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(filtered, accessors), [filtered, sortedData, accessors])

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => ({
        ...r,
        is_draft: r.is_draft ? 'Yes' : 'No',
      })),
    [displayRows]
  )

  const saveFn = useMemo(
    () => ({
      create: (p) => (isSim ? simItto.createSimITTOTemplate(p) : itto.createITTOTemplate(p)),
      update: (id, p) => (isSim ? simItto.updateSimITTOTemplate(id, p) : itto.updateITTOTemplate(id, p)),
    }),
    [isSim]
  )

  async function handleArchive(row) {
    if (!window.confirm('Archive this template?')) return
    try {
      if (isSim) await simItto.deleteSimITTOTemplate(row.id)
      else await itto.deleteITTOTemplate(row.id)
      toast.success(`Archived template ${row.id}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Archive failed')
    }
  }

  function copyTemplateIdForProject(row) {
    try {
      sessionStorage.setItem('nidus_itto_copy_template_id', row.id)
      sessionStorage.setItem('nidus_itto_copy_is_sim', isSim ? '1' : '0')
      toast.success('Template selected. Open Project ITTOs, pick a project, then create from template.')
    } catch {
      toast.error('Could not store template selection')
    }
  }

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>No organisation context found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ITTO templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organisation-level Inputs, Tools & Techniques, and Outputs definitions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="ITTO_Templates" disabled={!exportRows.length} />
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditRow(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium min-h-[44px]"
            >
              <Plus className="h-5 w-5" /> New template
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, description, tags…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px]"
          />
        </div>
        <select
          value={pgFilter}
          onChange={(e) => setPgFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-h-[44px]"
          aria-label="Filter by process group"
        >
          <option value="">All process groups</option>
          {ITTO_PROCESS_GROUPS.map((pg) => (
            <option key={pg} value={pg}>
              {pg}
            </option>
          ))}
        </select>
        <select
          value={kaFilter}
          onChange={(e) => setKaFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-h-[44px] max-w-[200px]"
          aria-label="Filter by knowledge area"
        >
          <option value="">All knowledge areas</option>
          {ITTO_KNOWLEDGE_AREAS.map((ka, index) => (
            <option key={ka} value={ka}>
              {ka}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-h-[44px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="archived">archived</option>
        </select>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Template layout" />
      </div>

      {err && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {err}
        </p>
      )}

      {loading || permLoading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRows.map((r, index) => (
            <ITTOCard
              key={r.id}
              record={r}
              footer={
                <div className="flex flex-wrap gap-2 justify-end">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                  {showCopy && (
                    <button
                      type="button"
                      onClick={() => copyTemplateIdForProject(r)}
                      className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400"
                    >
                      <Copy className="h-4 w-4" /> Copy for project
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditRow(r)
                          setFormOpen(true)
                        }}
                        className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(r)}
                        className="text-sm text-amber-700 dark:text-amber-400"
                      >
                        Archive
                      </button>
                    </>
                  )}
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <TableRowNumberHeader className="!normal-case" />
                {['name', 'process_group', 'knowledge_area', 'status', 'created_at', 'updated_at'].map((col) => (
                  <th key={col} className="text-left p-3">
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1"
                    >
                      {col === 'process_group'
                        ? 'Process'
                        : col === 'knowledge_area'
                          ? 'Knowledge'
                          : col === 'created_at'
                            ? 'Created'
                            : col.replace('_', ' ')}
                      <span className="text-xs text-gray-500" aria-hidden>
                        {getSortDirectionForColumn(col) === 'asc'
                          ? '↑'
                          : getSortDirectionForColumn(col) === 'desc'
                            ? '↓'
                            : '⇅'}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, index) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 text-gray-900 dark:text-white font-medium">{r.name}</td>
                  <td className="p-3">
                    <ITTOProcessGroupBadge processGroup={r.process_group} />
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{r.knowledge_area}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{r.status}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">{r.created_at?.slice?.(0, 10) || '—'}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">{r.updated_at?.slice?.(0, 10) || '—'}</td>
                  <td className="p-3 text-right space-x-2">
                    {showCopy && (
                      <button type="button" className="text-sky-600 dark:text-sky-400" onClick={() => copyTemplateIdForProject(r)}>
                        Copy
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="text-gray-700 dark:text-gray-200"
                          onClick={() => {
                            setEditRow(r)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="text-amber-700 dark:text-amber-400" onClick={() => handleArchive(r)}>
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

      <ITTOTemplateForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditRow(null)
        }}
        onSaved={() => load()}
        organisationId={accountId}
        userId={userId}
        initial={editRow}
        saveFn={saveFn}
      />
    </div>
  )
}
