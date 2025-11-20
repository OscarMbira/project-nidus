import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MFAEnrollment from '../../components/security/MFAEnrollment'
import { CheckCircle } from 'lucide-react'

export default function MFASetup() {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState(false)
  const [enrolledDevice, setEnrolledDevice] = useState(null)

  const handleComplete = (device) => {
    setEnrolledDevice(device)
    setCompleted(true)
  }

  const handleFinish = () => {
    navigate('/settings/security')
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            MFA Setup Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your {enrolledDevice?.device_name} has been successfully enrolled and verified.
          </p>
          <button
            onClick={handleFinish}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue to Security Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Multi-Factor Authentication Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add an extra layer of security to your account by enabling MFA
        </p>
      </div>

      <MFAEnrollment
        onComplete={handleComplete}
        onCancel={() => navigate('/settings/security')}
      />
    </div>
  )
}

