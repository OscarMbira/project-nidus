import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { simDb } from '../../../services/supabase/supabaseClient'
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
  Flag,
  ListTodo
} from 'lucide-react'
import RoleWelcomeTips from '../../../components/sim/role/RoleWelcomeTips'
import LearningPathWidget from '../../../components/sim/role/LearningPathWidget'
import RoleScoreDashboard from '../../../components/sim/role/RoleScoreDashboard'

export default function SimulatorPMDashboard() {
  const [stats, setStats] = useState({
    activePracticeWorkPackages: 0,
    openPracticeRisks: 0,
    openPracticeIssues: 0,
    practiceQualityActivities: 0,
    pendingPracticeReports: 0,
    practiceLessonsLogged: 0
  })
  const [milestoneSummary, setMilestoneSummary] = useState({ total: 0, atRisk: 0, achieved: 0 })
  const [pendingActionsCount, setPendingActionsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load summary counts from practice tables in sim schema. Same global (not per-project)
      // scope as the existing risks/issues counts below — this dashboard has no project-selector
      // context of its own.
      const [risksRes, issuesRes, milestonesRes, pendingIssueActionsRes] = await Promise.all([
        simDb.from('practice_risks').select('id', { count: 'exact', head: true }).eq('risk_status', 'open'),
        simDb.from('practice_issues').select('id', { count: 'exact', head: true }).eq('issue_status', 'open'),
        simDb.from('milestones').select('status'),
        simDb.from('practice_issue_actions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      ])

      setStats({
        activePracticeWorkPackages: 0,
        openPracticeRisks: risksRes.count || 0,
        openPracticeIssues: issuesRes.count || 0,
        practiceQualityActivities: 0,
        pendingPracticeReports: 0,
        practiceLessonsLogged: 0
      })

      const milestoneRows = milestonesRes.data || []
      setMilestoneSummary({
        total: milestoneRows.length,
        atRisk: milestoneRows.filter((m) => m.status === 'at_risk').length,
        achieved: milestoneRows.filter((m) => m.status === 'achieved').length,
      })
      setPendingActionsCount(pendingIssueActionsRes.count || 0)
    } catch (error) {
      console.error('Error loading Practice PM dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Active Practice Work Packages',
      value: stats.activePracticeWorkPackages,
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/simulator/pm/delivery/work-packages'
    },
    {
      label: 'Open Practice Risks',
      value: stats.openPracticeRisks,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/simulator/pm/controls/risk-register'
    },
    {
      label: 'Open Practice Issues',
      value: stats.openPracticeIssues,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      link: '/simulator/pm/controls/issue-register'
    },
    {
      label: 'Practice Quality Activities',
      value: stats.practiceQualityActivities,
      icon: CheckSquare,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      link: '/simulator/pm/controls/quality-register'
    },
    {
      label: 'Pending Practice Reports',
      value: stats.pendingPracticeReports,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      link: '/simulator/pm/reporting/checkpoint-reports'
    },
    {
      label: 'Practice Lessons Logged',
      value: stats.practiceLessonsLogged,
      icon: GraduationCap,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      link: '/simulator/pm/controls/lessons-log'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RoleWelcomeTips roleId="project_manager" />
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Manager Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of practice project delivery, controls, and reporting activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={card.link}
              className={`${card.bgColor} rounded-lg p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color} mt-2`}>{card.value}</p>
                </div>
                <Icon className={`h-12 w-12 ${card.color} opacity-50`} />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Milestone Summary (v966 Phase 11) / Upcoming Actions (v966 Phase 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Link
          to="/simulator/practice-projects/milestones"
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Milestone Summary
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : milestoneSummary.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{loading ? '...' : milestoneSummary.atRisk}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{loading ? '...' : milestoneSummary.achieved}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Achieved</p>
            </div>
          </div>
        </Link>

        <Link
          to="/simulator/pmo/governance-actions/register"
          className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 hover:shadow-lg transition-shadow flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <ListTodo className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Upcoming Actions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending issue and lesson actions across practice projects</p>
          </div>
          <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{loading ? '...' : pendingActionsCount}</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/simulator/pm/delivery/work-packages"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Manage Work Packages</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage practice work packages</p>
          </Link>
          <Link
            to="/simulator/pm/controls/risk-register"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Manage Risks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage practice project risks</p>
          </Link>
          <Link
            to="/simulator/pm/reporting/checkpoint-reports"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Create Reports</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate practice project reports</p>
          </Link>
          <Link
            to="/simulator/pm/governance/mandate"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">View Baselines</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access practice governance baselines</p>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LearningPathWidget roleId="project_manager" />
        <RoleScoreDashboard roleId="project_manager" />
      </div>
    </div>
  )
}
