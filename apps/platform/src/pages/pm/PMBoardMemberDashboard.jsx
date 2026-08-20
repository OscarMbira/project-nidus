import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardStatCard } from '@nidus/ui'
import { supabase } from '../../services/supabaseClient'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import { fetchProjectMilestones } from '../../services/ganttService'
import { getPendingDecisions } from '../../services/highlightReportDecisionService'
import {
  Briefcase,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Gavel,
  BarChart3,
  Layers,
  FileText,
  Flag
} from 'lucide-react'

const EMPTY_STATS = {
  decisionsPending: 0,
  reportsForReview: 0,
  openExceptions: 0,
  openRisks: 0,
  openIssues: 0,
  activeWorkPackages: 0,
}

/**
 * Governance Dashboard (v901, v902) — shown instead of the operational PM dashboard when
 * every project_memberships role the signed-in user holds on the current project is
 * governance-only (project_board_member or project_sponsor — see
 * projectRoleDashboardUtils.js). Title reflects whichever role(s) actually apply.
 * Oversight surface: decisions, exceptions, and reports awaiting attention, plus
 * read-oriented links — deliberately no Daily Log / Work Package management quick
 * actions, since those are the PM's operational tools, not the board's/sponsor's.
 */
export default function PMBoardMemberDashboard() {
  const navigate = useNavigate()
  const { currentProjectId, currentProject, loading: projectLoading } = useCurrentProject()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProjectId) {
      setStats(EMPTY_STATS)
      setMilestones([])
      setLoading(false)
      return
    }
    loadDashboardData(currentProjectId)
  }, [currentProjectId])

  const loadDashboardData = async (projectId) => {
    setLoading(true)
    try {
      const [
        decisionsRes,
        reportsRes,
        exceptionsRes,
        risksRes,
        issuesRes,
        workPackagesRes,
        milestonesRes,
      ] = await Promise.allSettled([
        getPendingDecisions(projectId),
        supabase.from('highlight_reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false).in('approval_workflow_status', ['submitted', 'distributed']),
        supabase.from('exceptions').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false).in('exception_status', ['OPEN', 'ESCALATED', 'UNDER_REVIEW']),
        supabase.from('risks').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['identified', 'assessed', 'mitigated', 'monitored']).eq('is_deleted', false),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['new', 'assigned', 'in_progress', 'resolved', 'reopened']).eq('is_deleted', false),
        supabase.from('work_packages').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false).in('status', ['authorized', 'accepted', 'in_progress']),
        fetchProjectMilestones(projectId),
      ])

      const count = (res) => (res.status === 'fulfilled' && !res.value.error ? (res.value.count ?? 0) : 0)

      setStats({
        decisionsPending: decisionsRes.status === 'fulfilled' ? (decisionsRes.value?.length ?? 0) : 0,
        reportsForReview: count(reportsRes),
        openExceptions: count(exceptionsRes),
        openRisks: count(risksRes),
        openIssues: count(issuesRes),
        activeWorkPackages: count(workPackagesRes),
      })

      const today = new Date().toISOString().slice(0, 10)
      const upcoming = milestonesRes.status === 'fulfilled'
        ? milestonesRes.value.filter((m) => m.milestone_date >= today).slice(0, 5)
        : []
      setMilestones(upcoming)
    } catch (error) {
      console.error('Error loading Board Member dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Prefer project_code for the address bar — /pm/* has no path segment, so this is the only
  // friendly form the URL can take (see usePlatformProjectId's normalization for anything that
  // still lands here as a raw UUID).
  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const withProject = (path, filter) => {
    const params = new URLSearchParams()
    if (currentProjectKey) params.set('projectId', currentProjectKey)
    if (filter) params.set('filter', filter)
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  const statCards = [
    {
      label: 'Decisions Pending',
      value: stats.decisionsPending,
      icon: Gavel,
      color: 'text-indigo-600 dark:text-indigo-400',
      link: '/pm/reporting/highlight-reports',
    },
    {
      label: 'Reports Awaiting Review',
      value: stats.reportsForReview,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      link: '/pm/reporting/highlight-reports',
    },
    {
      label: 'Open Exceptions',
      value: stats.openExceptions,
      icon: AlertOctagon,
      color: 'text-orange-600 dark:text-orange-400',
      link: '/pm/reporting/exception-reports',
    },
    {
      label: 'Open Risks',
      value: stats.openRisks,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      link: '/pm/controls/risk-register',
      filter: 'open'
    },
    {
      label: 'Open Issues',
      value: stats.openIssues,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      link: '/pm/controls/issue-register',
      filter: 'open'
    },
    {
      label: 'Active Work Packages',
      value: stats.activeWorkPackages,
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400',
      link: '/pm/delivery/work-packages',
      filter: 'active'
    },
  ]

  const quickActions = [
    { label: 'Highlight Reports', path: '/pm/reporting/highlight-reports', icon: BarChart3 },
    { label: 'Exception Reports', path: '/pm/reporting/exception-reports', icon: AlertOctagon },
    { label: 'Risk Register', path: '/pm/controls/risk-register', icon: AlertTriangle },
    { label: 'Issue Register', path: '/pm/controls/issue-register', icon: AlertCircle },
    { label: 'Business Case', path: '/pm/initiation/business-case', icon: FileText },
    { label: 'Project Initiation Document', path: '/pm/initiation/pid', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentProject?.roleDisplayName ? `${currentProject.roleDisplayName} Dashboard` : 'Governance Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentProject
              ? `Executive oversight and governance — ${currentProject.projectName}`
              : 'Executive oversight and governance'}
          </p>
        </div>
      </div>

      {!projectLoading && !currentProjectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Briefcase className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're not a member of any project yet — stats and quick actions will appear here once you are.
          </p>
        </div>
      ) : (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <DashboardStatCard
            key={card.label}
            label={card.label}
            value={loading ? '...' : card.value}
            icon={card.icon}
            iconClassName={card.color}
            accentClassName="text-gray-900 dark:text-white"
            onClick={() => navigate(withProject(card.link, card.filter))}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                to={withProject(action.path)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Flag className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
          Upcoming Deadlines
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : milestones.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming milestones for this project.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{m.milestone_name || m.name || 'Untitled milestone'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{m.milestone_date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Governance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governance Reference */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <Briefcase className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
            Governance Reference
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            View organisational baselines for this project
          </p>
          <div className="space-y-2">
            {[
              { name: 'Risk Management Strategy', path: '/pm/governance/risk-strategy' },
              { name: 'Quality Management Strategy', path: '/pm/governance/quality-strategy' },
              { name: 'Communication Management Strategy', path: '/pm/governance/communication-strategy' },
            ].map((doc) => (
              <Link
                key={doc.name}
                to={withProject(doc.path)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Initiation Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FileText className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
            Initiation Documents
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Business justification and project initiation
          </p>
          <div className="space-y-2">
            {[
              { name: 'Business Case', path: '/pm/initiation/business-case' },
              { name: 'Project Brief', path: '/pm/initiation/project-brief' },
              { name: 'Project Initiation Document', path: '/pm/initiation/pid' },
              { name: 'Benefits Review Plan', path: '/pm/initiation/benefits-review-plan' },
            ].map((doc) => (
              <Link
                key={doc.name}
                to={withProject(doc.path)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
