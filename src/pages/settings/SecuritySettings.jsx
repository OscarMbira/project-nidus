import { useState, useEffect } from 'react'
import { getMFADevices, enrollMFA, verifyMFADevice, disableMFA, setPrimaryDevice, generateBackupCodes } from '../../services/mfaService'
import { supabase } from '../../services/supabaseClient'

export default function SecuritySettings() {
  const [mfaDevices, setMfaDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [deviceType, setDeviceType] = useState('totp')
  const [deviceName, setDeviceName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [currentDevice, setCurrentDevice] = useState(null)
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [activeSessions, setActiveSessions] = useState([])

  useEffect(() => {
    fetchMFADevices()
    fetchActiveSessions()
  }, [])

  const fetchMFADevices = async () => {
    try {
      setLoading(true)
      const result = await getMFADevices()
      if (result.success) {
        setMfaDevices(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching MFA devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })

      if (error) throw error
      setActiveSessions(data || [])
    } catch (error) {
      console.error('Error fetching active sessions:', error)
    }
  }

  const handleEnrollMFA = async () => {
    try {
      setEnrolling(true)
      const result = await enrollMFA(deviceType, {
        device_name: deviceName || `${deviceType.toUpperCase()} Device`,
        phone_number: deviceType === 'sms' ? '' : undefined,
        email_address: deviceType === 'email' ? '' : undefined
      })

      if (result.success) {
        if (deviceType === 'totp') {
          setCurrentDevice(result.data)
          setShowBackupCodes(false)
        } else {
          // For SMS/Email, show verification code input
          setCurrentDevice(result.data)
        }
      }
    } catch (error) {
      console.error('Error enrolling MFA:', error)
      alert('Failed to enroll MFA device')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerifyDevice = async () => {
    try {
      if (!currentDevice) return

      const result = await verifyMFADevice(currentDevice.id, verificationCode)
      if (result.success) {
        if (result.backup_codes) {
          setBackupCodes(result.backup_codes)
          setShowBackupCodes(true)
        }
        setCurrentDevice(null)
        setVerificationCode('')
        fetchMFADevices()
        alert('MFA device verified successfully!')
      } else {
        alert(result.message || 'Verification failed')
      }
    } catch (error) {
      console.error('Error verifying device:', error)
      alert('Failed to verify device')
    }
  }

  const handleDisableMFA = async (deviceId) => {
    if (!confirm('Are you sure you want to disable this MFA device?')) return

    try {
      const result = await disableMFA(deviceId, '')
      if (result.success) {
        fetchMFADevices()
        alert('MFA device disabled')
      }
    } catch (error) {
      console.error('Error disabling MFA:', error)
      alert('Failed to disable MFA device')
    }
  }

  const handleSetPrimary = async (deviceId) => {
    try {
      const result = await setPrimaryDevice(deviceId)
      if (result.success) {
        fetchMFADevices()
      }
    } catch (error) {
      console.error('Error setting primary device:', error)
    }
  }

  const handleGenerateBackupCodes = async () => {
    try {
      const result = await generateBackupCodes(10)
      if (result.success) {
        setBackupCodes(result.backup_codes)
        setShowBackupCodes(true)
      }
    } catch (error) {
      console.error('Error generating backup codes:', error)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      const { error } = await supabase
        .from('session_logs')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          logout_reason: 'revoked'
        })
        .eq('id', sessionId)

      if (error) throw error
      fetchActiveSessions()
    } catch (error) {
      console.error('Error revoking session:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Security Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your multi-factor authentication and security preferences
        </p>
      </div>

      {/* MFA Devices */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Multi-Factor Authentication
          </h2>
          <button
            onClick={handleGenerateBackupCodes}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Generate Backup Codes
          </button>
        </div>

        {/* Enroll New Device */}
        {!currentDevice && (
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Enroll New MFA Device
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Device Type
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="totp">Authenticator App (TOTP)</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., My iPhone"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={handleEnrollMFA}
                disabled={enrolling}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Device'}
              </button>
            </div>
          </div>
        )}

        {/* Verify Device */}
        {currentDevice && deviceType === 'totp' && (
          <div className="mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Verify Your Device
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan the QR code with your authenticator app and enter the verification code:
            </p>
            {currentDevice.totp_uri && (
              <div className="mb-4">
                {/* QR Code would be rendered here using a library like qrcode.react */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Or enter this secret manually: {currentDevice.totp_secret}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleVerifyDevice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Verify
              </button>
              <button
                onClick={() => setCurrentDevice(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Backup Codes */}
        {showBackupCodes && backupCodes.length > 0 && (
          <div className="mb-6 p-4 border border-yellow-200 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Backup Codes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Save these backup codes in a safe place. You can use them to access your account if you lose your MFA device.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <code key={index} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-mono">
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={() => setShowBackupCodes(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              I've Saved These Codes
            </button>
          </div>
        )}

        {/* MFA Devices List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : mfaDevices.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No MFA devices enrolled
          </p>
        ) : (
          <div className="space-y-3">
            {mfaDevices.map((device) => (
              <div
                key={device.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {device.device_name}
                      </span>
                      {device.is_primary && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                          Primary
                        </span>
                      )}
                      {device.is_verified && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {device.device_type.toUpperCase()} • Last used: {device.last_used_at ? new Date(device.last_used_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!device.is_primary && device.is_verified && (
                    <button
                      onClick={() => handleSetPrimary(device.id)}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDisableMFA(device.id)}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Active Sessions
        </h2>
        {activeSessions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No active sessions
          </p>
        ) : (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.device_type || 'Unknown Device'} • {session.browser || 'Unknown Browser'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    IP: {session.ip_address || 'Unknown'} • Started: {new Date(session.started_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last activity: {new Date(session.last_activity_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

