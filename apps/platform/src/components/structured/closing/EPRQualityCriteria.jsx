import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { getQualityChecks, updateQualityCheck, runQualityChecks, getQualityCheckStatus } from '../../../services/eprQualityCheckService'

export default function EPRQualityCriteria({ reportId, qualityStatus, onStatusChange, mode }) {
  const [qualityChecks, setQualityChecks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) {
      loadQualityChecks()
    }
  }, [reportId])

  const loadQualityChecks = async () => {
    try {
      setLoading(true)
      const checks = await getQualityChecks(reportId)
      setQualityChecks(checks)
    } catch (error) {
      console.error('Error loading quality checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (checkId, newStatus, overrideReason = null) => {
    try {
      await updateQualityCheck(checkId, {
        validation_status: newStatus,
        override_reason: overrideReason
      })
      await loadQualityChecks()
      if (onStatusChange) {
        const status = await getQualityCheckStatus(reportId)
        onStatusChange(status)
      }
    } catch (error) {
      console.error('Error updating quality check:', error)
      alert('Error updating quality check: ' + error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'needs_review':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'manual_override':
        return <AlertCircle className="h-5 w-5 text-purple-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'needs_review':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'manual_override':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading quality checks...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quality Criteria Validation</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Four quality criteria that must be met before the project can be formally closed.
        </p>
      </div>

      {qualityStatus && (
        <div className={`border rounded-lg p-4 ${
          qualityStatus.can_close_project
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Quality Check Summary
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {qualityStatus.passed} passed, {qualityStatus.failed} failed, {qualityStatus.needs_review} need review, {qualityStatus.not_checked} not checked
              </p>
            </div>
            <div className="text-right">
              {qualityStatus.can_close_project ? (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-semibold">
                  Can Close Project
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg font-semibold">
                  Cannot Close Project
                </span>
              )}
            </div>
          </div>
          {qualityStatus.blocking_issues && qualityStatus.blocking_issues.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Blocking Issues:</p>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {qualityStatus.blocking_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {qualityChecks.map((check) => (
          <div
            key={check.id}
            className={`border rounded-lg p-4 ${
              check.validation_status === 'passed'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : check.validation_status === 'failed'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(check.validation_status)}
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Criterion {check.criterion_number}: {check.criterion_name}
                  </h4>
                  {check.is_blocking && (
                    <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                      Blocking
                    </span>
                  )}
                  {check.is_automated && (
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Automated
                    </span>
                  )}
                </div>
                {check.criterion_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {check.criterion_description}
                  </p>
                )}
                {check.automated_check_result && (
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 mb-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {check.automated_check_result.message || JSON.stringify(check.automated_check_result)}
                    </p>
                  </div>
                )}
                {check.manual_check_comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Comment:</strong> {check.manual_check_comment}
                  </p>
                )}
                {check.override_reason && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                    <strong>Override Reason:</strong> {check.override_reason}
                  </p>
                )}
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(check.validation_status)}`}>
                    {check.validation_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {mode !== 'view' && check.validation_status !== 'passed' && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(check.id, 'passed')}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Mark Passed
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter override reason:')
                      if (reason) {
                        handleStatusChange(check.id, 'manual_override', reason)
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                  >
                    Manual Override
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
