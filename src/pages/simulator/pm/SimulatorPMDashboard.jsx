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
  GraduationCap
} from 'lucide-react'

export default function SimulatorPMDashboard() {
  const [stats, setStats] = useState({
    activePracticeWorkPackages: 0,
    openPracticeRisks: 0,
    openPracticeIssues: 0,
    practiceQualityActivities: 0,
    pendingPracticeReports: 0,
    practiceLessonsLogged: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load summary counts from practice tables in sim schema
      const [risksRes, issuesRes] = await Promise.all([
        simDb.from('practice_risks').select('id', { count: 'exact', head: true }).eq('risk_status', 'open'),
        simDb.from('practice_issues').select('id', { count: 'exact', head: true }).eq('issue_status', 'open')
      ])

      setStats({
        activePracticeWorkPackages: 0,
        openPracticeRisks: risksRes.count || 0,
        openPracticeIssues: issuesRes.count || 0,
        practiceQualityActivities: 0,
        pendingPracticeReports: 0,
        practiceLessonsLogged: 0
      })
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice PM Dashboard</h1>
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
    </div>
  )
}
