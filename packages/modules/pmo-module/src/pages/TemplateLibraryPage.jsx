import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { listTemplateLibraryNodes } from '@nidus/shared/services/pmTemplateLibraryService.js'
import { copyTemplateNodeForAccount } from '@nidus/shared/services/pmTemplateCopyService.js'
import { resolveAccountTemplateOverrideBatch } from '@nidus/shared/services/pmTemplateOverrideService.js'
import { resolveEntityDeliveryMethodology } from '@nidus/shared/services/entityDeliveryMethodologyService.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import {
  annotateTemplateRowsByMethodology,
  resolveVisibleTracks,
  USER_METHODOLOGY_PREF_KEY,
  METHODOLOGY_TRACK_DEFS,
  normalizeProjectDeliveryTrack,
} from '@nidus/config/methodologyMenuUtils.js'

const EXPORT_COLS = [
  { key: '_rowNumber', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Tier' },
  { key: 'domain', label: 'Domain' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'status', label: 'Status' },
]

const TIER_LABELS = {
  portfolio: 'Portfolio',
  programme: 'Programme',
  project: 'Project',
  pmo: 'PMO',
}

function methodologyLabel(m) {
  if (m == null || String(m).trim() === '') return 'Common'
  const def = METHODOLOGY_TRACK_DEFS.find((d) => d.track === normalizeProjectDeliveryTrack(m))
  return def?.shortLabel || m
}

/**
 * Global Template Library — Level × Methodology browser with Copy-to-customise
 * (single row or bulk). Organisational copies live on a separate page/menu entry
 * (Organisational Templates) — this page only ever shows is_system_synced=true rows.
 * Route: /app/pmo/template-library
 * Optional query: entityType, entityId, tier
 */
export default function TemplateLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const tierParam = searchParams.get('tier')

  const [rows, setRows] = useState([])
  const [overrides, setOverrides] = useState({}) // globalNodeId -> org override node
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [tierFilter, setTierFilter] = useState(() => searchParams.get('tierFilter') || '')
  const [domainFilter, setDomainFilter] = useState(() => searchParams.get('domain') || '')
  const [methodologyFilter, setMethodologyFilter] = useState(() => searchParams.get('methodology') || '')
  const [copyingId, setCopyingId] = useState(null)
  const [bulkCopying, setBulkCopying] = useState(false)
  const [checkedIds, setCheckedIds] = useState(() => new Set())
  const [viewMode, setViewMode] = useViewMode('pmo-template-library', 'list')
  const [scopeNote, setScopeNote] = useState('Organisation default / Methodology Focus')
  const [effectiveTracks, setEffectiveTracks] = useState(() => new Set())
  // Titles/cross-links mirror the DB-driven menu_items rows — no hardcoded duplicate
  // strings that can drift out of sync with an admin-renamed menu item.
  const [pageTitle, setPageTitle] = useState('Global Template Library')
  const [orgLinkLabel, setOrgLinkLabel] = useState('Organisational Templates')

  useEffect(() => {
    getMenuLabel(platformDb, 'plat_tpl_library', 'Global Template Library').then(setPageTitle)
    getMenuLabel(platformDb, 'plat_tpl_organisational', 'Organisational Templates').then(setOrgLinkLabel)
  }, [])

  // Keep filters deep-linkable/bookmarkable (mirrors Admin's ?methodology=… pattern) without
  // touching the entityType/entityId/tier context params already used for copy scoping.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (search) next.set('q', search); else next.delete('q')
    if (tierFilter) next.set('tierFilter', tierFilter); else next.delete('tierFilter')
    if (domainFilter) next.set('domain', domainFilter); else next.delete('domain')
    if (methodologyFilter) next.set('methodology', methodologyFilter); else next.delete('methodology')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tierFilter, domainFilter, methodologyFilter])

  const loadContext = useCallback(async () => {
    let orgMethodology = 'hybrid'
    let allowOverride = true
    let deliveryTrack = null
    try {
      const accountId = await getCurrentUserAccountId()
      if (accountId) {
        const { data: acct } = await platformDb
          .from('accounts')
          .select('default_methodology, allow_project_methodology_override')
          .eq('id', accountId)
          .maybeSingle()
        if (acct?.default_methodology) orgMethodology = acct.default_methodology
        if (acct?.allow_project_methodology_override != null) {
          allowOverride = !!acct.allow_project_methodology_override
        }
      }
      if (entityType && entityId) {
        deliveryTrack = await resolveEntityDeliveryMethodology(platformDb, {
          entityType,
          entityId,
          schema: 'public',
        })
      }
    } catch {
      /* keep defaults */
    }
    let userPref = null
    try {
      userPref = localStorage.getItem(USER_METHODOLOGY_PREF_KEY)
    } catch { /* ignore */ }
    const tracks = resolveVisibleTracks(orgMethodology, deliveryTrack, allowOverride, userPref)
    setEffectiveTracks(tracks)
    const focus = userPref || deliveryTrack || orgMethodology
    setScopeNote(
      deliveryTrack
        ? `Delivery methodology: ${methodologyLabel(deliveryTrack)} (nearest entity flag)`
        : userPref
          ? `Methodology Focus: ${methodologyLabel(userPref)}`
          : `Organisation: ${methodologyLabel(orgMethodology)}`,
    )
    return { tracks, focus }
  }, [entityType, entityId])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      if (!accountId) {
        setRows([])
        return
      }
      const data = await listTemplateLibraryNodes(platformDb, accountId, { isSystemSynced: true })
      setRows(data)
      setCheckedIds(new Set())
      const overrideMap = await resolveAccountTemplateOverrideBatch(platformDb, {
        accountId,
        globalNodeIds: data.map((row) => row.id),
      })
      setOverrides(Object.fromEntries(overrideMap))
    } catch (e) {
      toast.error(e.message || 'Failed to load template library')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContext()
    loadRows()
  }, [loadContext, loadRows])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === USER_METHODOLOGY_PREF_KEY) loadContext()
    }
    window.addEventListener('storage', onStorage)
    const onFocus = () => loadContext()
    window.addEventListener('focus', onFocus)
    // 'storage' only fires cross-tab; MethodologySwitcher dispatches this custom
    // event in the same tab so same-page listeners (like this one) can react too.
    const onPrefChanged = () => loadContext()
    window.addEventListener('nidus-methodology-pref-changed', onPrefChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('nidus-methodology-pref-changed', onPrefChanged)
    }
  }, [loadContext])

  const annotated = useMemo(
    () => annotateTemplateRowsByMethodology(rows, effectiveTracks),
    [rows, effectiveTracks],
  )

  const preMethodologyFiltered = useMemo(() => {
    let list = annotated
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
  }, [annotated, tierFilter, domainFilter, methodologyFilter, search])

  // Non-matching templates are hidden, not greyed — common (methodology=null) rows
  // always pass since annotateTemplateRowsByMethodology never marks them disabled.
  const filtered = useMemo(
    () => preMethodologyFiltered.filter((r) => !r.disabled),
    [preMethodologyFiltered],
  )

  const hiddenForMethodology = preMethodologyFiltered.length - filtered.length

  const { columns: exportCols, rows: exportRows } = useMemo(
    () => withExportRowNumbers(
      EXPORT_COLS.filter((c) => c.key !== '_rowNumber'),
      filtered.map((r) => ({
        ...r,
        methodology: r.methodology || 'common',
      })),
    ),
    [filtered],
  )

  const allChecked = filtered.length > 0 && filtered.every((r) => checkedIds.has(r.id))
  const someChecked = checkedIds.size > 0

  const toggleRow = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setCheckedIds((prev) => {
      if (allChecked) return new Set()
      const next = new Set(prev)
      filtered.forEach((r) => next.add(r.id))
      return next
    })
  }

  const copyOneRow = async (row, accountId) => {
    const tier = tierParam || (entityType ? entityType.replace('practice_', '') : 'pmo')
    // Downstream tiers inherit the org's own customisation, not the raw Global row —
    // fork from the override (if one exists) whenever this copy is scoped to a specific
    // portfolio/programme/project, rather than the account-wide default (v805 Phase 4).
    const isDownstreamScope = ['portfolio', 'programme', 'project'].includes(entityType)
    const source = isDownstreamScope && overrides[row.id] ? overrides[row.id] : row
    const { node } = await copyTemplateNodeForAccount(platformDb, {
      accountId,
      sourceNodeId: source.id,
      tier: ['portfolio', 'programme', 'project', 'pmo'].includes(tier) ? tier : 'pmo',
      scopeEntityType: entityType || 'account',
      scopeEntityId: entityId || null,
    })
    return node
  }

  const handleCopy = async (row) => {
    setCopyingId(row.id)
    try {
      const accountId = await getCurrentUserAccountId()
      const node = await copyOneRow(row, accountId)
      toast.success(`Copied as "${node.name}" (${node.template_reference || node.id})`)
      await loadRows()
    } catch (e) {
      toast.error(e.message || 'Copy failed')
    } finally {
      setCopyingId(null)
    }
  }

  const previewHref = (row) => {
    const qs = searchParams.toString()
    return `/app/pmo/template-library/preview/${row.template_reference || row.id}${qs ? `?${qs}` : ''}`
  }

  const handleBulkCopy = async () => {
    const selected = filtered.filter((r) => checkedIds.has(r.id))
    if (!selected.length) return
    setBulkCopying(true)
    let copied = 0
    const skipped = []
    const failed = []
    try {
      const accountId = await getCurrentUserAccountId()
      // Sequential, not parallel — some domains fail by design (form_template) or by
      // permission gap; a clean per-row report beats one aborted Promise.all batch.
      for (const row of selected) {
        try {
          await copyOneRow(row, accountId)
          copied += 1
        } catch (e) {
          const msg = e.message || 'Copy failed'
          if (/not supported for domain/.test(msg)) skipped.push(row.name)
          else failed.push(`${row.name}: ${msg}`)
        }
      }
      const parts = [`${copied} copied`]
      if (skipped.length) parts.push(`${skipped.length} skipped (not supported)`)
      if (failed.length) parts.push(`${failed.length} failed`)
      if (failed.length) {
        toast.error(parts.join(', '))
      } else {
        toast.success(parts.join(', '))
      }
      await loadRows()
    } finally {
      setBulkCopying(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse published Global Templates by level and methodology. Copy — one at a time or in bulk — to
            create your organisation's own customisable version.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Showing scope — {scopeNote}. Templates for other methodologies are hidden — common templates always show.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportListMenu
            columns={exportCols}
            data={exportRows}
            baseFilename="global_template_library"
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
          to="/app/pmo/organisational-templates"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {orgLinkLabel}
        </Link>
        <Link
          to="/app/pmo/field-templates"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Classic field list
        </Link>
      </div>

      {someChecked && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-950/40">
          <span className="text-blue-900 dark:text-blue-200">{checkedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCheckedIds(new Set())}
              className="rounded px-2 py-1 text-xs text-blue-900 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={bulkCopying}
              onClick={handleBulkCopy}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Copy className="h-3 w-3" />
              {bulkCopying ? 'Copying…' : `Copy ${checkedIds.size} to Organisational`}
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {rows.length} template{rows.length === 1 ? '' : 's'}
          {hiddenForMethodology > 0 ? ` · ${hiddenForMethodology} hidden for your methodology` : ''}
        </p>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No templates yet. Publish from Admin Global Template Library, or apply the companion seed SQL.
        </p>
      )}

      {!loading && viewMode === 'list' && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Tier</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Domain</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Methodology</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const n = getDisplayRowNumber(index)
                const override = overrides[row.id]
                return (
                  <tr
                    key={row.id}
                    className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <TableRowNumberCell number={n} />
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      {row.name}
                      {override ? (
                        <Link
                          to="/app/pmo/organisational-templates"
                          className="ml-2 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                          title="Your organisation already has a customised copy of this template"
                        >
                          you have a custom version →
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{TIER_LABELS[row.tier] || row.tier}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.domain}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{methodologyLabel(row.methodology)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={previewHref(row)}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={copyingId === row.id}
                          onClick={() => handleCopy(row)}
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Copy className="h-3 w-3" />
                          {copyingId === row.id ? 'Copying…' : override ? 'Copy again' : 'Copy'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && viewMode !== 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row, index) => {
            const override = overrides[row.id]
            return (
              <article
                key={row.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                  <span>#{getDisplayRowNumber(index)}</span>
                  <input
                    type="checkbox"
                    checked={checkedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                </div>
                <h2 className="font-medium text-gray-900 dark:text-gray-100">{row.name}</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {TIER_LABELS[row.tier] || row.tier} · {row.domain} · {methodologyLabel(row.methodology)}
                </p>
                {override ? (
                  <Link
                    to="/app/pmo/organisational-templates"
                    className="mt-1 block text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    you have a custom version →
                  </Link>
                ) : null}
                <div className="mt-3 flex items-center gap-1.5">
                  <Link
                    to={previewHref(row)}
                    className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Link>
                  <button
                    type="button"
                    disabled={copyingId === row.id}
                    onClick={() => handleCopy(row)}
                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Copy className="h-3 w-3" />
                    {override ? 'Copy again' : 'Copy to customise'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
