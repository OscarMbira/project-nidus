import { useState, useEffect } from 'react'
import { recordConsent, getConsentHistory } from '../../services/gdprService'
import { ShieldCheck, CheckCircle, XCircle, Clock, History } from 'lucide-react'

export default function ConsentManager() {
  const [consents, setConsents] = useState({
    data_processing: false,
    marketing: false,
    analytics: false,
    cookies: false
  })
  const [consentHistory, setConsentHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConsentData()
  }, [])

  const fetchConsentData = async () => {
    try {
      setLoading(true)
      const historyResult = await getConsentHistory()

      if (historyResult.success && historyResult.data && historyResult.data.length > 0) {
        setConsentHistory(historyResult.data)

        // Get the most recent consent for each type
        const latestConsents = {}
        historyResult.data.forEach(consent => {
          if (!latestConsents[consent.consent_type] || 
              new Date(consent.created_at) > new Date(latestConsents[consent.consent_type].created_at)) {
            latestConsents[consent.consent_type] = consent
          }
        })

        // Set current consent state
        Object.keys(latestConsents).forEach(type => {
          if (consents.hasOwnProperty(type)) {
            setConsents(prev => ({
              ...prev,
              [type]: latestConsents[type].consent_given
            }))
          }
        })
      }
    } catch (error) {
      console.error('Error fetching consent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConsentChange = async (consentType, given) => {
    try {
      setSaving(true)
      const result = await recordConsent(
        consentType,
        given,
        `User ${given ? 'granted' : 'withdrew'} consent for ${consentType}`
      )

      if (result.success) {
        setConsents(prev => ({ ...prev, [consentType]: given }))
        await fetchConsentData()
      } else {
        alert(result.message || 'Failed to update consent')
      }
    } catch (error) {
      console.error('Error updating consent:', error)
      alert('Failed to update consent')
    } finally {
      setSaving(false)
    }
  }

  const getConsentStatus = (consentType) => {
    const latest = consentHistory
      .filter(c => c.consent_type === consentType)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    
    return latest ? latest.consent_given : false
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

  const consentTypes = [
    {
      key: 'data_processing',
      label: 'Data Processing',
      description: 'Allow us to process your personal data for core service functionality'
    },
    {
      key: 'marketing',
      label: 'Marketing Communications',
      description: 'Receive marketing emails and promotional content'
    },
    {
      key: 'analytics',
      label: 'Analytics & Tracking',
      description: 'Help us improve our services through analytics and usage tracking'
    },
    {
      key: 'cookies',
      label: 'Cookies',
      description: 'Allow us to use cookies to enhance your experience'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Consent Management
        </h2>
        <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="space-y-4 mb-8">
        {consentTypes.map((type) => (
          <div
            key={type.key}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {type.label}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {type.description}
                </p>
                <div className="flex items-center gap-2">
                  {getConsentStatus(type.key) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Granted
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Not Granted
                      </span>
                    </>
                  )}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consents[type.key] || false}
                  onChange={(e) => handleConsentChange(type.key, e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {consentHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Consent History
            </h3>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consentHistory.slice(0, 10).map((consent) => (
              <div
                key={consent.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {consent.consent_given ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {consent.consent_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {consent.consent_method === 'explicit' ? 'Explicit' : 'Implicit'}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(consent.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

