import { useState, useEffect } from 'react'
import { getMFADevices, disableMFA, setPrimaryDevice, generateBackupCodes } from '../../services/mfaService'
import { ShieldCheck, Trash2, Star, Key, RefreshCw } from 'lucide-react'

export default function MFAManagement({ onEnrollNew }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingCodes, setGeneratingCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const result = await getMFADevices()
      if (result.success) {
        setDevices(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching MFA devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (deviceId) => {
    if (!confirm('Are you sure you want to disable this MFA device?')) return

    try {
      const result = await disableMFA(deviceId)
      if (result.success) {
        await fetchDevices()
        alert('MFA device disabled successfully')
      } else {
        alert(result.message || 'Failed to disable device')
      }
    } catch (error) {
      console.error('Error disabling device:', error)
      alert('Failed to disable device')
    }
  }

  const handleSetPrimary = async (deviceId) => {
    try {
      const result = await setPrimaryDevice(deviceId)
      if (result.success) {
        await fetchDevices()
        alert('Primary device updated successfully')
      } else {
        alert(result.message || 'Failed to set primary device')
      }
    } catch (error) {
      console.error('Error setting primary device:', error)
      alert('Failed to set primary device')
    }
  }

  const handleGenerateBackupCodes = async () => {
    try {
      setGeneratingCodes(true)
      const result = await generateBackupCodes(10)
      if (result.success) {
        setBackupCodes(result.data || [])
        setShowBackupCodes(true)
      } else {
        alert(result.message || 'Failed to generate backup codes')
      }
    } catch (error) {
      console.error('Error generating backup codes:', error)
      alert('Failed to generate backup codes')
    } finally {
      setGeneratingCodes(false)
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          MFA Devices
        </h2>
        {onEnrollNew && (
          <button
            onClick={onEnrollNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Add Device
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8">
          <ShieldCheck className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No MFA devices enrolled
          </p>
          {onEnrollNew && (
            <button
              onClick={onEnrollNew}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Enroll Your First Device
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {device.device_name}
                    </h3>
                    {device.is_primary && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                        Primary
                      </span>
                    )}
                    {device.is_verified && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {device.device_type.toUpperCase()} • Last used:{' '}
                    {device.last_used_at
                      ? new Date(device.last_used_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!device.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(device.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    title="Set as primary"
                  >
                    <Star className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDisable(device.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Remove device"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Backup Codes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use backup codes to access your account if you lose your MFA device
                </p>
              </div>
              <button
                onClick={handleGenerateBackupCodes}
                disabled={generatingCodes}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generatingCodes ? 'animate-spin' : ''}`} />
                Generate Codes
              </button>
            </div>

            {showBackupCodes && backupCodes.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      ⚠️ Important: Save these backup codes!
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Each code can only be used once. Store them in a safe place.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBackupCodes(false)}
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {backupCodes.map((code, index) => (
                    <code
                      key={index}
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const text = backupCodes.join('\n')
                    const blob = new Blob([text], { type: 'text/plain' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'backup-codes.txt'
                    a.click()
                    window.URL.revokeObjectURL(url)
                  }}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Download Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

