import { useState } from 'react'
import { requestDataExport } from '../../services/gdprService'
import { Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function DataExportRequest({ onRequestCreated }) {
  const [format, setFormat] = useState('json')
  const [requesting, setRequesting] = useState(false)
  const [lastRequest, setLastRequest] = useState(null)

  const handleRequest = async () => {
    try {
      setRequesting(true)
      const result = await requestDataExport(format)

      if (result.success) {
        setLastRequest(result.data)
        alert('Data export request submitted successfully. You will be notified when it\'s ready.')
        onRequestCreated && onRequestCreated(result.data)
      } else {
        alert(result.message || 'Failed to submit export request')
      }
    } catch (error) {
      console.error('Error requesting data export:', error)
      alert('Failed to submit export request')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Request Data Export
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Right to Data Portability (GDPR Article 20)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                About Data Export
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You have the right to receive a copy of your personal data in a structured, commonly used, and machine-readable format. 
                Once your request is processed, you'll receive a download link via email.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                value="json"
                checked={format === 'json'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-3"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">JSON</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Machine-readable format, best for importing into other services
                </p>
              </div>
            </label>
            <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-3"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">CSV</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Spreadsheet-compatible format, best for viewing in Excel or Google Sheets
                </p>
              </div>
            </label>
            <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-3"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">PDF</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Human-readable format, best for printing or archiving
                </p>
              </div>
            </label>
          </div>
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
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
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
                  {lastRequest.request_status === 'rejected' && lastRequest.rejection_reason && (
                    <span className="block mt-1">Reason: {lastRequest.rejection_reason}</span>
                  )}
                </p>
                {lastRequest.request_status === 'completed' && lastRequest.export_file_path && (
                  <button
                    onClick={() => window.open(lastRequest.export_file_path, '_blank')}
                    className="mt-2 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
                  >
                    Download Export
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleRequest}
          disabled={requesting}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          {requesting ? 'Submitting Request...' : 'Request Data Export'}
        </button>
      </div>
    </div>
  )
}

