import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Copy, RefreshCw, Bot, Pencil, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { getMyProjects, getAllProjects } from '../../services/projectService'
import * as delayApi from '../../services/delayService'
import * as simDelayApi from '../../services/sim/simDelayService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useDelayPermissions } from '../../hooks/useDelayPermissions'
import DelayCard from '../../components/delays/DelayCard'
import DelaySummaryStats from '../../components/delays/DelaySummaryStats'
import DelaySeverityBadge from '../../components/delays/DelaySeverityBadge'
import DelayForm from './DelayForm'
import { DELAY_SOURCE_TYPES } from '../../constants/delayConstants'

const EXPORT_COLS = [
  { key: 'delay_reference', label: 'Reference' },
  { key: 'title', label: 'Title' },
  { key: 'delay_category', label: 'Category' },
  { key: 'severity', label: 'Severity' },
  { key: 'impact_schedule_days', label: 'Impact days' },
  { key: 'status', label: 'Status' },
  { key: 'source_type', label: 'Source' },
  { key: 'identified_date', label: 'Identified' },
]

export default function DelayRegister({ isSim: isSimProp, readOnly: readOnlyProp }) {
  const location = useLocation()
  const isSim = isSimProp ?? location.pathname.includes('/simulator/')
  const draftsOnly = location.pathname.includes('/drafts')
  const pmoOversight = location.pathname.includes('oversight')
  const platformView = location.pathname.includes('/platform/')

  const {
    loading: permLoading,
    canWriteDelay,
    canCopyTemplate,
    canDeleteDelay,
  } = useDelayPermissions()

  const readOnly =
    readOnlyProp === true ||
    pmoOversight ||
    (platformView && !canWriteDelay)

  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [ready, setReady] = useState(false)
  const [projects, setProjects] = useState([])
  const [practiceProjects, setPracticeProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode(isSim ? 'sim-delays' : 'platform-delays', 'list')
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [templates, setTemplates] = useState([])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'delay_reference', direction: 'asc' },
    storageKey: isSim ? 'nidus-sim-delays-sort' : 'nidus-delays-sort',
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

  useEffect(() => {
    if (!ready || !userId) return
    ;(async () => {
      if (isSim) {
        if (pmoOversight) {
          const { data: pp } = await simDb
            .from('practice_projects')
            .select('id, project_name')
            .order('project_name', { ascending: true })
          setPracticeProjects(pp || [])
        } else {
          const { data: auth } = await platformDb.auth.getUser()
          if (!auth?.user) return
          const { data: pp } = await simDb
            .from('practice_projects')
            .select('id, project_name')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
          setPracticeProjects(pp || [])
        }
      } else if (pmoOversight && accountId) {
        const res = await getAllProjects(accountId)
        if (res.success && res.data) setProjects(res.data)
      } else {
        const res = await getMyProjects(userId)
        if (res.success && res.data) setProjects(res.data)
      }
    })()
  }, [ready, userId, isSim, pmoOversight, accountId])

  const loadRows = useCallback(async () => {
    if (pmoOversight && !isSim && !accountId) {
      setRows([])
      return
    }
    if (isSim) {
      if (!pmoOversight && !projectId) {
        setRows([])
        return
      }
    } else if (!pmoOversight && !projectId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      let data = []
      if (isSim) {
        if (pmoOversight) {
          data = await simDelayApi.getAllDelays()
        } else {
          data = await simDelayApi.getDelaysByPracticeProject(projectId, {
            draftsOnly: draftsOnly || undefined,
          })
        }
      } else if (pmoOversight && accountId) {
        data = await delayApi.getAllDelays(accountId)
      } else if (projectId) {
        data = await delayApi.getDelaysByProject(projectId, {
          draftsOnly: draftsOnly || undefined,
        })
      }
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load delays')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [isSim, projectId, pmoOversight, accountId, draftsOnly])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const loadTemplates = useCallback(async () => {
    if (!accountId) return
    try {
      const data = isSim
        ? await simDelayApi.getDelayTemplates(accountId, { status: 'active' })
        : await delayApi.getDelayTemplates(accountId, { status: 'active' })
      setTemplates((data || []).filter((t) => t.status === 'active'))
    } catch (e) {
      toast.error(e?.message || 'Could not load templates')
    }
  }, [accountId, isSim])

  useEffect(() => {
    if (pickerOpen && accountId) loadTemplates()
  }, [pickerOpen, accountId, loadTemplates])

  const filtered = useMemo(() => {
    const t = debounced.trim().toLowerCase()
    let r = rows
    if (t) {
      r = r.filter(
        (x) =>
          (x.title || '').toLowerCase().includes(t) ||
          (x.delay_reference || '').toLowerCase().includes(t) ||
          (x.description || '').toLowerCase().includes(t)
      )
    }
    if (statusFilter) r = r.filter((x) => x.status === statusFilter)
    if (categoryFilter) r = r.filter((x) => x.delay_category === categoryFilter)
    if (sourceFilter) r = r.filter((x) => x.source_type === sourceFilter)
    if (pmoOversight && projectId) {
      r = r.filter((x) => (isSim ? x.practice_project_id : x.project_id) === projectId)
    }
    return r
  }, [rows, debounced, statusFilter, categoryFilter, sourceFilter, pmoOversight, projectId])

  const accessors = useMemo(
    () => ({
      delay_reference: (r) => r.delay_reference ?? '',
      title: (r) => r.title ?? '',
      delay_category: (r) => r.delay_category ?? '',
      severity: (r) => r.severity ?? '',
      impact_schedule_days: (r) => r.impact_schedule_days ?? '',
      status: (r) => r.status ?? '',
      source_type: (r) => r.source_type ?? '',
      identified_date: (r) => r.identified_date ?? '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(filtered, accessors), [filtered, sortedData, accessors])

  const summary = useMemo(() => {
    const api = isSim ? simDelayApi : delayApi
    return api.getDelaySummary(filtered)
  }, [filtered, isSim])

  const saveFns = useMemo(() => {
    if (isSim) {
      return {
        create: (p) => simDelayApi.createDelay(p),
        update: (id, p, ex) => simDelayApi.updateDelay(id, p, ex),
      }
    }
    return {
      create: (p) => delayApi.createDelay(p),
      update: (id, p, ex) => delayApi.updateDelay(id, p, ex),
    }
  }, [isSim])

  const fetchOwnerHistory = useCallback(
    (id) => (isSim ? simDelayApi.getOwnerHistory(id) : delayApi.getOwnerHistory(id)),
    [isSim]
  )

  async function handleSync() {
    if (!projectId) {
      toast.error('Select a project')
      return
    }
    try {
      const n = isSim
        ? await simDelayApi.syncOverdueDelays(projectId)
        : await delayApi.syncOverdueDelays(projectId)
      toast.success(`Sync completed (${n} source rows scanned)`)
      loadRows()
    } catch (e) {
      toast.error(e?.message || 'Sync failed')
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Archive this delay?')) return
    try {
      if (isSim) await simDelayApi.deleteDelay(row.id)
      else await delayApi.deleteDelay(row.id)
      toast.success('Archived')
      loadRows()
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  function openNew(prefill) {
    const pidKey = isSim ? 'practice_project_id' : 'project_id'
    const base = {
      [pidKey]: projectId,
      title: '',
      status: 'identified',
      severity: 'medium',
      delay_category: 'other',
      source_type: 'manual',
      is_draft: draftsOnly,
    }
    setEditRow({ ...base, ...prefill })
    setFormOpen(true)
  }

  function applyTemplate(tpl) {
    if (!accountId || !projectId) return
    const obj = isSim
      ? simDelayApi.copyTemplateToDelayObject(tpl, projectId, accountId)
      : delayApi.copyTemplateToDelayObject(tpl, projectId, accountId)
    openNew(obj)
    setPickerOpen(false)
  }

  if (!ready || permLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    )
  }

  const projectLabel = isSim ? 'Practice project' : 'Project'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {draftsOnly ? 'Delay drafts' : pmoOversight ? 'Delay register (oversight)' : 'Delay register'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Log and track schedule delays; auto-linked from overdue issues, risks, and defects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ExportListMenu
            columns={EXPORT_COLS}
            data={displayRows}
            baseFilename="Project_Delays"
            disabled={!displayRows.length}
          />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {!readOnly && canWriteDelay && projectId && !pmoOversight && (
            <>
              <button
                type="button"
                onClick={handleSync}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-sm text-slate-200 min-h-[44px]"
              >
                <RefreshCw className="h-4 w-4" /> Sync overdue
              </button>
              {canCopyTemplate && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-sm min-h-[44px]"
                >
                  <Copy className="h-4 w-4" /> Use template
                </button>
              )}
              <button
                type="button"
                onClick={() => openNew()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px]"
              >
                <Plus className="h-5 w-5" /> Log delay
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{projectLabel}</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={false}
          >
            <option value="">{pmoOversight ? 'All projects (oversight)' : 'Select…'}</option>
            {(isSim ? practiceProjects : projects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Search</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, reference…"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {['identified', 'under_review', 'approved', 'resolved', 'closed'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Source</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 px-3 py-2"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All</option>
            {DELAY_SOURCE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DelaySummaryStats summary={summary} />

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && viewMode === 'card' && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayRows.map((row) => (
            <DelayCard
              key={row.id}
              row={row}
              readOnly={readOnly}
              onEdit={() => {
                setEditRow(row)
                setFormOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {!loading && viewMode === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-sm text-left text-slate-200">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                {EXPORT_COLS.map((col) => (
                  <th key={col.key} className="px-3 py-2">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort(col.key)}>
                      {col.label}
                      <span className="text-[10px]">{getSortDirectionForColumn(col.key)}</span>
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-700 hover:bg-slate-800/60">
                  <td className="px-3 py-2 font-mono text-xs">{row.delay_reference}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2 capitalize">{row.delay_category?.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">
                    <DelaySeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-3 py-2">{row.impact_schedule_days ?? '—'}</td>
                  <td className="px-3 py-2 capitalize">{row.status}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      {row.is_auto_linked && <Bot className="h-3.5 w-3.5 text-cyan-400" aria-hidden />}
                      {row.source_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.identified_date || '—'}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      onClick={() => {
                        setEditRow(row)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> {readOnly ? 'View' : 'Edit'}
                    </button>
                    {!readOnly && canDeleteDelay && (
                      <button type="button" className="text-red-400 hover:underline inline-flex items-center gap-1" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-600 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-white">Choose template</h3>
              <button type="button" className="text-slate-400" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-lg border border-slate-600 p-3 hover:bg-slate-800"
                >
                  <div className="font-medium text-slate-100">{t.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{t.delay_category?.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
            {templates.length === 0 && <p className="text-slate-500 text-sm">No active templates.</p>}
          </div>
        </div>
      )}

      <DelayForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditRow(null)
        }}
        onSaved={() => loadRows()}
        initial={editRow}
        userId={userId}
        isSim={isSim}
        readOnly={readOnly}
        saveFns={saveFns}
        fetchOwnerHistory={fetchOwnerHistory}
      />
    </div>
  )
}
