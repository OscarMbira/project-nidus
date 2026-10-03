/**
 * Assumptions Register — list page (Simulator, v963 Phase 3). Mirrors
 * apps/platform/src/pages/assumptions/AssumptionsListPage.jsx against sim.assumptions. Simulator's
 * practice hierarchy is addressed by a real :projectId path segment (not a query param — see
 * apps/simulator/src/utils/projectRouteParam.js, which resolves against public.projects and is
 * NOT valid for sim.practice_projects), so this page is reachable two ways: with a concrete
 * :projectId (the normal case, linked from a practice project's own pages) or bare from the
 * sidebar, in which case it offers a lightweight inline project picker instead of a separate
 * redirect route/component.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List as ListIcon, HelpCircle } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listAssumptions } from '../../services/assumptionService'
import { simDb } from '../../services/supabaseClient'

const PAGE_SIZE = 20

const STATUS_LABELS = { active: 'Active', validated: 'Validated', invalidated: 'Invalidated', closed: 'Closed' }
const STATUS_BADGE = {
  active: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  validated: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  invalidated: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  closed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
}

const IMPACT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }
const IMPACT_BADGE = {
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  high: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.active}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ImpactBadge({ impact }) {
  if (!impact) return <span className="text-gray-400 dark:text-gray-500">—</span>
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${IMPACT_BADGE[impact] || IMPACT_BADGE.low}`}>
      {IMPACT_LABELS[impact] || impact}
    </span>
  )
}

function ProjectPicker({ onPick }) {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await simDb
        .from('practice_projects')
        .select('id, project_name')
        .eq('user_id', user.id)
        .order('project_name', { ascending: true })
      if (!cancelled) {
        setProjects(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading your practice projects…</div>
  if (projects.length === 0) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">You have no practice projects yet.</div>
  }
  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-3">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Select a practice project</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">Choose which project's Assumptions Register to open.</p>
      <div className="space-y-2">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-900 dark:text-gray-100"
          >
            {p.project_name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AssumptionsListPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [assumptions, setAssumptions] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('simulator-assumptions-page', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'assumption_text', direction: 'asc' },
    storageKey: 'nidus-sim-assumptions-sort',
  })

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listAssumptions(projectId)
      if (!cancelled) {
        setAssumptions(result.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  if (!projectId) {
    return <ProjectPicker onPick={(id) => navigate(`/simulator/practice-projects/${id}/assumptions`, { replace: true })} />
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return assumptions
    return assumptions.filter((a) => (a.assumption_text || '').toLowerCase().includes(term))
  }, [assumptions, search])

  const sortAccessors = useMemo(() => ({
    assumption_text: (a) => a.assumption_text || '',
    validation_status: (a) => a.validation_status || '',
    owner: (a) => a.owner?.full_name || '',
    impact_severity: (a) => a.impact_severity || '',
    next_review_date: (a) => a.next_review_date || '',
    created_at: (a) => a.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'assumption_text', label: 'Assumption' },
    { key: 'validation_status', label: 'Status' },
    { key: 'owner', label: 'Owner' },
    { key: 'impact_severity', label: 'Impact' },
    { key: 'next_review_date', label: 'Next review date' },
    { key: 'created_at', label: 'Created' },
  ]
  const exportRows = sorted.map((a) => ({
    assumption_text: a.assumption_text,
    validation_status: STATUS_LABELS[a.validation_status] || a.validation_status,
    owner: a.owner?.full_name || '',
    impact_severity: IMPACT_LABELS[a.impact_severity] || a.impact_severity || '',
    next_review_date: a.next_review_date || '',
    created_at: a.created_at,
  }))

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading assumptions…</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-500" />
            Assumptions Register
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tracked practice project assumptions with a validation lifecycle and optional conversion to a risk or issue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="assumptions-register" disabled={exportRows.length === 0} />
          <button
            type="button"
            onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/create`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Assumption
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search assumptions…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Table view">
            <ListIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Card view">
            <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No assumptions recorded yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('assumption_text')} onSort={() => handleSort('assumption_text')} className="!normal-case whitespace-nowrap">
                  Assumption
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('validation_status')} onSort={() => handleSort('validation_status')} className="!normal-case whitespace-nowrap">
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('owner')} onSort={() => handleSort('owner')} className="!normal-case whitespace-nowrap">
                  Owner
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('impact_severity')} onSort={() => handleSort('impact_severity')} className="!normal-case whitespace-nowrap">
                  Impact
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('next_review_date')} onSort={() => handleSort('next_review_date')} className="!normal-case whitespace-nowrap">
                  Next review date
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('created_at')} onSort={() => handleSort('created_at')} className="!normal-case whitespace-nowrap">
                  Created
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((a, index) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">{a.assumption_text}</td>
                  <td className="px-4 py-3 text-sm"><StatusBadge status={a.validation_status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.owner?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-sm"><ImpactBadge impact={a.impact_severity} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.next_review_date ? new Date(a.next_review_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View assumption" onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/${a.id}`)} />
                      <RowActionButton variant="edit" label="Edit assumption" onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/${a.id}/edit`)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((a, index) => (
            <div key={a.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <StatusBadge status={a.validation_status} />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-3">{a.assumption_text}</p>
              <div className="flex items-center gap-2"><ImpactBadge impact={a.impact_severity} /></div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {a.owner?.full_name || '—'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Next review: {a.next_review_date ? new Date(a.next_review_date).toLocaleDateString() : '—'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View assumption" onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/${a.id}`)} />
                <RowActionButton variant="edit" label="Edit assumption" onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/${a.id}/edit`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
