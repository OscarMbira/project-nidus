import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import { fetchProjectMilestones } from '../../services/ganttService'
import PMBoardMemberDashboard from './PMBoardMemberDashboard'
import {
  Briefcase,
  Package,
  AlertTriangle,
  AlertCircle,
  CheckSquare,
  BarChart3,
  Calendar,
  FileText,
  Layers,
  GraduationCap,
  Flag
} from 'lucide-react'

const EMPTY_STATS = {
  activeWorkPackages: 0,
  openRisks: 0,
  openIssues: 0,
  qualityActivities: 0,
  pendingReports: 0,
  lessonsLogged: 0
}

export default function PMDashboard() {
  const { currentProjectId, currentProject, loading: projectLoading } = useCurrentProject()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  const isBoardMemberOnly = !!currentProject?.isGovernanceOnly

  useEffect(() => {
    if (!currentProjectId || isBoardMemberOnly) {
      setStats(EMPTY_STATS)
      setMilestones([])
      setLoading(false)
      return
    }
    loadDashboardData(currentProjectId)
  }, [currentProjectId, isBoardMemberOnly])

  const loadDashboardData = async (projectId) => {
    setLoading(true)
    try {
      const [
        workPackagesRes,
        risksRes,
        issuesRes,
        qualityRes,
        reportsRes,
        lessonsRes,
        milestonesRes,
      ] = await Promise.allSettled([
        supabase.from('work_packages').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false).in('status', ['authorized', 'accepted', 'in_progress']),
        supabase.from('risks').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['identified', 'assessed', 'mitigated', 'monitored']).eq('is_deleted', false),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['new', 'assigned', 'in_progress', 'resolved', 'reopened']).eq('is_deleted', false),
        supabase.from('quality_activities_view').select('activity_id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('checkpoint_reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['draft', 'submitted']),
        supabase.from('lessons_learned').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false),
        fetchProjectMilestones(projectId),
      ])

      const count = (res) => (res.status === 'fulfilled' && !res.value.error ? (res.value.count ?? 0) : 0)

      setStats({
        activeWorkPackages: count(workPackagesRes),
        openRisks: count(risksRes),
        openIssues: count(issuesRes),
        qualityActivities: count(qualityRes),
        pendingReports: count(reportsRes),
        lessonsLogged: count(lessonsRes),
      })

      const today = new Date().toISOString().slice(0, 10)
      const upcoming = milestonesRes.status === 'fulfilled'
        ? milestonesRes.value.filter((m) => m.milestone_date >= today).slice(0, 5)
        : []
      setMilestones(upcoming)
    } catch (error) {
      console.error('Error loading PM dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Prefer project_code for the address bar — /pm/* has no path segment, so this is the only
  // friendly form the URL can take (see usePlatformProjectId's normalization for anything that
  // still lands here as a raw UUID).
  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const withProject = (path) => (currentProjectKey ? `${path}?projectId=${encodeURIComponent(currentProjectKey)}` : path)

  const statCards = [
    {
      label: 'Active Work Packages',
      value: stats.activeWorkPackages,
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/pm/delivery/work-packages'
    },
    {
      label: 'Open Risks',
      value: stats.openRisks,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/pm/controls/risk-register'
    },
    {
      label: 'Open Issues',
      value: stats.openIssues,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      link: '/pm/controls/issue-register'
    },
    {
      label: 'Quality Activities',
      value: stats.qualityActivities,
      icon: CheckSquare,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      link: '/pm/controls/quality-register'
    },
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      link: '/pm/reporting/checkpoint-reports'
    },
    {
      label: 'Lessons Logged',
      value: stats.lessonsLogged,
      icon: GraduationCap,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      link: '/pm/controls/lessons-log'
    }
  ]

  const quickActions = [
    { label: 'Daily Log', path: '/pm/delivery/daily-log', icon: Calendar },
    { label: 'Work Packages', path: '/pm/delivery/work-packages', icon: Layers },
    { label: 'Risk Register', path: '/pm/controls/risk-register', icon: AlertTriangle },
    { label: 'Issue Register', path: '/pm/controls/issue-register', icon: AlertCircle },
    { label: 'Checkpoint Reports', path: '/pm/reporting/checkpoint-reports', icon: BarChart3 },
    { label: 'Highlight Reports', path: '/pm/reporting/highlight-reports', icon: FileText },
  ]

  if (isBoardMemberOnly) {
    return <PMBoardMemberDashboard />
  }

  const dashboardTitle = currentProject?.roleDisplayName
    ? `${currentProject.roleDisplayName} Dashboard`
    : 'Project Manager Dashboard'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentProject
              ? `Project delivery, execution and control — ${currentProject.projectName}`
              : 'Project delivery, execution and control'}
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
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={withProject(card.link)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : card.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </Link>
          )
        })}
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

      {/* Delivery Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governance Reference */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <Package className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
            Governance Reference
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            View or tailor organisational baselines for your project
          </p>
          <div className="space-y-2">
            {[
              { name: 'Risk Management Strategy', path: '/pm/governance/risk-strategy' },
              { name: 'Quality Management Strategy', path: '/pm/governance/quality-strategy' },
              { name: 'Communication Management Strategy', path: '/pm/governance/communication-strategy' },
            ].map((doc, index) => (
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
