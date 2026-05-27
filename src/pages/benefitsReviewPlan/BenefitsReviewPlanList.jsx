/**
 * BenefitsReviewPlanList
 * Lists all Benefits Review Plans across all projects (no projectId filter).
 * Used by PMO (/pmo/initiation/benefits-review-plan) and PM contexts.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Eye, FileText, Search } from 'lucide-react'
import { getBenefitsReviewPlans } from '../../services/benefitsReviewPlanService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import { resolveBenefitsReviewPlanViewPath } from '../../utils/initiationRouteUtils'
import { getAllProjects } from '../../services/projectService'
import { platformDb } from '../../services/supabase/supabaseClient'

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

export default function BenefitsReviewPlanList({ projectId }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine base path from context
  const isPMO = location.pathname.startsWith('/pmo')
  const isPM = location.pathname.startsWith('/pm')

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [projectsForPlan, setProjectsForPlan] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const fetchPlans = useCallback(async () => {
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
  }, [statusFilter, projectId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const loadProjectsForSelector = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (!userRecord) return
      let organizationId = null
      const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).single()
      if (account) organizationId = account.id
      else {
        const { data: project } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).limit(1).single()
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
    p.document_ref?.toLowerCase().includes(search.toLowerCase())
  )

  const getViewPath = (plan) => resolveBenefitsReviewPlanViewPath(plan.project_id, location.pathname)

  const getCreatePath = (projectId) => `/platform/projects/${projectId}/benefits/review-plan?create=1`

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={EXPORT_COLUMNS} data={filtered} baseFilename="BenefitsReviewPlans" disabled={!filtered.length} />
          <button
            type="button"
            onClick={() => { setShowProjectSelector(true); loadProjectsForSelector() }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Benefits Review Plan
          </button>
        </div>
      </div>

      {showProjectSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowProjectSelector(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select project for new plan</h2>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingProjects ? (
                <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
              ) : projectsForPlan.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No projects found.</p>
              ) : (
                <ul className="space-y-1">
                  {projectsForPlan.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { navigate(getCreatePath(p.id)); setShowProjectSelector(false) }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {p.project_name || p.project_code || p.id}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setShowProjectSelector(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-10 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No Benefits Review Plans found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Create a Benefits Review Plan from a project, or use New Benefits Review Plan above.
          </p>
          <button
            type="button"
            onClick={() => { setShowProjectSelector(true); loadProjectsForSelector() }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Benefits Review Plan
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project</th>
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
                      <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">
                        {plan.document_ref || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {plan.plan_title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {plan.project?.project_name || plan.programme?.programme_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {plan.version || '1.0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
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
          </div>
        </div>
      )}
    </div>
  )
}
