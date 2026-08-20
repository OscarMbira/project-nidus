import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Copy, RefreshCw, Bot, Search, Clock } from 'lucide-react'
import { RowActionButton, DashboardRegisterTabBar, RegisterOpenItemsWidget } from '@nidus/ui'
import toast from 'react-hot-toast'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { platformDb, simDb } from '@nidus/supabase'
import { getMyProjects, getAllProjects } from '../../services/projectService'
import * as delayApi from '../../services/delayService'
import * as simDelayApi from '../../services/sim/simDelayService'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import ViewToggle from '@nidus/ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useDelayPermissions } from '@nidus/shared/hooks/useDelayPermissions'
import DelayCard from '../../components/delays/DelayCard'
import DelaySummaryStats from '../../components/delays/DelaySummaryStats'
import DelaySeverityBadge from '../../components/delays/DelaySeverityBadge'
import DelayForm from './DelayForm'
import { resolveOversightFormVariant } from '@nidus/ui/FormSurface'
import { DELAY_SOURCE_TYPES } from '@nidus/shared/constants/delayConstants'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

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
  const delayFormVariant = resolveOversightFormVariant(location.pathname)
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
  const [openOnly, setOpenOnly] = useState(false)
  const [resolvedOnly, setResolvedOnly] = useState(false)
  const [autoLinkedOnly, setAutoLinkedOnly] = useState(false)
  const [viewMode, setViewMode] = useViewMode(isSim ? 'sim-delays' : 'platform-delays', 'list')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('edit') // 'view' | 'edit' | 'create'
  const [editRow, setEditRow] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [pageTab, setPageTab] = useState('dashboard') // 'dashboard' | 'register'

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
    if (openOnly) r = r.filter((x) => x.status !== 'resolved' && x.status !== 'closed')
    if (resolvedOnly) r = r.filter((x) => x.status === 'resolved' || x.status === 'closed')
    if (autoLinkedOnly) r = r.filter((x) => x.is_auto_linked)
    if (pmoOversight && projectId) {
      r = r.filter((x) => (isSim ? x.practice_project_id : x.project_id) === projectId)
    }
    return r
  }, [rows, debounced, statusFilter, categoryFilter, sourceFilter, openOnly, resolvedOnly, autoLinkedOnly, pmoOversight, projectId])

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

  const openDelays = useMemo(
    () =>
      [...rows]
        .filter((r) => r.status !== 'resolved' && r.status !== 'closed')
        .sort((a, b) => new Date(b.identified_date || 0) - new Date(a.identified_date || 0))
        .slice(0, 5),
    [rows]
  )

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
    setFormMode('create')
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
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  const projectLabel = isSim ? 'Practice project' : 'Project'

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {draftsOnly ? 'Delay drafts' : pmoOversight ? 'Delay register (oversight)' : 'Delay register'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Log and track schedule delays; auto-linked from overdue issues, risks, and defects.
            </p>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Delay register sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap gap-2 items-center justify-end">
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
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 min-h-[44px]"
                >
                  <RefreshCw className="h-4 w-4" /> Sync overdue
                </button>
                {canCopyTemplate && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 min-h-[44px]"
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
        )}
      </div>

      {!(formOpen && delayFormVariant === 'page') && (
      <>
      <div className="mb-4">
        <label className="block max-w-md">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{projectLabel}</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
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
      </div>

      {pageTab === 'dashboard' && (
        <div role="tabpanel" aria-label="Delay dashboard" className="space-y-6">
          <DelaySummaryStats
            summary={summary}
            onCardClick={(key) => {
              setStatusFilter('')
              setOpenOnly(key === 'open')
              setResolvedOnly(key === 'resolved')
              setAutoLinkedOnly(key === 'auto_linked')
              setPageTab('register')
            }}
          />
          <RegisterOpenItemsWidget
            title="Open Delays"
            icon={Clock}
            rows={openDelays}
            totalCount={rows.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length}
            columns={[
              { key: 'delay_reference', label: 'Reference', className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
              { key: 'title', label: 'Title', className: 'font-medium text-gray-900 dark:text-white' },
              { key: 'severity', label: 'Severity', render: (r) => <DelaySeverityBadge severity={r.severity} /> },
              { key: 'impact_schedule_days', label: 'Days lost', sortAccessor: (r) => Number(r.impact_schedule_days) || 0, className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap' },
              { key: 'identified_date', label: 'Identified', render: (r) => (r.identified_date ? new Date(r.identified_date).toLocaleDateString() : '—'), className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap' },
            ]}
            rowKey={(r) => r.id}
            searchFields={['title', 'delay_reference']}
            onRowClick={(row) => {
              setEditRow(row)
              setFormMode(readOnly ? 'view' : 'edit')
              setFormOpen(true)
            }}
            onViewAll={() => setPageTab('register')}
            viewAllLabel="Open full Delay Register"
            emptyMessage="No open delays"
          />
        </div>
      )}

      {pageTab === 'register' && (
      <div role="tabpanel" aria-label="Delay register">
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, reference…"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
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

      {(openOnly || resolvedOnly || autoLinkedOnly) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          {openOnly && <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Open only</span>}
          {resolvedOnly && <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">Resolved only</span>}
          {autoLinkedOnly && <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">Auto-linked only</span>}
          <button
            type="button"
            onClick={() => { setOpenOnly(false); setResolvedOnly(false); setAutoLinkedOnly(false) }}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && viewMode === 'card' && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayRows.map((row, index) => (
            <DelayCard
              key={row.id}
              row={row}
              rowNumber={getDisplayRowNumber(index)}
              readOnly={readOnly}
              onEdit={() => {
                setEditRow(row)
                setFormMode(readOnly ? 'view' : 'edit')
                setFormOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {!loading && viewMode === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-[72rem] w-full text-sm text-left text-gray-900 dark:text-gray-100">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-300">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {EXPORT_COLS.map((col) => (
                  <th key={col.key} className="px-3 py-2 whitespace-nowrap">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort(col.key)}>
                      {col.label}
                      <span className="text-[10px]">{getSortDirectionForColumn(col.key)}</span>
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-gray-700 dark:text-gray-200">{row.delay_reference}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2 capitalize whitespace-nowrap text-gray-700 dark:text-gray-200">{row.delay_category?.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">
                    <DelaySeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.impact_schedule_days ?? '—'}</td>
                  <td className="px-3 py-2 capitalize whitespace-nowrap text-gray-700 dark:text-gray-200">{row.status}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    <span className="inline-flex items-center gap-1">
                      {row.is_auto_linked && <Bot className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden />}
                      {row.source_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{row.identified_date || '—'}</td>
                  <td
                    className="px-3 py-2 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center justify-end gap-1">
                      <RowActionButton
                        variant="view"
                        label="View delay"
                        onClick={() => {
                          setEditRow(row)
                          setFormMode('view')
                          setFormOpen(true)
                        }}
                      />
                      {!readOnly && (
                        <RowActionButton
                          variant="edit"
                          label="Edit delay"
                          onClick={() => {
                            setEditRow(row)
                            setFormMode('edit')
                            setFormOpen(true)
                          }}
                        />
                      )}
                      {!readOnly && canDeleteDelay && (
                        <RowActionButton variant="delete" label="Delete delay" onClick={() => handleDelete(row)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>
      )}

      </>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Choose template</h3>
              <button type="button" className="text-gray-500 dark:text-gray-400" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t, index) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t.delay_category?.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
            {templates.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No active templates.</p>}
          </div>
        </div>
      )}

      <DelayForm
        open={formOpen}
        variant={delayFormVariant}
        onClose={() => {
          setFormOpen(false)
          setEditRow(null)
          setFormMode('edit')
        }}
        onSaved={() => loadRows()}
        initial={editRow}
        userId={userId}
        isSim={isSim}
        readOnly={readOnly || formMode === 'view'}
        saveFns={saveFns}
        fetchOwnerHistory={fetchOwnerHistory}
      />
    </div>
  )
}
