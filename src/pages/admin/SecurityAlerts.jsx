import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSecurityAlerts, assignSecurityAlert, resolveSecurityAlert } from '../../services/securityMonitoringService'
import { supabase } from '../../services/supabaseClient'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    assigned_to: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const result = await getSecurityAlerts(filters)
      if (result.success) {
        setAlerts(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching security alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (alertId, userId) => {
    try {
      const result = await assignSecurityAlert(alertId, userId)
      if (result.success) {
        fetchAlerts()
      }
    } catch (error) {
      console.error('Error assigning alert:', error)
      alert('Failed to assign alert')
    }
  }

  const handleResolve = async (alertId) => {
    const resolutionNotes = prompt('Enter resolution notes:')
    if (!resolutionNotes) return

    try {
      const result = await resolveSecurityAlert(alertId, resolutionNotes)
      if (result.success) {
        fetchAlerts()
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
      alert('Failed to resolve alert')
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

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      investigating: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      false_positive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
    return colors[status] || colors.new
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Alerts
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and investigate security alerts
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/security/monitoring')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          View Security Dashboard
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', severity: '', assigned_to: '' })}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No security alerts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Detected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {alerts.map((alert, index) => (
                  <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </p>
                        {alert.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
                            {alert.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {alert.alert_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {alert.assigned_to ? alert.assigned_to.substring(0, 8) + '...' : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(alert.detection_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {alert.status === 'new' && (
                          <button
                            onClick={async () => {
                              const { data: { user } } = await supabase.auth.getUser()
                              if (user) handleAssign(alert.id, user.id)
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            Assign to Me
                          </button>
                        )}
                        {alert.status === 'investigating' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/security/alerts/${alert.id}`)}
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                          View Details
                        </button>
                      </div>
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

