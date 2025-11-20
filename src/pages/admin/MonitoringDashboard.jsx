import { useState, useEffect } from 'react'
import { Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPerformanceMetrics } from '../../services/performanceService'
import { getSecurityDashboardStats, getSecurityAlerts } from '../../services/securityMonitoringService'
import { getSupportTicketStats } from '../../services/supportTicketService'

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('overview') // overview, performance, security, support
  const [performanceStats, setPerformanceStats] = useState(null)
  const [securityStats, setSecurityStats] = useState({})
  const [supportStats, setSupportStats] = useState(null)
  const [securityAlerts, setSecurityAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')
  const navigate = useNavigate()

  useEffect(() => {
    loadAllMetrics()
    const interval = setInterval(loadAllMetrics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [dateRange])

  const loadAllMetrics = async () => {
    setLoading(true)
    try {
      // Load performance metrics
      const perfFilters = getDateRangeFilters(dateRange)
      const perfResult = await getPerformanceMetrics(perfFilters)
      if (perfResult.success) {
        setPerformanceStats(perfResult.stats)
      }

      // Load security stats
      const secResult = await getSecurityDashboardStats()
      if (secResult.success) {
        setSecurityStats(secResult.data)
      }

      const alertsResult = await getSecurityAlerts({ status: 'new', limit: 5 })
      if (alertsResult.success) {
        setSecurityAlerts(alertsResult.data || [])
      }

      // Load support stats
      const supportFilters = getDateRangeFilters(dateRange)
      const supportResult = await getSupportTicketStats(supportFilters)
      if (supportResult.success) {
        setSupportStats(supportResult.data)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeFilters = (range) => {
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    return {
      start_date: startDate.toISOString(),
      end_date: now.toISOString()
    }
  }

  const formatTime = (ms) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getSystemHealth = () => {
    let healthScore = 100
    const issues = []

    // Performance checks
    if (performanceStats) {
      if (performanceStats.page_load.average > 2000) {
        healthScore -= 20
        issues.push('Page load time above target')
      }
      if (performanceStats.api_call.average > 500) {
        healthScore -= 15
        issues.push('API response time above target')
      }
    }

    // Security checks
    if (securityStats.active_alerts > 0) {
      healthScore -= securityStats.active_alerts * 10
      issues.push(`${securityStats.active_alerts} active security alert(s)`)
    }
    if (securityStats.active_incidents > 0) {
      healthScore -= securityStats.active_incidents * 20
      issues.push(`${securityStats.active_incidents} active security incident(s)`)
    }

    // Support checks
    if (supportStats) {
      const openTickets = supportStats.by_status?.open || 0
      const highPriorityTickets = (supportStats.by_priority?.high || 0) + (supportStats.by_priority?.critical || 0)
      if (openTickets > 50) {
        healthScore -= 10
        issues.push('High number of open support tickets')
      }
      if (highPriorityTickets > 10) {
        healthScore -= 15
        issues.push(`${highPriorityTickets} high priority support tickets`)
      }
    }

    return {
      score: Math.max(0, Math.min(100, healthScore)),
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
      issues
    }
  }

  const systemHealth = getSystemHealth()

  if (loading && !performanceStats && !securityStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading monitoring dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Unified view of system performance, security, and support metrics
          </p>
        </div>

        {/* System Health Overview */}
        <div className={`mb-8 rounded-lg p-6 border-2 ${
          systemHealth.status === 'healthy' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : systemHealth.status === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                System Health: {systemHealth.score}/100
              </h2>
              {systemHealth.issues.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                  {systemHealth.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
              {systemHealth.issues.length === 0 && (
                <p className="text-sm text-gray-700 dark:text-gray-300">All systems operational</p>
              )}
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {systemHealth.score}
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Last {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'performance', label: 'Performance', icon: Zap },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'support', label: 'Support', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Performance Score */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance Score</h3>
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {performanceStats ? (() => {
                    const pageLoadScore = performanceStats.page_load.average < 2000 ? 100 : Math.max(0, 100 - (performanceStats.page_load.average - 2000) / 20)
                    const apiScore = performanceStats.api_call.average < 500 ? 100 : Math.max(0, 100 - (performanceStats.api_call.average - 500) / 5)
                    return Math.round((pageLoadScore + apiScore) / 2)
                  })() : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Page load & API</div>
              </div>

              {/* Security Alerts */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Alerts</h3>
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {securityStats.active_alerts || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active alerts</div>
              </div>

              {/* Support Tickets */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Support Tickets</h3>
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {supportStats?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total tickets</div>
              </div>

              {/* System Uptime */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</h3>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {systemHealth.status === 'healthy' ? 'Operational' : systemHealth.status === 'warning' ? 'Degraded' : 'Critical'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Overall health</div>
              </div>
            </div>

            {/* Recent Security Alerts */}
            {securityAlerts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Security Alerts</h2>
                  <button
                    onClick={() => navigate('/admin/security/monitoring')}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-3">
                  {securityAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(alert.detection_time).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && performanceStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Page Load Time</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(performanceStats.page_load.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Target: &lt; {formatTime(2000)}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">API Response Time</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(performanceStats.api_call.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Target: &lt; {formatTime(500)}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Component Render</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(performanceStats.component_render.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Target: &lt; {formatTime(100)}
                </div>
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={() => navigate('/admin/performance')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View detailed performance metrics →
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Events</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {securityStats.total_events || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Alerts</h3>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {securityStats.active_alerts || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Incidents</h3>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {securityStats.active_incidents || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Failed Logins (24h)</h3>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {securityStats.failed_logins_24h || 0}
                </div>
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={() => navigate('/admin/security/monitoring')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View detailed security monitoring →
              </button>
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && supportStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Tickets</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {supportStats.total || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Avg Response Time</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {supportStats.avg_response_time ? `${Math.round(supportStats.avg_response_time / 60)}h ${supportStats.avg_response_time % 60}m` : 'N/A'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">SLA Compliance</h3>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {supportStats.total > 0 ? Math.round((supportStats.sla_met / (supportStats.sla_met + supportStats.sla_missed)) * 100) || 0 : 0}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Open Tickets</h3>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(supportStats.by_status?.open || 0) + (supportStats.by_status?.in_progress || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

