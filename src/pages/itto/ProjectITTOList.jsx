import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Pencil, Search, Trash2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { getMyProjects } from '../../services/projectService'
import * as itto from '../../services/ittoService'
import * as simItto from '../../services/simIttoService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import ITTOCard from '../../components/itto/ITTOCard'
import ProjectITTOForm from './ProjectITTOForm'
import ITTOProcessGroupBadge from '../../components/itto/ITTOProcessGroupBadge'
import { ITTO_PROCESS_GROUPS } from '../../constants/ittoConstants'
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

export default function ProjectITTOList({ isSim = false }) {
  const location = useLocation()
  const draftsOnly =
    location.pathname.includes('/drafts') ||
    location.pathname.includes('/itto/drafts')

  const { loading: permLoading, canWriteProjectIto, canDeleteProjectIto } = useIttoPermissions()

  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [ready, setReady] = useState(false)
  const [projects, setProjects] = useState([])
  const [practiceProjects, setPracticeProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [pgFilter, setPgFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode(
    isSim ? 'sim-itto-project' : 'platform-itto-project',
    'list'
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: isSim ? 'nidus-sim-itto-proj-sort' : 'nidus-itto-proj-sort',
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
        const { data, error } = await platformDb.auth.getUser()
        if (error || !data?.user) return
        const { data: rowsSim, error: e2 } = await simDb
          .from('practice_projects')
          .select('id, project_name')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
        if (!e2) setPracticeProjects(rowsSim || [])
      } else {
        const res = await getMyProjects(userId)
        if (res.success && res.data) setProjects(res.data)
      }
    })()
  }, [ready, userId, isSim])

  useEffect(() => {
    try {
      const tid = sessionStorage.getItem('nidus_itto_copy_template_id')
      const sim = sessionStorage.getItem('nidus_itto_copy_is_sim')
      if (tid && (sim === '1') === isSim) {
        setTemplatePickerOpen(true)
      }
    } catch {
      /* ignore */
    }
  }, [isSim])

  const loadTemplatesForPicker = useCallback(async () => {
    if (!accountId) return
    try {
      const data = isSim ? await simItto.getSimITTOTemplates(accountId) : await itto.getITTOTemplates(accountId)
      setTemplates(data.filter((t) => t.status !== 'archived'))
    } catch (e) {
      toast.error(e?.message || 'Could not load templates')
    }
  }, [accountId, isSim])

  useEffect(() => {
    if (templatePickerOpen && accountId) loadTemplatesForPicker()
  }, [templatePickerOpen, accountId, loadTemplatesForPicker])

  const load = async () => {
    if (isSim) {
      if (!projectId) {
        setRows([])
        return
      }
    } else {
      if (!projectId) {
        setRows([])
        return
      }
    }
    setLoading(true)
    setErr(null)
    try {
      const data = isSim
        ? await simItto.getSimProjectITTOs(projectId, {
            process_group: pgFilter || undefined,
            status: statusFilter || undefined,
            draftsOnly: draftsOnly || undefined,
          })
        : await itto.getProjectITTOs(projectId, {
            process_group: pgFilter || undefined,
            status: statusFilter || undefined,
            draftsOnly: draftsOnly || undefined,
          })
      setRows(data)
    } catch (e) {
      setErr(e?.message || 'Failed to load project ITTOs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId, pgFilter, statusFilter, draftsOnly, isSim])

  const filtered = useMemo(() => {
    const t = debounced.trim().toLowerCase()
    let r = rows
    if (t) {
      r = r.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(t) ||
          (x.description || '').toLowerCase().includes(t)
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

  const saveFn = useMemo(() => {
    if (isSim) {
      return {
        create: (payload) => simItto.createSimProjectITTO(payload),
        update: (id, p) => simItto.updateSimProjectITTO(id, p),
        projectPayload: (pid) => ({ practice_project_id: pid }),
      }
    }
    return {
      create: (payload) => itto.createProjectITTO(payload),
      update: (id, p) => itto.updateProjectITTO(id, p),
      projectPayload: (pid) => ({ project_id: pid }),
    }
  }, [isSim])

  async function handleDelete(row) {
    if (!window.confirm('Delete this project ITTO?')) return
    try {
      if (isSim) await simItto.deleteSimProjectITTO(row.id)
      else await itto.deleteProjectITTO(row.id)
      toast.success(`Deleted ${row.id}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  async function runCopyFromTemplate(templateId) {
    if (!projectId || !userId) {
      toast.error('Select a project first')
      return
    }
    try {
      if (isSim) {
        await simItto.copySimFromTemplate(templateId, projectId, '', userId)
      } else {
        await itto.copyFromTemplate(templateId, projectId, '', userId)
      }
      toast.success('Copied template to project — draft created')
      try {
        sessionStorage.removeItem('nidus_itto_copy_template_id')
        sessionStorage.removeItem('nidus_itto_copy_is_sim')
      } catch {
        /* ignore */
      }
      setTemplatePickerOpen(false)
      load()
    } catch (e) {
      toast.error(e?.message || 'Copy failed')
    }
  }

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  const projectLabel = isSim ? 'Practice project' : 'Project'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {draftsOnly ? 'ITTO drafts' : 'Project ITTOs'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tailored Inputs, Tools & Techniques, and Outputs for a specific project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Project_ITTOs" disabled={!exportRows.length} />
          {canWriteProjectIto && projectId && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditRow(null)
                  setFormOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium min-h-[44px]"
              >
                <Plus className="h-5 w-5" /> New ITTO
              </button>
              <button
                type="button"
                onClick={() => {
                  setTemplatePickerOpen(true)
                  loadTemplatesForPicker()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm min-h-[44px]"
              >
                <Copy className="h-4 w-4" /> Copy from template
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <label className="block max-w-md">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{projectLabel}</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white min-h-[44px]"
          >
            <option value="">Select…</option>
            {isSim
              ? practiceProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name || p.id}
                  </option>
                ))
              : projects.map((p, index) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name || p.id}
                  </option>
                ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
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
            {ITTO_PROCESS_GROUPS.map((pg, index) => (
              <option key={pg} value={pg}>
                {pg}
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
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Project ITTO layout" />
        </div>
      </div>

      {err && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {err}
        </p>
      )}

      {!projectId ? (
        <p className="text-gray-600 dark:text-gray-400">Select a {projectLabel.toLowerCase()} to view ITTOs.</p>
      ) : loading || permLoading ? (
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
                  {canWriteProjectIto && (
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
                  )}
                  {canDeleteProjectIto && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
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
                    {canWriteProjectIto && (
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
                    )}
                    {canDeleteProjectIto && (
                      <button type="button" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(r)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectITTOForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditRow(null)
        }}
        onSaved={() => load()}
        projectKey={projectId}
        userId={userId}
        initial={editRow}
        saveFn={saveFn}
        templateId={editRow?.template_id || null}
      />

      {templatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Pick template</h3>
            <ul className="space-y-2">
              {templates.map((t, index) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => runCopyFromTemplate(t.id)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {t.name}{' '}
                    <span className="text-xs text-gray-500">
                      ({t.process_group} · {t.knowledge_area})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setTemplatePickerOpen(false)}
              className="mt-4 w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
