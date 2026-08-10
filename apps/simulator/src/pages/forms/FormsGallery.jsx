import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  canArchiveFormInstance,
  canEditFormInstance,
  filterFormInstancesForRegister,
  formInstanceStatusLabel,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import FormTemplateGallery from '../../components/forms/FormTemplateGallery'
import DraftFormQueue from '../../components/forms/DraftFormQueue'
import {
  archiveForm,
  getFormsByProject,
  resolveEffectiveFormTemplate,
} from '../../services/formEngineService'
import { simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { listNearestFormTemplatesForProject } from '@nidus/shared/services/projectFormTemplateCatalog.js'

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'template_name', label: 'Template' },
  { key: 'instance_reference', label: 'Reference' },
  { key: 'statusLabel', label: 'Status' },
  { key: 'updated_at', label: 'Last updated' },
]

function cycleSort(currentKey, currentDir, nextKey) {
  if (currentKey !== nextKey) return { key: nextKey, dir: 'asc' }
  if (currentDir === 'asc') return { key: nextKey, dir: 'desc' }
  return { key: '', dir: '' }
}

function sortIcon(sortKey, sortDir, col) {
  if (sortKey !== col) return '⇅'
  return sortDir === 'asc' ? '↑' : '↓'
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
  if (s === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (s === 'in_review' || s === 'submitted') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  }
  if (s === 'archived') return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
}

function formatUpdatedAt(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

/**
 * Process Group Forms gallery + Project Forms register (v850).
 * Keeps FormTemplateGallery ("start new") and DraftFormQueue; adds All Records.
 */
export default function FormsGallery({ mode = 'platform', basePath = '/platform/projects' }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [templates, setTemplates] = useState([])
  const [instances, setInstances] = useState([])
  const [recommended, setRecommended] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [viewMode, setViewMode] = useViewMode('project-forms-register', 'list')

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '')
  }, [searchParams])

  const loadInstances = useCallback(async () => {
    if (!projectId) {
      setInstances([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const r = await getFormsByProject(projectId, {}, mode)
      if (r.success) setInstances(r.data || [])
      else {
        toast.error(r.message || 'Failed to load form records')
        setInstances([])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, mode])

  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      if (!projectId) {
        setTemplates([])
        return
      }
      try {
        const accountId = await getCurrentUserAccountId()
        if (!accountId) {
          if (!cancelled) setTemplates([])
          return
        }
        const rows = await listNearestFormTemplatesForProject(simDb, {
          accountId,
          projectId,
          schema: 'sim',
        })
        if (!cancelled) setTemplates(rows)
      } catch (e) {
        console.error('[FormsGallery] nearest template load failed', e)
        toast.error(e.message || 'Failed to load form templates')
        if (!cancelled) setTemplates([])
      }
    }
    loadTemplates()
    return () => { cancelled = true }
  }, [mode, projectId])

  useEffect(() => {
    loadInstances()
  }, [loadInstances])

  useEffect(() => {
    if (!projectId) return
    resolveEffectiveFormTemplate(projectId, mode).then((r) => r.success && setRecommended(r.data))
  }, [projectId, mode])

  const drafts = useMemo(() => instances.filter((x) => x.status === 'draft'), [instances])

  const filtered = useMemo(() => {
    let rows = filterFormInstancesForRegister(instances, { statusFilter, search }).map((r) => ({
      ...r,
      statusLabel: formInstanceStatusLabel(r.status),
      template_name: r.template_name || r.template_code || 'Form',
    }))
    if (sortKey && sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        let av = a[sortKey]
        let bv = b[sortKey]
        if (sortKey === 'updated_at') {
          av = av ? new Date(av).getTime() : 0
          bv = bv ? new Date(bv).getTime() : 0
          return (av - bv) * dir
        }
        av = String(av ?? '').toLowerCase()
        bv = String(bv ?? '').toLowerCase()
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return 0
      })
    }
    return rows
  }, [instances, statusFilter, search, sortKey, sortDir])

  const exportRows = useMemo(
    () =>
      withExportRowNumbers(
        EXPORT_COLS.filter((c) => c.key !== '_rowNumber'),
        filtered.map((r) => ({
          ...r,
          updated_at: formatUpdatedAt(r.updated_at),
          instance_reference: r.instance_reference || r.id,
        })),
      ),
    [filtered],
  )

  const onSort = (col) => {
    const next = cycleSort(sortKey, sortDir, col)
    setSortKey(next.key)
    setSortDir(next.dir)
  }

  const handleArchive = async (row) => {
    if (!canArchiveFormInstance(row.status)) return
    if (
      !window.confirm(
        `Archive "${row.template_name || 'this form'}"? It will move to Archived and leave the default list.`,
      )
    ) {
      return
    }
    setBusyId(row.id)
    try {
      const r = await archiveForm(row.id, mode)
      if (!r.success) throw new Error(r.message || 'Archive failed')
      toast.success(`Archived (${row.instance_reference || row.id})`)
      await loadInstances()
    } catch (e) {
      toast.error(e.message || 'Archive failed')
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = (row) => {
    const viewPath = `${basePath}/${projectId}/forms/${row.id}/view`
    const editPath = `${basePath}/${projectId}/forms/${row.id}/edit`
    const editable = canEditFormInstance(row.status)
    const archivable = canArchiveFormInstance(row.status)
    const archiveDisabled = !archivable || busyId === row.id
    const archiveLabel = archivable
      ? `Archive ${row.template_name || 'form'}`
      : row.status === 'approved'
        ? 'Cannot archive an approved form'
        : row.status === 'archived'
          ? 'Already archived'
          : 'Archive unavailable'

    return (
      <div className="inline-flex items-center gap-0.5">
        <RowActionButton variant="view" label={`View ${row.template_name || 'form'}`} onClick={() => navigate(viewPath)} />
        {editable && (
          <RowActionButton
            variant="edit"
            label={`Edit ${row.template_name || 'form'}`}
            onClick={() => navigate(editPath)}
          />
        )}
        <RowActionButton
          variant="delete"
          label={archiveLabel}
          disabled={archiveDisabled}
          onClick={() => handleArchive(row)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-lg font-semibold">Process Group Forms</h1>
      <FormTemplateGallery
        templates={templates}
        onSelect={(t) => navigate(`${basePath}/${projectId}/forms/${t.template_code}/new`)}
        recommendedCode={recommended?.templateCode}
        recommendedTier={recommended?.tier}
      />
      <DraftFormQueue
        drafts={drafts}
        onResume={(d) => navigate(`${basePath}/${projectId}/forms/${d.id}/edit`)}
      />

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">All Records</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Every form instance for this project. Archived records are hidden until you filter for
              them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            <ExportListMenu
              columns={EXPORT_COLS}
              data={exportRows}
              baseFilename="project_forms"
              disabled={!filtered.length}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full rounded border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Search forms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All (excl. archived)</option>
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading records…</p>}

        {!loading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No form records match this view. Start a new form above, or choose Archived to see
            retired instances.
          </p>
        )}

        {!loading && viewMode === 'list' && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader />
                  <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onSort('template_name')}
                    >
                      Template{' '}
                      <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'template_name')}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onSort('statusLabel')}
                    >
                      Status{' '}
                      <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'statusLabel')}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onSort('updated_at')}
                    >
                      Last updated{' '}
                      <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'updated_at')}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      <div>{row.template_name}</div>
                      {(row.instance_reference || row.template_code) && (
                        <div className="text-xs text-gray-400">
                          {row.instance_reference || row.template_code}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {formatUpdatedAt(row.updated_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{renderActions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && viewMode !== 'list' && filtered.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row, index) => (
              <article
                key={row.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{row.template_name}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {row.instance_reference || row.template_code || row.id}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                  >
                    {row.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">{formatUpdatedAt(row.updated_at)}</p>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1">
                  {renderActions(row)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
