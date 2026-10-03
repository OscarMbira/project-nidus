/**
 * BenefitsReviewPlanList
 * Lists Benefits Review Plans. Under /pm/* scopes to the current project
 * (usePlatformProjectId). Under /pmo/* shows all unless projectId prop is passed.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Eye, FileText, Search } from 'lucide-react'
import { getBenefitsReviewPlans } from '../../services/benefitsReviewPlanService'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { resolveBenefitsReviewPlanViewPath } from '@nidus/shared/utils/initiationRouteUtils'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getAllProjects } from '../../services/projectService'
import { platformDb } from '@nidus/supabase'

const STATUS_COLORS = {
  draft: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  submitted: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  superseded: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const EXPORT_COLUMNS = [
  { key: 'document_ref', label: 'Reference' },
  { key: 'plan_title', label: 'Plan Title' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'created_at', label: 'Created' },
]

function planReference(plan) {
  const ref = (plan?.document_ref || plan?.brp_reference || '').trim()
  return ref || '—'
}

function projectDisplayLabel(plan) {
  const p = plan?.project
  if (!p) return plan?.programme?.programme_name || '—'
  const code = p.project_code != null && String(p.project_code).trim() !== '' ? String(p.project_code).trim() : null
  const name = p.project_name != null && String(p.project_name).trim() !== '' ? String(p.project_name).trim() : null
  if (code && name) return `${code} — ${name}`
  return code || name || '—'
}

export default function BenefitsReviewPlanList({ projectId: projectIdProp }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId: currentProjectId, routeKey: currentProjectRouteKey, loading: projectIdLoading } = usePlatformProjectId()

  const isPM = location.pathname.startsWith('/pm') || location.pathname.includes('/pm/')

  // PM routes: always filter to the selected / current project. Prop wins when provided.
  const projectId = projectIdProp || (isPM ? currentProjectId : undefined)
  const projectRouteKey = currentProjectRouteKey || projectId

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [projectsForPlan, setProjectsForPlan] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const fetchPlans = useCallback(async () => {
    if (isPM && projectIdLoading) return
    if (isPM && !projectId) {
      setPlans([])
      setLoading(false)
      setError(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await getBenefitsReviewPlans({
        status: statusFilter || undefined,
        project_id: projectId || undefined,
      })
      setPlans(data)
    } catch (err) {
      console.error('Error fetching BRPs:', err)
      setError(err.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectId, isPM, projectIdLoading])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const loadProjectsForSelector = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (!userRecord) return
      let organizationId = null
      const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).maybeSingle()
      if (account) organizationId = account.id
      else {
        const { data: project } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).limit(1).maybeSingle()
        if (project?.account_id) organizationId = project.account_id
      }
      if (!organizationId) { setProjectsForPlan([]); return }
      const result = await getAllProjects(organizationId, {})
      setProjectsForPlan(result?.data || [])
    } catch (e) {
      console.error('Error loading projects for benefits review plan:', e)
      setProjectsForPlan([])
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const filtered = plans.filter(p =>
    !search ||
    p.plan_title?.toLowerCase().includes(search.toLowerCase()) ||
    planReference(p).toLowerCase().includes(search.toLowerCase())
  )

  const getViewPath = (plan) => {
    const projectKey = plan.project?.project_code || plan.project_id
    return resolveBenefitsReviewPlanViewPath(projectKey, location.pathname)
  }

  // Stays inside the current PM/PMO sidebar layout — same base-path logic as the View action,
  // so Create doesn't drop the user into the generic /platform/projects/* shell.
  const getCreatePath = (pid) => `${resolveBenefitsReviewPlanViewPath(pid, location.pathname)}?create=1`

  if (isPM && !projectIdLoading && !projectId) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-gray-700 dark:text-gray-300">Select a project</p>
        <p className="text-sm mt-1">Choose a project from the project picker to view its Benefits Review Plans.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="flex-1 min-w-[10rem] max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            rows={filtered}
            columns={EXPORT_COLUMNS}
            filename="benefits-review-plans"
          />
          {isPM && projectId ? (
            <button
              type="button"
              onClick={() => navigate(getCreatePath(projectRouteKey))}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Benefits Review Plan
            </button>
          ) : !isPM ? (
            <button
              type="button"
              onClick={() => { setShowProjectSelector(true); loadProjectsForSelector() }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Benefits Review Plan
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {(loading || (isPM && projectIdLoading)) && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      )}

      {!loading && !(isPM && projectIdLoading) && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-700 dark:text-gray-300">No Benefits Review Plans found</p>
          <p className="text-sm mt-1 mb-4">
            {isPM
              ? 'Create a Benefits Review Plan for this project.'
              : 'Create a Benefits Review Plan from a project, or use New Benefits Review Plan above.'}
          </p>
          {isPM && projectId ? (
            <button
              type="button"
              onClick={() => navigate(getCreatePath(projectRouteKey))}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Benefits Review Plan
            </button>
          ) : !isPM ? (
            <button
              type="button"
              onClick={() => { setShowProjectSelector(true); loadProjectsForSelector() }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Benefits Review Plan
            </button>
          ) : null}
        </div>
      )}

      {!loading && !(isPM && projectIdLoading) && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan Title</th>
                  {!isPM && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((plan, index) => {
                  const viewPath = getViewPath(plan)
                  return (
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                        {planReference(plan)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {plan.plan_title}
                      </td>
                      {!isPM && (
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {projectDisplayLabel(plan)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {plan.version || '1.0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {viewPath ? (
                            <button
                              onClick={() => navigate(viewPath)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No project linked</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
            {filtered.length} plan{filtered.length !== 1 ? 's' : ''}
            {isPM && projectId ? ' for this project' : ''}
          </div>
        </div>
      )}

      {showProjectSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select project</h2>
            {loadingProjects ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading projects…</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {projectsForPlan.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onClick={() => {
                        setShowProjectSelector(false)
                        navigate(getCreatePath(p.project_code || p.id))
                      }}
                    >
                      {p.project_code ? `${p.project_code} — ` : ''}{p.project_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
              onClick={() => setShowProjectSelector(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
