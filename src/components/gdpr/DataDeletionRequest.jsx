import { useState } from 'react'
import { requestDataDeletion } from '../../services/gdprService'
import { Trash2, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function DataDeletionRequest({ onRequestCreated }) {
  const [reason, setReason] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lastRequest, setLastRequest] = useState(null)

  const handleRequest = async () => {
    if (!confirmDelete) {
      alert('Please confirm that you understand the implications of deleting your account')
      return
    }

    try {
      setRequesting(true)
      const result = await requestDataDeletion(reason || 'User requested account deletion')

      if (result.success) {
        setLastRequest(result.data)
        alert('Data deletion request submitted successfully. Your account will be deleted within 30 days as required by GDPR.')
        onRequestCreated && onRequestCreated(result.data)
      } else {
        alert(result.message || 'Failed to submit deletion request')
      }
    } catch (error) {
      console.error('Error requesting data deletion:', error)
      alert('Failed to submit deletion request')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
          <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Request Data Deletion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Right to be Forgotten (GDPR Article 17)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>All your personal data will be permanently deleted</li>
                <li>Your account and all associated content will be removed</li>
                <li>You will no longer be able to access your account</li>
                <li>Some data may be retained for legal or regulatory requirements</li>
                <li>Data deletion will be completed within 30 days as required by GDPR</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Deletion (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            rows="3"
            placeholder="Please let us know why you're deleting your account (optional)"
          />
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                I understand and confirm
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                I understand that all my personal data will be permanently deleted and this action cannot be undone. 
                I confirm that I want to proceed with the deletion of my account and all associated data.
              </p>
            </div>
          </label>
        </div>

        {lastRequest && (
          <div className={`p-4 rounded-lg border ${
            lastRequest.request_status === 'completed'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : lastRequest.request_status === 'rejected'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
          }`}>
            <div className="flex items-start gap-3">
              {lastRequest.request_status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : lastRequest.request_status === 'rejected' ? (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium mb-1 ${
                  lastRequest.request_status === 'completed'
                    ? 'text-green-800 dark:text-green-200'
                    : lastRequest.request_status === 'rejected'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  Request Status: {lastRequest.request_status}
                </p>
                <p className={`text-xs ${
                  lastRequest.request_status === 'completed'
                    ? 'text-green-700 dark:text-green-300'
                    : lastRequest.request_status === 'rejected'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  Requested: {new Date(lastRequest.requested_at).toLocaleString()}
                  {lastRequest.scheduled_deletion_date && (
                    <span className="block mt-1">
                      Scheduled deletion: {new Date(lastRequest.scheduled_deletion_date).toLocaleDateString()}
                    </span>
                  )}
                  {lastRequest.request_status === 'rejected' && lastRequest.retention_exceptions && (
                    <span className="block mt-1">Reason: {lastRequest.retention_exceptions}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleRequest}
          disabled={requesting || !confirmDelete}
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {requesting ? 'Submitting Request...' : 'Request Account Deletion'}
        </button>
      </div>
    </div>
  )
}

