import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { ArrowLeft, FileSpreadsheet, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  archivableIdsFromFilteredRows,
  assertBulkApproveWithinCap,
  canArchiveFormInstance,
  canEditFormInstance,
  DEFAULT_FORM_BULK_APPROVE_MAX,
  draftIdsFromFilteredRows,
  filterFormInstancesForRegister,
  formInstancePathSegmentFromRow,
  formInstanceStatusLabel,
  isNonEmptyJustification,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import { buildPmTemplatesListPath } from '@nidus/shared/utils/organisationalTemplateRoutes'
import {
  looksLikeProjectUuid,
  resolveProjectRouteKeyFromId,
} from '@nidus/shared/utils/projectRouteParam'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import FormTemplateGallery from '../../components/forms/FormTemplateGallery'
import FormExcelBulkInstancesModal from '../../components/forms/FormExcelBulkInstancesModal'
import {
  archiveForm,
  bulkApproveFormInstances,
  bulkArchiveFormInstances,
  getFormBulkApproveMaxForProject,
  getFormTemplate,
  getFormsByProject,
  resolveEffectiveFormTemplate,
} from '../../services/formEngineService'
import { simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { listNearestFormTemplatesForProject } from '@nidus/shared/services/projectFormTemplateCatalog.js'

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'display_title', label: 'Record' },
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
 * FormTemplateGallery ("start new") + Records register. Drafts live in Records
 * (Edit resumes them) — no separate Draft Queue (avoids duplicating the same rows).
 */
export default function FormsGallery({ mode = 'sim', basePath = '/simulator/pm/projects' }) {
  const { projectId, routeKey } = usePlatformProjectId()
  const [friendlyProjectKey, setFriendlyProjectKey] = useState(null)
  const projectSeg = encodeURIComponent(friendlyProjectKey || routeKey || projectId || '')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [templates, setTemplates] = useState([])
  const [instances, setInstances] = useState([])
  const [recommended, setRecommended] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [templateCodeFilter, setTemplateCodeFilter] = useState(
    () => searchParams.get('templateCode') || '',
  )
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [viewMode, setViewMode] = useViewMode('project-forms-register', 'list')
  const [bulkTemplateCode, setBulkTemplateCode] = useState('')
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkTemplateFields, setBulkTemplateFields] = useState([])
  const [bulkOpening, setBulkOpening] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [bulkApproveComment, setBulkApproveComment] = useState('')
  const [bulkApproveBusy, setBulkApproveBusy] = useState(false)
  const [bulkApproveMax, setBulkApproveMax] = useState(DEFAULT_FORM_BULK_APPROVE_MAX)
  const [draftQueueBusy, setDraftQueueBusy] = useState(false)
  const [backLinkLabel, setBackLinkLabel] = useState('Forms')

  const templatesListHref = useMemo(
    () =>
      buildPmTemplatesListPath({
        pathname: '/simulator/pm/templates/project',
        listVariant: 'project',
        projectKey: friendlyProjectKey || routeKey || projectId || '',
        searchParams: 'domainGroup=forms',
      }),
    [friendlyProjectKey, routeKey, projectId],
  )

  useEffect(() => {
    getMenuLabel(simDb, 'sim_pm_project_templates_forms', 'Forms').then(setBackLinkLabel)
  }, [])

  useEffect(() => {
    if (!projectId) {
      setFriendlyProjectKey(null)
      return
    }
    let cancelled = false
    resolveProjectRouteKeyFromId(projectId).then((key) => {
      if (cancelled) return
      const next = key || projectId
      setFriendlyProjectKey(next)
      if (
        routeKey &&
        looksLikeProjectUuid(routeKey) &&
        next &&
        next !== routeKey
      ) {
        const qs = searchParams.toString()
        navigate(
          `${basePath}/${encodeURIComponent(next)}/forms${qs ? `?${qs}` : ''}`,
          { replace: true },
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [projectId, routeKey, basePath, navigate, searchParams])

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '')
    setTemplateCodeFilter(searchParams.get('templateCode') || '')
  }, [searchParams])

  useEffect(() => {
    const fromQuery = searchParams.get('templateCode') || ''
    if (fromQuery) setBulkTemplateCode(fromQuery)
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

  useEffect(() => {
    if (!projectId) {
      setBulkApproveMax(DEFAULT_FORM_BULK_APPROVE_MAX)
      return
    }
    getFormBulkApproveMaxForProject(projectId, mode).then((r) => {
      if (r.success) setBulkApproveMax(r.data)
    })
  }, [projectId, mode])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter, search, templateCodeFilter, projectId])

  const filteredTemplateMeta = useMemo(() => {
    const code = String(templateCodeFilter || '').trim().toLowerCase()
    if (!code) return null
    return (templates || []).find(
      (t) => String(t.template_code || '').trim().toLowerCase() === code,
    ) || null
  }, [templates, templateCodeFilter])

  const filtered = useMemo(() => {
    let rows = filterFormInstancesForRegister(instances, {
      statusFilter,
      search,
      templateCode: templateCodeFilter,
    }).map((r) => ({
      ...r,
      statusLabel: formInstanceStatusLabel(r.status),
      template_name: r.template_name || r.template_code || 'Form',
      display_title:
        r.display_title ||
        r.instance_reference ||
        r.template_name ||
        r.template_code ||
        'Form record',
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
  }, [instances, statusFilter, search, templateCodeFilter, sortKey, sortDir])

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

  const selectableDraftIds = useMemo(() => draftIdsFromFilteredRows(filtered), [filtered])
  const selectableArchiveIds = useMemo(() => archivableIdsFromFilteredRows(filtered), [filtered])
  const selectedCount = selectedIds.size
  const selectedDraftCount = useMemo(
    () => [...selectedIds].filter((id) => selectableDraftIds.includes(id)).length,
    [selectedIds, selectableDraftIds],
  )
  const allArchivableSelected =
    selectableArchiveIds.length > 0 && selectableArchiveIds.every((id) => selectedIds.has(id))

  const toggleRowSelected = (row) => {
    if (!canArchiveFormInstance(row.status)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(row.id)) next.delete(row.id)
      else next.add(row.id)
      return next
    })
  }

  const toggleSelectAllArchivable = () => {
    if (allArchivableSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(selectableArchiveIds))
  }

  const openBulkApprove = () => {
    if (!selectedDraftCount) {
      toast.error('Select at least one draft to approve')
      return
    }
    const capCheck = assertBulkApproveWithinCap(selectedDraftCount, bulkApproveMax)
    if (!capCheck.ok) {
      toast.error(capCheck.message)
      return
    }
    setBulkApproveComment('')
    setBulkApproveOpen(true)
  }

  const handleBulkDeleteSelected = async () => {
    if (!selectedCount) {
      toast.error('Select at least one record')
      return
    }
    if (
      !window.confirm(
        `Remove ${selectedCount} record${selectedCount === 1 ? '' : 's'} from this list? They will be archived.`,
      )
    ) {
      return
    }
    setDraftQueueBusy(true)
    try {
      const r = await bulkArchiveFormInstances([...selectedIds], mode)
      if (!r.success) throw new Error(r.message || 'Failed to remove records')
      const archived = r.data?.archived?.length || 0
      const failed = r.data?.errors?.length || 0
      if (failed) toast.error(`Removed ${archived}; ${failed} failed`)
      else toast.success(`Removed ${archived} record${archived === 1 ? '' : 's'}`)
      setSelectedIds(new Set())
      await loadInstances()
    } catch (e) {
      toast.error(e.message || 'Failed to remove records')
    } finally {
      setDraftQueueBusy(false)
    }
  }

  const confirmBulkApprove = async () => {
    if (!isNonEmptyJustification(bulkApproveComment)) {
      toast.error('Approval justification is required')
      return
    }
    const ids = [...selectedIds].filter((id) => selectableDraftIds.includes(id))
    if (!ids.length) {
      toast.error('Select at least one draft to approve')
      return
    }
    const capCheck = assertBulkApproveWithinCap(ids.length, bulkApproveMax)
    if (!capCheck.ok) {
      toast.error(capCheck.message)
      return
    }
    setBulkApproveBusy(true)
    try {
      const r = await bulkApproveFormInstances(ids, bulkApproveComment, mode)
      if (!r.success) throw new Error(r.message || 'Bulk approve failed')
      const approved = r.data?.approved?.length || 0
      const failed = r.data?.errors?.length || 0
      if (failed) {
        toast.error(`Approved ${approved}; ${failed} failed`)
      } else {
        toast.success(`Approved ${approved} draft${approved === 1 ? '' : 's'}`)
      }
      setBulkApproveOpen(false)
      setSelectedIds(new Set())
      await loadInstances()
    } catch (e) {
      toast.error(e.message || 'Bulk approve failed')
    } finally {
      setBulkApproveBusy(false)
    }
  }

  const openBulkUpload = async () => {
    if (!bulkTemplateCode) {
      toast.error('Select a form template first')
      return
    }
    setBulkOpening(true)
    try {
      const r = await getFormTemplate(bulkTemplateCode, mode)
      if (!r.success) throw new Error(r.message || 'Failed to load template')
      const sections = r.data?.current_version?.schema?.sections || []
      const fields = sections.flatMap((s) => s.fields || []).map((f) => ({
        key: f.key,
        label: f.label || f.key,
        type: f.type || 'text',
      }))
      if (!fields.length) {
        toast.error('This template has no fields yet — import a schema in the Form Template Builder first')
        return
      }
      setBulkTemplateFields(fields)
      setBulkModalOpen(true)
    } catch (e) {
      toast.error(e.message || 'Failed to open bulk upload')
    } finally {
      setBulkOpening(false)
    }
  }

  const handleArchive = async (row) => {
    if (!canArchiveFormInstance(row.status)) return
    if (
      !window.confirm(
        `Archive "${row.display_title || row.instance_reference || row.template_name || 'this form'}"? It will move to Archived and leave the default list.`,
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
    const instanceSeg = formInstancePathSegmentFromRow(row)
    const viewPath = `${basePath}/${projectSeg}/forms/${instanceSeg}/view`
    const editPath = `${basePath}/${projectSeg}/forms/${instanceSeg}/edit`
    const editable = canEditFormInstance(row.status)
    const archivable = canArchiveFormInstance(row.status)
    const archiveDisabled = !archivable || busyId === row.id
    const archiveLabel = archivable
      ? `Delete / archive ${row.display_title || row.instance_reference || row.template_name || 'form'}`
      : row.status === 'archived'
        ? 'Already archived'
        : 'Delete unavailable'
    const recordLabel = row.display_title || row.instance_reference || row.template_name || 'form'

    return (
      <div className="inline-flex items-center gap-0.5">
        <RowActionButton variant="view" label={`View ${recordLabel}`} onClick={() => navigate(viewPath)} />
        {editable && (
          <RowActionButton
            variant="edit"
            label={`Edit ${recordLabel}`}
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

  const recordsHeading = templateCodeFilter
    ? (filteredTemplateMeta?.name
      ? `${filteredTemplateMeta.name} records`
      : `Form records (${templateCodeFilter})`)
    : 'Process Group Forms'

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <Link
        to={templatesListHref}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {backLinkLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{recordsHeading}</h1>
          {templateCodeFilter && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Filled-in records for template{' '}
              <span className="font-mono">{templateCodeFilter}</span>
              {filteredTemplateMeta?.name ? ` · ${filteredTemplateMeta.name}` : ''}.
            </p>
          )}
        </div>
        {templateCodeFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('templateCode')
                navigate({ search: next.toString() ? `?${next}` : '' }, { replace: true })
              }}
            >
              Show all project forms
            </button>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              onClick={() =>
                navigate(`${basePath}/${projectSeg}/forms/${encodeURIComponent(templateCodeFilter)}/new`)
              }
            >
              Start new record
            </button>
          </div>
        )}
      </div>

      {/* When deep-linked for one template, skip the start-new gallery so users land on the records table. */}
      {!templateCodeFilter && (
        <FormTemplateGallery
          templates={templates}
          onSelect={(t) =>
            navigate(`${basePath}/${projectSeg}/forms/${encodeURIComponent(t.template_code)}/new`)
          }
          recommendedCode={recommended?.templateCode}
          recommendedTier={recommended?.tier}
        />
      )}

      {!templateCodeFilter && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bulk upload rows</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Create draft form instances from an Excel/CSV file (one draft per data row).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[14rem] rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  value={bulkTemplateCode}
                  onChange={(e) => setBulkTemplateCode(e.target.value)}
                  disabled={!templates.length}
                >
                  <option value="">Select template…</option>
                  {templates.map((t) => (
                    <option key={t.template_code || t.id} value={t.template_code}>
                      {t.name || t.template_code}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openBulkUpload}
                  disabled={!bulkTemplateCode || bulkOpening || !projectId}
                  className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {bulkOpening ? 'Loading…' : 'Bulk upload rows'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {templateCodeFilter ? 'Records' : 'All Records'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {templateCodeFilter
                ? 'Drafts, in review, approved, and rejected instances for this template. Archived are hidden unless you filter for them.'
                : 'Every form instance for this project. Archived records are hidden until you filter for them.'}
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

        {selectableArchiveIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <button
              type="button"
              onClick={toggleSelectAllArchivable}
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {allArchivableSelected
                ? 'Clear selection'
                : `Select all (${selectableArchiveIds.length})`}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCount} selected
              {selectableDraftIds.length > 0 ? ` · approve max ${bulkApproveMax}` : ''}
            </span>
            <button
              type="button"
              onClick={handleBulkDeleteSelected}
              disabled={!selectedCount || draftQueueBusy}
              className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40"
            >
              {draftQueueBusy ? 'Removing…' : `Delete selected (${selectedCount})`}
            </button>
            {selectableDraftIds.length > 0 && (
              <button
                type="button"
                onClick={openBulkApprove}
                disabled={!selectedDraftCount || bulkApproveBusy}
                className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-40"
              >
                Approve selected drafts ({selectedDraftCount})
              </button>
            )}
          </div>
        )}

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading records…</p>}

        {!loading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {templateCodeFilter
              ? `No records yet for template ${templateCodeFilter}. Use Start new record, or Bulk upload rows below.`
              : 'No form records match this view. Start a new form above, or choose Archived to see retired instances.'}
          </p>
        )}

        {!loading && viewMode === 'list' && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-10 px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all records in this list"
                      checked={allArchivableSelected}
                      disabled={!selectableArchiveIds.length}
                      onChange={toggleSelectAllArchivable}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <TableRowNumberHeader />
                  <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onSort('display_title')}
                    >
                      Record{' '}
                      <span className="text-xs opacity-70">{sortIcon(sortKey, sortDir, 'display_title')}</span>
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
                    <td className="px-2 py-2">
                      {canArchiveFormInstance(row.status) ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.instance_reference || row.template_name || 'record'}`}
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRowSelected(row)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <span className="inline-block w-4" />
                      )}
                    </td>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{row.display_title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[row.instance_reference, row.template_name].filter(Boolean).join(' · ')}
                      </div>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  {canArchiveFormInstance(row.status) && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.instance_reference || row.template_name || 'record'}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRowSelected(row)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  )}
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{row.display_title}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {[row.instance_reference, row.template_name].filter(Boolean).join(' · ') || row.id}
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

      {templateCodeFilter && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bulk upload rows</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Create draft instances for {filteredTemplateMeta?.name || templateCodeFilter} from Excel/CSV.
              </p>
            </div>
            <button
              type="button"
              onClick={openBulkUpload}
              disabled={!bulkTemplateCode || bulkOpening || !projectId}
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {bulkOpening ? 'Loading…' : 'Bulk upload rows'}
            </button>
          </div>
        </section>
      )}

      <FormExcelBulkInstancesModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        projectId={projectId}
        templateCode={bulkTemplateCode}
        templateFields={bulkTemplateFields}
        mode={mode}
        onCreated={() => loadInstances()}
      />

      {bulkApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-approve-title"
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h3 id="bulk-approve-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Approve {selectedCount} draft{selectedCount === 1 ? '' : 's'}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              One justification will be applied to every selected draft (max {bulkApproveMax}).
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Justification (required)
              </span>
              <textarea
                value={bulkApproveComment}
                onChange={(e) => setBulkApproveComment(e.target.value)}
                rows={4}
                disabled={bulkApproveBusy}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="Explain the approval…"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkApproveBusy}
                onClick={() => setBulkApproveOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkApproveBusy || !isNonEmptyJustification(bulkApproveComment)}
                onClick={confirmBulkApprove}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-40"
              >
                {bulkApproveBusy ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
