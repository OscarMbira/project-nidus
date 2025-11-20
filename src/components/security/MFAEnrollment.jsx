import { useState } from 'react'
import { enrollMFA, verifyMFADevice } from '../../services/mfaService'

export default function MFAEnrollment({ onComplete, onCancel }) {
  const [step, setStep] = useState(1) // 1: Select type, 2: Configure, 3: Verify
  const [deviceType, setDeviceType] = useState('totp')
  const [deviceName, setDeviceName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [device, setDevice] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])

  const handleEnroll = async () => {
    try {
      setEnrolling(true)

      const deviceInfo = {
        device_name: deviceName || `${deviceType.toUpperCase()} Device`,
        phone_number: deviceType === 'sms' ? phoneNumber : undefined,
        email_address: deviceType === 'email' ? emailAddress : undefined
      }

      const result = await enrollMFA(deviceType, deviceInfo)
      
      if (result.success) {
        setDevice(result.data)
        if (deviceType === 'totp') {
          setStep(3) // Go directly to verification for TOTP
        } else {
          setStep(2) // Show verification code input for SMS/Email
        }
      } else {
        alert(result.message || 'Failed to enroll device')
      }
    } catch (error) {
      console.error('Error enrolling MFA:', error)
      alert('Failed to enroll MFA device')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    try {
      setVerifying(true)

      const result = await verifyMFADevice(device.id, verificationCode)
      
      if (result.success) {
        if (result.backup_codes) {
          setBackupCodes(result.backup_codes)
          setStep(4) // Show backup codes
        } else {
          onComplete && onComplete(device)
        }
      } else {
        alert(result.message || 'Verification failed')
      }
    } catch (error) {
      console.error('Error verifying device:', error)
      alert('Failed to verify device')
    } finally {
      setVerifying(false)
    }
  }

  if (step === 1) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Enroll MFA Device
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Device Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  value="totp"
                  checked={deviceType === 'totp'}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Authenticator App (TOTP)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Use apps like Google Authenticator, Authy, or Microsoft Authenticator</p>
                </div>
              </label>
              <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  value="sms"
                  checked={deviceType === 'sms'}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">SMS</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive verification codes via text message</p>
                </div>
              </label>
              <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  value="email"
                  checked={deviceType === 'email'}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive verification codes via email</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., My iPhone"
            />
          </div>

          {deviceType === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="+1234567890"
              />
            </div>
          )}

          {deviceType === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleEnroll}
              disabled={enrolling || !deviceName}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Continue'}
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
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Verify Device
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deviceType === 'sms' 
              ? 'A verification code has been sent to your phone. Enter it below:'
              : 'A verification code has been sent to your email. Enter it below:'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength="6"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleVerify}
              disabled={verifying || verificationCode.length !== 6}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Scan QR Code
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Scan this QR code with your authenticator app, then enter the verification code:
          </p>

          {device?.totp_uri && (
            <div className="flex justify-center mb-4">
              {/* QR Code would be rendered here using a library like qrcode.react */}
              <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  QR Code (Install qrcode.react library)
                </p>
              </div>
            </div>
          )}

          {device?.totp_secret && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Or enter this secret manually:
              </p>
              <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {device.totp_secret}
              </code>
            </div>
          )}

          <div>
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
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleVerify}
              disabled={verifying || verificationCode.length !== 6}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify & Complete'}
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 4 && backupCodes.length > 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Backup Codes
        </h2>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Important: Save these backup codes in a safe place!
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              You can use these codes to access your account if you lose your MFA device. Each code can only be used once.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {backupCodes.map((code, index) => (
              <code
                key={index}
                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm font-mono text-center"
              >
                {code}
              </code>
            ))}
          </div>

          <div className="flex gap-2">
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Download Codes
            </button>
            <button
              onClick={() => onComplete && onComplete(device)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              I've Saved These
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

