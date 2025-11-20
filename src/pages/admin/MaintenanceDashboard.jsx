import { useState, useEffect } from 'react'
import { Settings, Calendar, Database, Shield, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useToastContext } from '../../context/ToastContext'

export default function MaintenanceDashboard() {
  const [maintenanceTasks, setMaintenanceTasks] = useState([])
  const [backupStatus, setBackupStatus] = useState({
    last_backup: null,
    backup_status: 'unknown',
    next_backup: null
  })
  const [systemInfo, setSystemInfo] = useState({
    uptime: null,
    version: '1.0.0',
    last_update: null
  })
  const [loading, setLoading] = useState(true)
  const toast = useToastContext()

  useEffect(() => {
    loadMaintenanceData()
    const interval = setInterval(loadMaintenanceData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const loadMaintenanceData = async () => {
    setLoading(true)
    try {
      // Load maintenance tasks (mock data for now)
      const tasks = [
        {
          id: '1',
          task_name: 'Daily System Check',
          task_type: 'daily',
          schedule: 'Daily at 02:00',
          last_run: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          duration: '15 minutes'
        },
        {
          id: '2',
          task_name: 'Database Backup',
          task_type: 'daily',
          schedule: 'Daily at 03:00',
          last_run: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          duration: '30 minutes'
        },
        {
          id: '3',
          task_name: 'Performance Review',
          task_type: 'weekly',
          schedule: 'Weekly on Monday',
          last_run: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          duration: '1 hour'
        },
        {
          id: '4',
          task_name: 'Security Audit',
          task_type: 'monthly',
          schedule: 'Monthly on 1st',
          last_run: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          duration: '2 hours'
        }
      ]

      setMaintenanceTasks(tasks)

      // Load backup status
      setBackupStatus({
        last_backup: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        backup_status: 'success',
        next_backup: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
      })

      // Load system info
      setSystemInfo({
        uptime: '99.8%',
        version: '1.0.0',
        last_update: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    } catch (error) {
      console.error('Error loading maintenance data:', error)
      toast.error('Failed to load maintenance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      success: 'text-green-600 dark:text-green-400',
      failed_status: 'text-red-600 dark:text-red-400'
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Maintenance Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor system maintenance tasks, backups, and system health
          </p>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* System Uptime */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</h3>
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {systemInfo.uptime || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Last 30 days</div>
          </div>

          {/* Backup Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Backup</h3>
              <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {backupStatus.last_backup ? formatDate(backupStatus.last_backup).split(',')[0] : 'N/A'}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={getStatusColor(backupStatus.backup_status)}>
                {backupStatus.backup_status === 'success' ? 'Success' : 'Failed'}
              </span>
            </div>
          </div>

          {/* System Version */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">System Version</h3>
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              v{systemInfo.version}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last update: {systemInfo.last_update ? formatDate(systemInfo.last_update).split(',')[0] : 'N/A'}
            </div>
          </div>
        </div>

        {/* Maintenance Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Scheduled Maintenance Tasks
              </h2>
              <button
                onClick={loadMaintenanceData}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading maintenance tasks...</p>
              </div>
            ) : maintenanceTasks.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No maintenance tasks scheduled
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Task Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Run
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Next Run
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {maintenanceTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {task.task_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Duration: {task.duration}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {task.task_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {task.schedule}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(task.last_run)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(task.next_run)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1 ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Maintenance
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">System Health Check</span>
                <span className="text-green-600 dark:text-green-400">02:00</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Database Backup</span>
                <span className="text-green-600 dark:text-green-400">03:00</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Log Cleanup</span>
                <span className="text-green-600 dark:text-green-400">04:00</span>
              </li>
            </ul>
          </div>

          {/* Weekly Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Maintenance
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Performance Review</span>
                <span className="text-blue-600 dark:text-blue-400">Monday</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Documentation Update</span>
                <span className="text-blue-600 dark:text-blue-400">Wednesday</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Dependency Update Check</span>
                <span className="text-blue-600 dark:text-blue-400">Friday</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Backup Information */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Backup Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Backup:</span>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {backupStatus.last_backup ? formatDate(backupStatus.last_backup) : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Next Backup:</span>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {backupStatus.next_backup ? formatDate(backupStatus.next_backup) : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-sm font-medium ${getStatusColor(backupStatus.backup_status)}`}>
                  {getStatusIcon(backupStatus.backup_status)}
                  {backupStatus.backup_status === 'success' ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

