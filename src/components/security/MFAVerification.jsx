import { useState, useEffect } from 'react'
import { verifyMFA, getMFADevices } from '../../services/mfaService'

export default function MFAVerification({ onVerified, onCancel }) {
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const result = await getMFADevices()
      if (result.success) {
        const verifiedDevices = (result.data || []).filter(d => d.is_verified)
        setDevices(verifiedDevices)
        if (verifiedDevices.length > 0) {
          const primary = verifiedDevices.find(d => d.is_primary) || verifiedDevices[0]
          setSelectedDevice(primary)
        }
      }
    } catch (error) {
      console.error('Error fetching MFA devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    try {
      setVerifying(true)

      const result = await verifyMFA(verificationCode, selectedDevice?.id)
      
      if (result.success) {
        onVerified && onVerified()
      } else {
        alert(result.message || 'Verification failed. Please try again.')
        setVerificationCode('')
      }
    } catch (error) {
      console.error('Error verifying MFA:', error)
      alert('Verification failed. Please try again.')
      setVerificationCode('')
    } finally {
      setVerifying(false)
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Multi-Factor Authentication
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enter the verification code from your {selectedDevice?.device_type === 'totp' ? 'authenticator app' : selectedDevice?.device_type === 'sms' ? 'phone' : 'email'} to continue
      </p>

      {devices.length > 1 && !useBackupCode && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Device
          </label>
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const device = devices.find(d => d.id === e.target.value)
              setSelectedDevice(device)
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.device_name} {device.is_primary ? '(Primary)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {!useBackupCode && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength="6"
              autoFocus
            />
          </div>

          <button
            onClick={() => setUseBackupCode(true)}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Use backup code instead
          </button>
        </>
      )}

      {useBackupCode && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center font-mono"
              placeholder="XXXX-XXXX"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter one of your backup codes. Each code can only be used once.
            </p>
          </div>

          <button
            onClick={() => {
              setUseBackupCode(false)
              setVerificationCode('')
            }}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Use verification code instead
          </button>
        </>
      )}

      <div className="flex gap-2 pt-4">
        <button
          onClick={handleVerify}
          disabled={verifying || !verificationCode}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Verify'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

