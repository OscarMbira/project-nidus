import { useState, useEffect } from 'react'
import { updatePrivacyPreferences, getPrivacyPreferences } from '../../services/gdprService'
import { Shield, Mail, BarChart3, Users, Save } from 'lucide-react'

export default function PrivacySettings() {
  const [preferences, setPreferences] = useState({
    allow_marketing_emails: false,
    allow_analytics_tracking: false,
    allow_third_party_sharing: false,
    data_retention_preference: 'standard',
    communication_preferences: {
      email: true,
      sms: false,
      push: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await (await import('../../services/supabaseClient')).supabase.auth.getUser()
      if (!user) return

      const result = await getPrivacyPreferences(user.id)
      if (result.success && result.data) {
        setPreferences({
          ...preferences,
          ...result.data,
          communication_preferences: result.data.communication_preferences || preferences.communication_preferences
        })
      }
    } catch (error) {
      console.error('Error fetching privacy preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const result = await updatePrivacyPreferences(preferences)

      if (result.success) {
        alert('Privacy preferences updated successfully')
      } else {
        alert(result.message || 'Failed to update preferences')
      }
    } catch (error) {
      console.error('Error updating privacy preferences:', error)
      alert('Failed to update privacy preferences')
    } finally {
      setSaving(false)
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Privacy Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control how your data is used and shared
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Marketing Emails
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive promotional emails, newsletters, and marketing communications
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.allow_marketing_emails}
                onChange={(e) => setPreferences({ ...preferences, allow_marketing_emails: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Analytics & Tracking
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow us to use analytics to improve our services and understand usage patterns
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.allow_analytics_tracking}
                onChange={(e) => setPreferences({ ...preferences, allow_analytics_tracking: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Third-Party Sharing
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow us to share your data with trusted third-party partners for service enhancement
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.allow_third_party_sharing}
                onChange={(e) => setPreferences({ ...preferences, allow_third_party_sharing: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Retention Preference
          </label>
          <select
            value={preferences.data_retention_preference}
            onChange={(e) => setPreferences({ ...preferences, data_retention_preference: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="minimal">Minimal - Delete as soon as legally allowed</option>
            <option value="standard">Standard - Keep for service duration</option>
            <option value="extended">Extended - Keep for extended period for service improvement</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Note: Some data may be retained for legal or regulatory requirements regardless of your preference
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Communication Preferences
          </label>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm text-gray-900 dark:text-white">Email Notifications</span>
              <input
                type="checkbox"
                checked={preferences.communication_preferences.email}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    email: e.target.checked
                  }
                })}
                className="ml-3"
              />
            </label>
            <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm text-gray-900 dark:text-white">SMS Notifications</span>
              <input
                type="checkbox"
                checked={preferences.communication_preferences.sms}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    sms: e.target.checked
                  }
                })}
                className="ml-3"
              />
            </label>
            <label className="flex items-center justify-between p-3 border border-gray-200200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm text-gray-900 dark:text-white">Push Notifications</span>
              <input
                type="checkbox"
                checked={preferences.communication_preferences.push}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    push: e.target.checked
                  }
                })}
                className="ml-3"
              />
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}

