import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { ShieldCheck, FileText, Trash2, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export default function GDPRDashboard() {
  const [stats, setStats] = useState({
    total_consents: 0,
    pending_exports: 0,
    pending_deletions: 0,
    active_breaches: 0
  })
  const [exportRequests, setExportRequests] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [dataBreaches, setDataBreaches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [exports, deletions, breaches, consents] = await Promise.all([
        supabase.from('data_export_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(10),
        supabase.from('data_deletion_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(10),
        supabase.from('data_breach_records').select('*').eq('is_deleted', false).neq('status', 'closed').order('breach_detected_at', { ascending: false }).limit(10),
        supabase.from('consent_logs').select('id', { count: 'exact', head: true })
      ])

      if (exports.data) setExportRequests(exports.data)
      if (deletions.data) setDeletionRequests(deletions.data)
      if (breaches.data) setDataBreaches(breaches.data)

      const [exportsCount, deletionsCount, breachesCount] = await Promise.all([
        supabase.from('data_export_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        supabase.from('data_deletion_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        supabase.from('data_breach_records').select('id', { count: 'exact', head: true }).eq('is_deleted', false).neq('status', 'closed')
      ])

      setStats({
        total_consents: consents.count || 0,
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Consents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_consents}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Exports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_exports}</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Deletions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_deletions}</p>
            </div>
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Breaches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_breaches}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Export Requests */}
      {exportRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Export Requests
          </h3>
          <div className="space-y-3">
            {exportRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      User: {request.user_id?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Format: {request.export_format?.toUpperCase()} • Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  {request.request_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deletion Requests */}
      {deletionRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Deletion Requests
          </h3>
          <div className="space-y-3">
            {deletionRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      User: {request.user_id?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                      {request.scheduled_deletion_date && (
                        <span> • Scheduled: {new Date(request.scheduled_deletion_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                  {request.request_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Breaches */}
      {dataBreaches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Data Breaches
          </h3>
          <div className="space-y-3">
            {dataBreaches.map((breach) => (
              <div key={breach.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">
                        {breach.breach_number}: {breach.breach_type}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Severity: {breach.severity} • Affected Users: {breach.affected_users_count || breach.affected_users?.length || 0}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                    {breach.status}
                  </span>
                </div>
                {breach.mitigation_steps && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2 pl-8">
                    Mitigation: {breach.mitigation_steps}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {exportRequests.length === 0 && deletionRequests.length === 0 && dataBreaches.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No pending GDPR requests or active breaches
          </p>
        </div>
      )}
    </div>
  )
}

