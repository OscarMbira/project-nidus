import { useState, useEffect } from 'react'
import { recordConsent, getConsentHistory, requestDataExport, requestDataDeletion, updatePrivacyPreferences, getPrivacyPreferences } from '../../services/gdprService'
import { supabase } from '../../services/supabaseClient'

export default function PrivacyCenter() {
  const [privacyPrefs, setPrivacyPrefs] = useState({
    allow_marketing_emails: false,
    allow_analytics_tracking: false,
    allow_third_party_sharing: false,
    data_retention_preference: 'standard'
  })
  const [consentHistory, setConsentHistory] = useState([])
  const [exportRequests, setExportRequests] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPrivacyData()
  }, [])

  const fetchPrivacyData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [prefsResult, consentResult] = await Promise.all([
        getPrivacyPreferences(user.id),
        getConsentHistory(user.id)
      ])

      if (prefsResult.success && prefsResult.data) {
        setPrivacyPrefs(prefsResult.data)
      }

      if (consentResult.success) {
        setConsentHistory(consentResult.data || [])
      }

      // Fetch export/deletion requests
      const { data: exports } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('requested_at', { ascending: false })

      const { data: deletions } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('requested_at', { ascending: false })

      if (exports) setExportRequests(exports)
      if (deletions) setDeletionRequests(deletions)
    } catch (error) {
      console.error('Error fetching privacy data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await updatePrivacyPreferences(user.id, privacyPrefs)
      if (result.success) {
        alert('Privacy preferences saved successfully')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleRequestDataExport = async () => {
    if (!confirm('Request a copy of your data? This may take up to 30 days to process.')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await requestDataExport(user.id, 'json')
      if (result.success) {
        alert('Data export request submitted. You will be notified when it\'s ready.')
        fetchPrivacyData()
      }
    } catch (error) {
      console.error('Error requesting data export:', error)
      alert('Failed to request data export')
    }
  }

  const handleRequestDataDeletion = async () => {
    const confirmText = prompt(
      'This action cannot be undone. Type "DELETE" to confirm that you want to permanently delete your account and all associated data.'
    )
    
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" to confirm.')
      return
    }

    if (!confirm('Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await requestDataDeletion(user.id)
      if (result.success) {
        alert('Data deletion request submitted. Your account will be deleted within 30 days unless you contact support to cancel.')
        fetchPrivacyData()
      }
    } catch (error) {
      console.error('Error requesting data deletion:', error)
      alert('Failed to request data deletion')
    }
  }

  const handleConsentChange = async (consentType, given) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await recordConsent(user.id, consentType, given, `User ${given ? 'granted' : 'withdrew'} consent for ${consentType}`)
      fetchPrivacyData()
    } catch (error) {
      console.error('Error recording consent:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading privacy center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Privacy Center
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your privacy settings and data rights
        </p>
      </div>

      {/* Privacy Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Privacy Preferences
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Marketing Emails
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Receive marketing and promotional emails
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacyPrefs.allow_marketing_emails}
                onChange={(e) => {
                  setPrivacyPrefs({ ...privacyPrefs, allow_marketing_emails: e.target.checked })
                  handleConsentChange('marketing', e.target.checked)
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Analytics Tracking
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Allow analytics and usage tracking
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacyPrefs.allow_analytics_tracking}
                onChange={(e) => {
                  setPrivacyPrefs({ ...privacyPrefs, allow_analytics_tracking: e.target.checked })
                  handleConsentChange('analytics', e.target.checked)
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Third-Party Sharing
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Allow sharing data with third-party services
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacyPrefs.allow_third_party_sharing}
                onChange={(e) => {
                  setPrivacyPrefs({ ...privacyPrefs, allow_third_party_sharing: e.target.checked })
                  handleConsentChange('third_party', e.target.checked)
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Data Export Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Data Export Requests
          </h2>
          <button
            onClick={handleRequestDataExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Request Data Export
          </button>
        </div>
        
        {exportRequests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No data export requests
          </p>
        ) : (
          <div className="space-y-3">
            {exportRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.export_format.toUpperCase()} Export Request
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Requested: {new Date(request.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    request.request_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    request.request_status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    request.request_status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {request.request_status}
                  </span>
                </div>
                {request.export_file_path && request.request_status === 'completed' && (
                  <a
                    href={request.export_file_path}
                    download
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Download exported data →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Deletion Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Right to be Forgotten
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Request permanent deletion of your account and all associated data
            </p>
          </div>
          <button
            onClick={handleRequestDataDeletion}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Request Account Deletion
          </button>
        </div>
        
        {deletionRequests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No deletion requests
          </p>
        ) : (
          <div className="space-y-3">
            {deletionRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Deletion Request
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Requested: {new Date(request.requested_at).toLocaleString()}
                      {request.scheduled_deletion_date && (
                        <> • Scheduled: {new Date(request.scheduled_deletion_date).toLocaleString()}</>
                      )}
                    </p>
                    {request.retention_exceptions && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Note: {request.retention_exceptions}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    request.request_status === 'completed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    request.request_status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {request.request_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consent History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Consent History
        </h2>
        
        {consentHistory.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No consent history
          </p>
        ) : (
          <div className="space-y-3">
            {consentHistory.slice(0, 10).map((consent) => (
              <div
                key={consent.id}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {consent.consent_type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(consent.created_at).toLocaleString()} • {consent.consent_method}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    consent.consent_given
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {consent.consent_given ? 'Granted' : 'Withdrawn'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

