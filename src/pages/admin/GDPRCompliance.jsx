import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { processDataExportRequest, processDataDeletionRequest, createDataBreachRecord } from '../../services/gdprService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function GDPRCompliance() {
  const [stats, setStats] = useState({
    total_consents: 0,
    pending_exports: 0,
    pending_deletions: 0,
    active_breaches: 0
  })
  const [exportRequests, setExportRequests] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [consentLogs, setConsentLogs] = useState([])
  const [dataBreaches, setDataBreaches] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchGDPRData()
  }, [])

  const fetchGDPRData = async () => {
    try {
      setLoading(true)

      const [exports, deletions, consents, breaches] = await Promise.all([
        supabase.from('data_export_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(10),
        supabase.from('data_deletion_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(10),
        supabase.from('consent_logs').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('data_breach_records').select('*').eq('is_deleted', false).neq('status', 'closed').order('breach_detected_at', { ascending: false }).limit(10)
      ])

      if (exports.data) setExportRequests(exports.data)
      if (deletions.data) setDeletionRequests(deletions.data)
      if (consents.data) setConsentLogs(consents.data)
      if (breaches.data) setDataBreaches(breaches.data)

      // Get counts
      const [consentsCount, exportsCount, deletionsCount, breachesCount] = await Promise.all([
        supabase.from('consent_logs').select('id', { count: 'exact', head: true }),
        supabase.from('data_export_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        supabase.from('data_deletion_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        supabase.from('data_breach_records').select('id', { count: 'exact', head: true }).eq('is_deleted', false).neq('status', 'closed')
      ])

      setStats({
        total_consents: consentsCount.count || 0,
        pending_exports: exportsCount.count || 0,
        pending_deletions: deletionsCount.count || 0,
        active_breaches: breachesCount.count || 0
      })
    } catch (error) {
      console.error('Error fetching GDPR data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessExport = async (requestId) => {
    if (!confirm('Process this data export request?')) return

    try {
      const result = await processDataExportRequest(requestId)
      if (result.success) {
        alert('Export request processed successfully')
        fetchGDPRData()
      }
    } catch (error) {
      console.error('Error processing export request:', error)
      alert('Failed to process export request')
    }
  }

  const handleProcessDeletion = async (requestId) => {
    if (!confirm('Process this data deletion request? This action cannot be undone.')) return
    if (!confirm('Are you absolutely sure? This will permanently delete user data.')) return

    try {
      const result = await processDataDeletionRequest(requestId)
      if (result.success) {
        alert('Deletion request processed successfully')
        fetchGDPRData()
      }
    } catch (error) {
      console.error('Error processing deletion request:', error)
      alert('Failed to process deletion request')
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
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status] || colors.pending
  }

  if (loading && stats.total_consents === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading GDPR compliance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            GDPR Compliance
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage GDPR compliance, consent, and data subject rights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/gdpr/consent')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Consent Management
          </button>
          <button
            onClick={() => navigate('/admin/gdpr/data-breaches')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Data Breaches
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Consents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total_consents || 0}</p>
            </div>
            <div className="bg-green-500 rounded-lg p-3">
              <span className="text-white text-2xl">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Exports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.pending_exports || 0}</p>
            </div>
            <div className="bg-blue-500 rounded-lg p-3">
              <span className="text-white text-2xl">📥</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Deletions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.pending_deletions || 0}</p>
            </div>
            <div className="bg-red-500 rounded-lg p-3">
              <span className="text-white text-2xl">🗑️</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Breaches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.active_breaches || 0}</p>
            </div>
            <div className="bg-orange-500 rounded-lg p-3">
              <span className="text-white text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Data Export Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pending Export Requests
            </h2>
            <button
              onClick={() => navigate('/admin/gdpr/export-requests')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all →
            </button>
          </div>
          {exportRequests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No pending export requests
            </p>
          ) : (
            <div className="space-y-3">
              {exportRequests.map((request, index) => (
                <div
                  key={request.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Export Request • {request.export_format.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        User: {request.user_id.substring(0, 8)}... • {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(request.request_status)}`}>
                      {request.request_status}
                    </span>
                  </div>
                  {request.request_status === 'pending' && (
                    <button
                      onClick={() => handleProcessExport(request.id)}
                      className="mt-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Process Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Deletion Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pending Deletion Requests
            </h2>
            <button
              onClick={() => navigate('/admin/gdpr/deletion-requests')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all →
            </button>
          </div>
          {deletionRequests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No pending deletion requests
            </p>
          ) : (
            <div className="space-y-3">
              {deletionRequests.map((request, index) => (
                <div
                  key={request.id}
                  className="p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Deletion Request
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        User: {request.user_id.substring(0, 8)}... • {new Date(request.requested_at).toLocaleString()}
                      </p>
                      {request.scheduled_deletion_date && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Scheduled: {new Date(request.scheduled_deletion_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(request.request_status)}`}>
                      {request.request_status}
                    </span>
                  </div>
                  {request.request_status === 'pending' && (
                    <button
                      onClick={() => handleProcessDeletion(request.id)}
                      className="mt-2 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Process Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Consent Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Consent Changes
        </h2>
        {consentLogs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No consent history
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {consentLogs.map((consent, index) => (
                  <tr key={consent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {consent.consent_type.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {consent.user_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        consent.consent_given
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {consent.consent_given ? 'Granted' : 'Withdrawn'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {consent.consent_method}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(consent.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Data Breaches */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Data Breaches
          </h2>
          <button
            onClick={() => navigate('/admin/gdpr/data-breaches')}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            View all →
          </button>
        </div>
        {dataBreaches.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No active data breaches
          </p>
        ) : (
          <div className="space-y-3">
            {dataBreaches.map((breach, index) => (
              <div
                key={breach.id}
                className="p-4 border border-orange-200 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {breach.breach_number}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(breach.severity)}`}>
                        {breach.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Type: {breach.breach_type} • Affected Users: {breach.affected_users_count || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Detected: {new Date(breach.breach_detected_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/gdpr/data-breaches/${breach.id}`)}
                    className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

