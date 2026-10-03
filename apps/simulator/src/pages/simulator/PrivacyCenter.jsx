/**
 * Privacy Center — self-service GDPR (v1108, Simulator). Simulator parity for
 * apps/platform/src/pages/settings/PrivacyCenter.jsx, against sim.* tables via simGdprService.js.
 * Unlike Platform, "userId" passed to these functions is the raw Supabase auth uid directly
 * (sim.consent_logs/data_export_requests/data_deletion_requests/privacy_preferences.user_id all
 * reference auth.users(id) — see simGdprService.js's header comment) — no internal-id resolution
 * needed for these calls specifically.
 * Route: /simulator/settings/privacy
 */
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  recordConsent, getConsentHistory, requestDataExport, requestDataDeletion, cancelDataDeletionRequest,
  updatePrivacyPreferences, getPrivacyPreferences,
} from '../../services/sim/simGdprService'
import { simDb } from '../../services/supabase/supabaseClient'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function PrivacyCenter() {
  const { showSuccess, modal } = useSuccessModal()
  const [authUserId, setAuthUserId] = useState(null)
  const [privacyPrefs, setPrivacyPrefs] = useState({
    allow_marketing_emails: false,
    allow_analytics_tracking: false,
    allow_third_party_sharing: false,
    data_retention_preference: 'standard',
  })
  const [consentHistory, setConsentHistory] = useState([])
  const [exportRequests, setExportRequests] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const fetchPrivacyData = async (userId) => {
    try {
      setLoading(true)
      const [prefsResult, consentResult] = await Promise.all([
        getPrivacyPreferences(userId),
        getConsentHistory(userId),
      ])

      if (prefsResult.success && prefsResult.data) setPrivacyPrefs(prefsResult.data)
      if (consentResult.success) setConsentHistory(consentResult.data || [])

      const [{ data: exports }, { data: deletions }] = await Promise.all([
        simDb.from('data_export_requests').select('*').eq('user_id', userId).eq('is_deleted', false).order('requested_at', { ascending: false }),
        simDb.from('data_deletion_requests').select('*').eq('user_id', userId).eq('is_deleted', false).order('requested_at', { ascending: false }),
      ])

      if (exports) setExportRequests(exports)
      if (deletions) setDeletionRequests(deletions)
    } catch (error) {
      console.error('Error fetching privacy data:', error)
      toast.error('Failed to load privacy data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await simDb.auth.getUser()
      if (cancelled || !user) {
        setLoading(false)
        return
      }
      setAuthUserId(user.id)
      await fetchPrivacyData(user.id)
    })()
    return () => { cancelled = true }
  }, [])

  const handleSavePreferences = async () => {
    if (!authUserId) return
    setSaving(true)
    try {
      const result = await updatePrivacyPreferences(authUserId, privacyPrefs)
      if (result.success) {
        showSuccess({ recordId: authUserId, operation: 'updated', message: 'Privacy preferences saved.' })
      } else {
        toast.error(result.message || 'Failed to save preferences')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRequestDataExport = async () => {
    if (!authUserId) return
    const result = await requestDataExport(authUserId, 'json')
    if (result.success) {
      showSuccess({ recordId: result.data.id, operation: 'created', message: "Data export request submitted. You'll see it here once it's ready to download." })
      fetchPrivacyData(authUserId)
    } else {
      toast.error(result.message || 'Failed to request data export')
    }
  }

  const handleRequestDataDeletion = async () => {
    if (!authUserId) return
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }
    const result = await requestDataDeletion(authUserId)
    if (result.success) {
      setConfirmingDeletion(false)
      setDeleteConfirmText('')
      showSuccess({
        recordId: result.data.id,
        operation: 'created',
        message: 'Data deletion request submitted. Your account will be anonymized in 30 days unless you cancel the request before then.',
      })
      fetchPrivacyData(authUserId)
    } else {
      toast.error(result.message || 'Failed to request data deletion')
    }
  }

  const handleCancelDeletion = async (requestId) => {
    const result = await cancelDataDeletionRequest(requestId)
    if (result.success) {
      showSuccess({ recordId: requestId, operation: 'updated', message: 'Data deletion request cancelled.' })
      fetchPrivacyData(authUserId)
    } else {
      toast.error(result.message || 'Failed to cancel deletion request')
    }
  }

  const handleConsentChange = async (consentType, given) => {
    if (!authUserId) return
    await recordConsent(authUserId, consentType, given, `User ${given ? 'granted' : 'withdrew'} consent for ${consentType}`)
    fetchPrivacyData(authUserId)
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
      {modal}
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
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm min-h-[44px]"
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
              <div key={request.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                  <a href={request.export_file_path} download className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
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
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Right to be Forgotten
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Request permanent anonymization of your account and Tier-1 practice records
            </p>
          </div>
          {!confirmingDeletion ? (
            <button
              onClick={() => setConfirmingDeletion(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm min-h-[44px]"
            >
              Request Account Deletion
            </button>
          ) : null}
        </div>

        {confirmingDeletion && (
          <div className="mb-4 p-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 space-y-3">
            <p className="text-sm text-red-800 dark:text-red-300">
              This cannot be undone once processed. Your account and your Tier-1 practice records
              (Risks, Constraints, and other tracked modules) will be anonymized after a 30-day
              grace period. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full sm:w-48 px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmingDeletion(false); setDeleteConfirmText('') }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDataDeletion}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-40 min-h-[44px]"
              >
                Confirm Deletion Request
              </button>
            </div>
          </div>
        )}

        {deletionRequests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No deletion requests
          </p>
        ) : (
          <div className="space-y-3">
            {deletionRequests.map((request) => (
              <div key={request.id} className="p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      request.request_status === 'completed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      request.request_status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      request.request_status === 'rejected' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {request.request_status}
                    </span>
                    {request.request_status === 'pending' && (
                      <button
                        onClick={() => handleCancelDeletion(request.id)}
                        className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline"
                      >
                        Cancel request
                      </button>
                    )}
                  </div>
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
              <div key={consent.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
