import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
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

export default function PMODashboard() {
  const [stats, setStats] = useState({
    totalBaselines: 0,
    pendingReviews: 0,
    activeProjects: 0,
    openRisks: 0,
    openIssues: 0,
    reportsThisMonth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load summary counts; use allSettled so 403/RLS on any table doesn't break the whole dashboard
      const [projectsRes, risksRes, issuesRes] = await Promise.allSettled([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('risks').select('id', { count: 'exact', head: true }).in('status', ['identified', 'assessed', 'mitigated', 'monitored']).eq('is_deleted', false),
        supabase.from('issues').select('id', { count: 'exact', head: true }).in('status', ['new', 'assigned', 'in_progress', 'resolved', 'reopened']).eq('is_deleted', false)
      ])

      const projectsCount = projectsRes.status === 'fulfilled' && !projectsRes.value.error ? (projectsRes.value.count ?? 0) : 0
      const risksCount = risksRes.status === 'fulfilled' && !risksRes.value.error ? (risksRes.value.count ?? 0) : 0
      const issuesCount = issuesRes.status === 'fulfilled' && !issuesRes.value.error ? (issuesRes.value.count ?? 0) : 0

      setStats({
        totalBaselines: 5, // PMO governance documents count
        pendingReviews: 0,
        activeProjects: projectsCount,
        openRisks: risksCount,
        openIssues: issuesCount,
        reportsThisMonth: 0
      })
    } catch (error) {
      console.error('Error loading PMO dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Governance Baselines',
      value: stats.totalBaselines,
      icon: Shield,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      link: '/pmo/governance/mandate'
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/pmo/oversight/risk-register'
    },
    {
      label: 'Open Risks',
      value: stats.openRisks,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/pmo/oversight/risk-register'
    },
    {
      label: 'Open Issues',
      value: stats.openIssues,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      link: '/pmo/oversight/issue-register'
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      link: '/pmo/initiation/business-case'
    },
    {
      label: 'Reports This Month',
      value: stats.reportsThisMonth,
      icon: BarChart3,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      link: '/pmo/reporting/highlight-reports'
    }
  ]

  const quickActions = [
    { label: 'Review Business Cases', path: '/pmo/initiation/business-case', icon: FileText },
    { label: 'View Risk Register', path: '/pmo/oversight/risk-register', icon: AlertTriangle },
    { label: 'View Issue Register', path: '/pmo/oversight/issue-register', icon: AlertCircle },
    { label: 'Highlight Reports', path: '/pmo/reporting/highlight-reports', icon: BarChart3 },
    { label: 'Quality Register', path: '/pmo/oversight/quality-register', icon: CheckSquare },
    { label: 'End Project Reports', path: '/pmo/reporting/end-project-reports', icon: FileCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PMO Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Governance, standards, assurance and oversight
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

      {/* Governance Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Eye className="h-5 w-5 inline-block mr-2 text-indigo-600 dark:text-indigo-400" />
          Governance Baselines
        </h2>
        <div className="space-y-3">
          {[
            { name: 'Project Mandate', path: '/pmo/governance/mandate', status: 'Active' },
            { name: 'Communication Management Strategy', path: '/pmo/governance/communication-strategy', status: 'Active' },
            { name: 'Configuration Management Strategy', path: '/pmo/governance/configuration-strategy', status: 'Active' },
            { name: 'Quality Management Strategy', path: '/pmo/governance/quality-strategy', status: 'Active' },
            { name: 'Risk Management Strategy', path: '/pmo/governance/risk-strategy', status: 'Active' },
          ].map((doc, index) => (
            <Link
              key={doc.name}
              to={doc.path}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{doc.name}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {doc.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
