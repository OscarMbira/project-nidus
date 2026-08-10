import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Copy, FilePlus2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import RequireRole from '@nidus/ui/RequireRole'
import Modal from '@nidus/ui/Modal'
import Button from '@nidus/ui/Button'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { listTemplateLibraryNodes } from '@nidus/shared/services/pmTemplateLibraryService.js'
import {
  archiveTemplateNode,
  archiveProcessTemplateNodeAndContent,
} from '@nidus/shared/services/pmTemplateNodeService.js'
import {
  copyTemplateNodeForAccount,
  createBlankFormTemplateNode,
} from '@nidus/shared/services/pmTemplateCopyService.js'
import {
  resolveProjectTierAncestry,
  filterProjectOwnTemplateNodes,
  resolveOrgTemplatesAvailableToCopy,
} from '@nidus/shared/services/pmTemplateInheritanceService.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { METHODOLOGY_TRACK_DEFS, normalizeProjectDeliveryTrack } from '@nidus/config/methodologyMenuUtils.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  orgTemplateDetailPath,
  resolveFormTemplateManagePath,
  resolveOrgTemplatesListBase,
} from '@nidus/shared/utils/organisationalTemplateRoutes.js'
import {
  toProjectDocumentLabel,
  withCustomNameSuffix,
} from '@nidus/shared/utils/projectDocumentNaming.js'
import {
  normalizeDomainGroup,
  filterRowsByDomainGroup,
  domainGroupHeadingSuffix,
} from '@nidus/shared/utils/templateDomainGroup.js'

/** Project-owned rows: strip stacked "(custom)" / template suffixes for display. */
function displayRowName(row) {
  if (row?.tier === 'project') {
    return toProjectDocumentLabel(row.name) || row.name
  }
  // Org list: collapse accidental "… (custom) (custom)" from older copy-downs.
  if (/\(custom\)\s*\(custom\)/i.test(row?.name || '')) {
    return withCustomNameSuffix(row.name)
  }
  return row?.name
}

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
 * Organisational Templates / Project Templates (v844).
 * - listVariant="organisational" (default): org customisations; in PM project context,
 *   nearest non–project-own tier for copy-down.
 * - listVariant="project": only this project's copied templates (customise / retire).
 * Routes: /app/pmo/organisational-templates · /platform/templates/organisational · /platform/templates/project
 */
export default function OrganisationalTemplatesPage({ listVariant = 'organisational' } = {}) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { projectId: contextProjectId } = usePlatformProjectId()
  const isProjectOwnList = listVariant === 'project'
  const listBase = resolveOrgTemplatesListBase(location.pathname, { listVariant })
  const detailHref = (row) => orgTemplateDetailPath(listBase, row.template_reference || row.id)
  // v824: reached from a PM's project context (?entityType=project&entityId=…) shows only the
  // nearest-tier template per family for THIS project — never the flat, every-tier PMO-admin
  // view below, which stays exactly as it was for the no-query-param case.
  const entityType = searchParams.get('entityType') || (isProjectOwnList ? 'project' : null)
  const entityId =
    searchParams.get('entityId') || (isProjectOwnList ? contextProjectId : null) || null
  const isProjectScoped = entityType === 'project' && !!entityId

  const [rows, setRows] = useState([])
  const [ancestry, setAncestry] = useState({ programmeId: null, portfolioId: null })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState(() => searchParams.get('tier') || '')
  const [domainFilter, setDomainFilter] = useState(() => searchParams.get('domain') || '')
  const [domainGroup, setDomainGroup] = useState(() => normalizeDomainGroup(searchParams.get('domainGroup')))
  const [methodologyFilter, setMethodologyFilter] = useState(() => searchParams.get('methodology') || '')
  const [deletingId, setDeletingId] = useState(null)
  const [copyingId, setCopyingId] = useState(null)
  const [creatingBlank, setCreatingBlank] = useState(false)
  const [blankFormModalOpen, setBlankFormModalOpen] = useState(false)
  const [blankFormName, setBlankFormName] = useState('')
  const [blankFormNameError, setBlankFormNameError] = useState('')
  const [viewMode, setViewMode] = useViewMode(
    isProjectOwnList ? 'pm-project-templates' : 'pmo-organisational-templates',
    'list',
  )
  // Titles/cross-links mirror the DB-driven menu_items rows — no hardcoded duplicate
  // strings that can drift out of sync with an admin-renamed menu item.
  const [pageTitle, setPageTitle] = useState(
    isProjectOwnList ? 'Project Templates' : 'Organisational Templates',
  )
  const [globalLinkLabel, setGlobalLinkLabel] = useState('Global Template Library')
  const [projectTemplatesMenuLabel, setProjectTemplatesMenuLabel] = useState('Project Templates')

  useEffect(() => {
    if (isProjectOwnList) {
      getMenuLabel(platformDb, 'plat_pm_project_templates', 'Project Templates').then(setPageTitle)
    } else {
      getMenuLabel(platformDb, 'plat_tpl_organisational', 'Organisational Templates').then(setPageTitle)
      getMenuLabel(platformDb, 'plat_tpl_library', 'Global Template Library').then(setGlobalLinkLabel)
      getMenuLabel(platformDb, 'plat_pm_project_templates', 'Project Templates').then(
        setProjectTemplatesMenuLabel,
      )
    }
  }, [isProjectOwnList])

  // Sidebar leaves (v807/v851) link here with ?tier=&domain=&domainGroup=&methodology=
  // — sync filters when navigating between sibling leaves, not just on mount.
  useEffect(() => {
    const group = normalizeDomainGroup(searchParams.get('domainGroup'))
    setDomainGroup(group)
    setTierFilter(searchParams.get('tier') || '')
    setMethodologyFilter(searchParams.get('methodology') || '')
    if (group === 'forms') {
      setDomainFilter('form_template')
    } else if (group === 'templates') {
      setDomainFilter('')
    } else {
      setDomainFilter(searchParams.get('domain') || '')
    }
  }, [searchParams])

  // PM mounts: keep entity context without stripping domainGroup (v851 submenu links).
  useEffect(() => {
    const path = location.pathname || ''
    const isPmTemplatesMount =
      path.includes('/templates/organisational') || path.includes('/templates/project')
    if (!isPmTemplatesMount || !contextProjectId) return
    if (
      searchParams.get('entityType') === 'project' &&
      searchParams.get('entityId') === contextProjectId
    ) {
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set('entityType', 'project')
    next.set('entityId', contextProjectId)
    navigate({ pathname: path, search: next.toString() }, { replace: true })
  }, [location.pathname, contextProjectId, searchParams, navigate])

  useEffect(() => {
    if (!isProjectScoped) {
      setAncestry({ programmeId: null, portfolioId: null })
      return
    }
    resolveProjectTierAncestry(platformDb, entityId, { schema: 'public' })
      .then(setAncestry)
      .catch(() => setAncestry({ programmeId: null, portfolioId: null }))
  }, [isProjectScoped, entityId])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) {
        setRows([])
        return
      }
      const data = await listTemplateLibraryNodes(platformDb, accountId, { isSystemSynced: false })
      setRows(data)
    } catch (e) {
      toast.error(e.message || 'Failed to load organisational templates')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRows() }, [loadRows])

  // v844: Project Templates = project-own copies only.
  // Organisational (project-scoped) = still available to copy down (hide already-copied families).
  // PMO flat list unchanged when not project-scoped.
  const scopedRows = useMemo(() => {
    if (isProjectOwnList) return filterProjectOwnTemplateNodes(rows, entityId)
    if (!isProjectScoped) return rows
    return resolveOrgTemplatesAvailableToCopy(rows, {
      projectId: entityId,
      programmeId: ancestry.programmeId,
      portfolioId: ancestry.portfolioId,
    })
  }, [rows, isProjectOwnList, isProjectScoped, entityId, ancestry])

  const filtered = useMemo(() => {
    let list = filterRowsByDomainGroup(scopedRows, { domainGroup, domainFilter })
    if (tierFilter) list = list.filter((r) => r.tier === tierFilter)
    if (methodologyFilter) list = list.filter((r) => r.methodology === methodologyFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.name, r.domain, r.tier, r.category, r.methodology]
          .some((v) => String(v || '').toLowerCase().includes(q)),
      )
    }
    return list
  }, [scopedRows, domainGroup, domainFilter, tierFilter, methodologyFilter, search])

  const headingTitle = `${pageTitle}${domainGroupHeadingSuffix(domainGroup)}`

  const { columns: exportCols, rows: exportRows } = useMemo(
    () => withExportRowNumbers(
      EXPORT_COLS.filter((c) => c.key !== '_rowNumber'),
      filtered.map((r) => ({
        ...r,
        name: displayRowName(r),
        methodology: r.methodology || 'common',
      })),
    ),
    [filtered],
  )

  const handleDelete = async (row) => {
    const where = isProjectOwnList
      ? 'Project Templates for this project'
      : 'Organisational Templates or be inherited by downstream tiers'
    const label = displayRowName(row)
    if (!window.confirm(`Retire "${label}"? It will no longer appear in ${where}.`)) {
      return
    }
    setDeletingId(row.id)
    try {
      // v849: process docs archive catalog row with the node
      if (row.domain === 'process_template') {
        await archiveProcessTemplateNodeAndContent(platformDb, row)
      } else {
        await archiveTemplateNode(platformDb, row.id)
      }
      toast.success(`Retired "${label}"`)
      await loadRows()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // v824: fork whichever tier is currently nearest for this project down to Project tier —
  // reuses copyTemplateNodeForAccount, which already forks from the nearest override (not raw
  // Global) and enforces the v822 one-copy-per-scope guard.
  const isAlreadyProjectOwn = (row) => row.tier === 'project' && row.scope_entity_id === entityId

  /** Icon-only View / Edit / Retire (v840); Copy-down stays a labelled CTA when applicable. */
  const renderRowActions = (row) => {
    const canCustomise = !isProjectScoped || isAlreadyProjectOwn(row)
    const showCopyDown = isProjectScoped && !isAlreadyProjectOwn(row)
    const href = detailHref(row)
    const label = displayRowName(row)
    return (
      <div className="inline-flex items-center gap-0.5">
        <RowActionButton
          variant="view"
          label={`View ${label}`}
          onClick={() => navigate(href)}
        />
        {canCustomise && (
          <RowActionButton
            variant="edit"
            label={`Edit ${label}`}
            onClick={() => navigate(href)}
          />
        )}
        {showCopyDown && (
          <button
            type="button"
            disabled={copyingId === row.id}
            onClick={() => handleCopyDown(row)}
            title={copyingId === row.id ? 'Copying…' : 'Copy down to my project'}
            aria-label={copyingId === row.id ? 'Copying…' : `Copy ${label} down to my project`}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Copy className="h-3 w-3" />
            {copyingId === row.id ? 'Copying…' : 'Copy down'}
          </button>
        )}
        {canCustomise && (
          <RowActionButton
            variant="delete"
            label={`Retire ${label}`}
            disabled={deletingId === row.id}
            onClick={() => handleDelete(row)}
          />
        )}
      </div>
    )
  }

  const handleCopyDown = async (row) => {
    setCopyingId(row.id)
    try {
      const accountId = await getCurrentUserAccountId()
      const { node } = await copyTemplateNodeForAccount(platformDb, {
        accountId,
        sourceNodeId: row.id,
        tier: 'project',
        scopeEntityType: 'project',
        scopeEntityId: entityId,
      })
      toast.success(`Copied as "${node.name}" — open ${projectTemplatesMenuLabel} to customise`)
      await loadRows()
    } catch (e) {
      if (e.code === 'ALREADY_COPIED') {
        toast.error('This project already has its own copy.')
        await loadRows()
      } else {
        toast.error(e.message || 'Copy failed')
      }
    } finally {
      setCopyingId(null)
    }
  }

  // v852: blank-origin local form — Project Templates / project-scoped org list → project tier;
  // portfolio/programme query context → that tier; otherwise PMO account-level blank.
  const blankFormScope = useMemo(() => {
    if (isProjectOwnList || isProjectScoped) {
      return {
        tier: 'project',
        scopeEntityType: 'project',
        scopeEntityId: entityId,
      }
    }
    if (entityType === 'portfolio' || entityType === 'sub_portfolio') {
      return {
        tier: entityType === 'sub_portfolio' ? 'sub_portfolio' : 'portfolio',
        scopeEntityType: entityType,
        scopeEntityId: entityId,
      }
    }
    if (entityType === 'programme') {
      return { tier: 'programme', scopeEntityType: 'programme', scopeEntityId: entityId }
    }
    return { tier: 'pmo', scopeEntityType: 'account', scopeEntityId: null }
  }, [isProjectOwnList, isProjectScoped, entityType, entityId])

  const showCreateBlankForProjectContext = isProjectOwnList || isProjectScoped
  const formsDomainActive = domainGroup === 'forms' || domainFilter === 'form_template'

  const openBlankFormModal = () => {
    if (blankFormScope.tier !== 'pmo' && !blankFormScope.scopeEntityId) {
      toast.error('Select a project (or portfolio/programme) before creating a blank form')
      return
    }
    setBlankFormName('')
    setBlankFormNameError('')
    setBlankFormModalOpen(true)
  }

  const closeBlankFormModal = () => {
    if (creatingBlank) return
    setBlankFormModalOpen(false)
    setBlankFormName('')
    setBlankFormNameError('')
  }

  const handleCreateBlankForm = async (event) => {
    event?.preventDefault?.()
    const trimmed = String(blankFormName || '').trim()
    if (!trimmed) {
      setBlankFormNameError('Enter a name for the form.')
      return
    }
    setBlankFormNameError('')
    setCreatingBlank(true)
    try {
      const accountId = await getCurrentUserAccountId()
      const { node, formTemplate } = await createBlankFormTemplateNode(platformDb, {
        accountId,
        tier: blankFormScope.tier,
        scopeEntityType: blankFormScope.scopeEntityType,
        scopeEntityId: blankFormScope.scopeEntityId,
        name: trimmed,
      })
      const code = formTemplate?.template_code
      toast.success(`Created blank form ${code || node.template_reference || node.id}`)
      setBlankFormModalOpen(false)
      setBlankFormName('')
      const managePath = code
        ? resolveFormTemplateManagePath(location.pathname, {
            templateCode: code,
            scopeEntityId: blankFormScope.scopeEntityId,
            tier: blankFormScope.tier,
            isBlankOrigin: true,
          })
        : null
      if (managePath) {
        navigate(managePath)
      } else {
        await loadRows()
        navigate(detailHref(node))
      }
    } catch (e) {
      toast.error(e.message || 'Could not create blank form')
    } finally {
      setCreatingBlank(false)
    }
  }

  const createBlankButton = (
    <button
      type="button"
      disabled={creatingBlank}
      onClick={openBlankFormModal}
      className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
    >
      <FilePlus2 className="h-4 w-4" />
      Create Blank Form
    </button>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{headingTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isProjectOwnList
              ? 'Templates you have copied down to this project — customise and retire them here. Copy more from Organisational Templates.'
              : isProjectScoped
                ? "Organisational templates available to this project — copy down to create a project-owned version (shown under Project Templates)."
                : "Your organisation's own customised templates — copied from the Global Template Library and editable. Downstream Portfolio/Programme/Project tiers inherit from these, not the raw Global versions."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(showCreateBlankForProjectContext || formsDomainActive || !isProjectScoped) && (
            showCreateBlankForProjectContext
              ? createBlankButton
              : (
                <RequireRole
                  roles={[
                    'project_manager',
                    'portfolio_manager',
                    'programme_manager',
                    'pmo_admin',
                    'org_admin',
                    'system_admin',
                    'super_admin',
                    'Project Manager',
                    'Portfolio Manager',
                    'Programme Manager',
                  ]}
                >
                  {createBlankButton}
                </RequireRole>
              )
          )}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportListMenu
            columns={exportCols}
            data={exportRows}
            baseFilename={isProjectOwnList ? 'project_templates' : 'organisational_templates'}
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
        {!isProjectOwnList && (
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
        )}
        {!domainGroup && (
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
        )}
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
        {/* PMO/admin-only escape hatch to the raw Global masters — never shown when a PM
            is viewing their own project's resolved templates (rule: never direct-copy from
            Global). */}
        {!isProjectScoped && (
          <Link
            to="/app/pmo/template-library"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {globalLinkLabel}
          </Link>
        )}
      </div>

      {!loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {scopedRows.length} template{scopedRows.length === 1 ? '' : 's'}
        </p>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && isProjectOwnList && !entityId && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a project first to view and customise its templates.
        </p>
      )}

      {!loading && filtered.length === 0 && isProjectOwnList && entityId && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No project templates yet. Open Organisational Templates and use{' '}
          <span className="font-medium">Copy down to my project</span> to create one.
        </p>
      )}

      {!loading && filtered.length === 0 && isProjectScoped && !isProjectOwnList && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No templates apply to this project yet. Ask your PMO administrator to set up
          organisational templates.
        </p>
      )}

      {!loading && filtered.length === 0 && !isProjectScoped && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No organisational templates yet. Copy one from the{' '}
          <Link to="/app/pmo/template-library" className="text-blue-600 hover:underline dark:text-blue-400">
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
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                    {displayRowName(row)}
                    {row.parent_node_id ? (
                      <span className="ml-2 text-xs text-gray-400">from Global</span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">custom draft</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{TIER_LABELS[row.tier] || row.tier}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.domain}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{methodologyLabel(row.methodology)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {renderRowActions(row)}
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
              <h2 className="font-medium text-gray-900 dark:text-gray-100">{displayRowName(row)}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {TIER_LABELS[row.tier] || row.tier} · {row.domain} · {methodologyLabel(row.methodology)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{row.parent_node_id ? 'from Global' : 'custom draft'}</p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1">
                {renderRowActions(row)}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={blankFormModalOpen}
        onClose={closeBlankFormModal}
        title="Create blank form"
        size="sm"
        showCloseButton={false}
        closeOnOverlayClick={!creatingBlank}
        closeOnEscape={!creatingBlank}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={closeBlankFormModal} disabled={creatingBlank}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-blank-form"
              loading={creatingBlank}
              disabled={creatingBlank}
            >
              {creatingBlank ? 'Creating…' : 'Create form'}
            </Button>
          </>
        )}
      >
        <form id="create-blank-form" onSubmit={handleCreateBlankForm} className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Start from an empty schema. You can add sections and fields in the form builder next.
          </p>
          <div>
            <label
              htmlFor="blank-form-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Form name
            </label>
            <input
              id="blank-form-name"
              type="text"
              autoComplete="off"
              autoFocus
              value={blankFormName}
              onChange={(e) => {
                setBlankFormName(e.target.value)
                if (blankFormNameError) setBlankFormNameError('')
              }}
              disabled={creatingBlank}
              placeholder="e.g. Weekly status check-in"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {blankFormNameError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{blankFormNameError}</p>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  )
}
