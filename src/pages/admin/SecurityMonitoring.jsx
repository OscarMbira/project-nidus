import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSecurityDashboardStats, getFailedLoginAttempts, getUnauthorizedAccessAttempts, getSuspiciousActivities, getSecurityAlerts } from '../../services/securityMonitoringService'
import { StatCard } from '../../components/DashboardWidgets'

export default function SecurityMonitoring() {
  const [stats, setStats] = useState({
    total_events: 0,
    active_alerts: 0,
    active_incidents: 0,
    failed_logins_24h: 0
  })
  const [failedLogins, setFailedLogins] = useState([])
  const [unauthorizedAccess, setUnauthorizedAccess] = useState([])
  const [suspiciousActivities, setSuspiciousActivities] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const navigate = useNavigate()

  useEffect(() => {
    fetchSecurityData()
    const interval = setInterval(fetchSecurityData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      
      const [statsResult, failedLoginsResult, unauthorizedResult, suspiciousResult, alertsResult] = await Promise.all([
        getSecurityDashboardStats(),
        getFailedLoginAttempts(timeRange),
        getUnauthorizedAccessAttempts(timeRange),
        getSuspiciousActivities(timeRange),
        getSecurityAlerts({ status: 'new', limit: 10 })
      ])

      if (statsResult.success) setStats(statsResult.data)
      if (failedLoginsResult.success) setFailedLogins(failedLoginsResult.data || [])
      if (unauthorizedResult.success) setUnauthorizedAccess(unauthorizedResult.data || [])
      if (suspiciousResult.success) setSuspiciousActivities(suspiciousResult.data || [])
      if (alertsResult.success) setAlerts(alertsResult.data || [])
    } catch (error) {
      console.error('Error fetching security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[severity] || colors.medium
  }

  if (loading && !stats.total_events) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading security monitoring...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Monitoring
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Real-time security dashboard and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={() => navigate('/admin/security/alerts')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            View All Alerts
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Security Events"
          value={stats.total_events || 0}
          icon="🛡️"
          color="blue"
        />
        <StatCard
          title="Active Alerts"
          value={stats.active_alerts || 0}
          subtitle="Requires attention"
          icon="⚠️"
          color={stats.active_alerts > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Active Incidents"
          value={stats.active_incidents || 0}
          subtitle="Under investigation"
          icon="🚨"
          color={stats.active_incidents > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Failed Logins (24h)"
          value={stats.failed_logins_24h || 0}
          subtitle="Last 24 hours"
          icon="🔒"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Active Security Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Active Security Alerts
            </h2>
            <button
              onClick={() => navigate('/admin/security/alerts')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all →
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No active alerts
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/security/alerts/${alert.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(alert.detection_time).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Failed Login Attempts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Failed Login Attempts
          </h2>
          {failedLogins.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No failed login attempts
            </p>
          ) : (
            <div className="space-y-3">
              {failedLogins.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.user_id ? 'User login attempt' : 'Unknown user'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        IP: {event.ip_address || 'Unknown'} • {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-red-600 dark:text-red-400">Failed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suspicious Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Suspicious Activities
        </h2>
        {suspiciousActivities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No suspicious activities detected
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {suspiciousActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.event_type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(activity.severity)}`}>
                        {activity.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.risk_score || 0}/100
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {activity.ip_address || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

