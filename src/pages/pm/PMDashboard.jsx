import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
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
  GraduationCap
} from 'lucide-react'

export default function PMDashboard() {
  const [stats, setStats] = useState({
    activeWorkPackages: 0,
    openRisks: 0,
    openIssues: 0,
    qualityActivities: 0,
    pendingReports: 0,
    lessonsLogged: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [risksRes, issuesRes] = await Promise.allSettled([
        supabase.from('risks').select('id', { count: 'exact', head: true }).in('status', ['identified', 'assessed', 'mitigated', 'monitored']).eq('is_deleted', false),
        supabase.from('issues').select('id', { count: 'exact', head: true }).in('status', ['new', 'assigned', 'in_progress', 'resolved', 'reopened']).eq('is_deleted', false)
      ])

      const risksCount = risksRes.status === 'fulfilled' && !risksRes.value.error ? (risksRes.value.count ?? 0) : 0
      const issuesCount = issuesRes.status === 'fulfilled' && !issuesRes.value.error ? (issuesRes.value.count ?? 0) : 0

      setStats({
        activeWorkPackages: 0,
        openRisks: risksCount,
        openIssues: issuesCount,
        qualityActivities: 0,
        pendingReports: 0,
        lessonsLogged: 0
      })
    } catch (error) {
      console.error('Error loading PM dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Manager Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Project delivery, execution and control
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={card.link}
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
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </Link>
            )
          })}
        </div>
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
            ].map((doc) => (
              <Link
                key={doc.name}
                to={doc.path}
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
                to={doc.path}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
