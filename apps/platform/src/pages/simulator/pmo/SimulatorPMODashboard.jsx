import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { simDb } from '../../../services/supabase/supabaseClient'
import {
  Shield,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckSquare,
  BarChart3,
  Eye,
  Clock,
  FileCheck
} from 'lucide-react'

export default function SimulatorPMODashboard() {
  const [stats, setStats] = useState({
    totalBaselines: 0,
    pendingReviews: 0,
    activePracticeProjects: 0,
    openPracticeRisks: 0,
    openPracticeIssues: 0,
    reportsThisMonth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load summary counts from practice tables in sim schema
      const [projectsRes, risksRes, issuesRes] = await Promise.all([
        simDb.from('practice_projects').select('id', { count: 'exact', head: true }),
        simDb.from('practice_risks').select('id', { count: 'exact', head: true }).eq('risk_status', 'open'),
        simDb.from('practice_issues').select('id', { count: 'exact', head: true }).eq('issue_status', 'open')
      ])

      setStats({
        totalBaselines: 5, // Practice PMO governance documents count
        pendingReviews: 0,
        activePracticeProjects: projectsRes.count || 0,
        openPracticeRisks: risksRes.count || 0,
        openPracticeIssues: issuesRes.count || 0,
        reportsThisMonth: 0
      })
    } catch (error) {
      console.error('Error loading Practice PMO dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Practice Governance Baselines',
      value: stats.totalBaselines,
      icon: Shield,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      link: '/simulator/pmo/governance/mandate'
    },
    {
      label: 'Active Practice Projects',
      value: stats.activePracticeProjects,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/simulator/pmo/oversight/risk-register'
    },
    {
      label: 'Open Practice Risks',
      value: stats.openPracticeRisks,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/simulator/pmo/oversight/risk-register'
    },
    {
      label: 'Open Practice Issues',
      value: stats.openPracticeIssues,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      link: '/simulator/pmo/oversight/issue-register'
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      link: '/simulator/pmo/initiation/business-case'
    },
    {
      label: 'Practice Reports This Month',
      value: stats.reportsThisMonth,
      icon: BarChart3,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      link: '/simulator/pmo/reporting/highlight-reports'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice PMO Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of practice governance, oversight, and reporting activities
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
            to="/simulator/pmo/governance/mandate"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Manage Baselines</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage practice governance baselines</p>
          </Link>
          <Link
            to="/simulator/pmo/initiation/business-case"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Review Documents</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and approve practice initiation documents</p>
          </Link>
          <Link
            to="/simulator/pmo/oversight/risk-register"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Project Oversight</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor practice project registers</p>
          </Link>
          <Link
            to="/simulator/pmo/reporting/highlight-reports"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">View Reports</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access practice project reports</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
