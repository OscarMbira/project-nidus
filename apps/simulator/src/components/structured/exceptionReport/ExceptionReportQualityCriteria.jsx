import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { getQualityChecks, updateQualityCheck, runAndUpdateQualityChecks } from '../../../services/exceptionReportQualityService'

export default function ExceptionReportQualityCriteria({ reportId, onStatusChange, mode }) {
  const [qualityChecks, setQualityChecks] = useState([])
  const [qualityStatus, setQualityStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (reportId) {
      loadQualityChecks()
    }
  }, [reportId])

  const loadQualityChecks = async () => {
    if (!reportId) return
    try {
      setLoading(true)
      const checks = await getQualityChecks(reportId)
      setQualityChecks(checks || [])
    } catch (error) {
      console.error('Error loading quality checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunChecks = async () => {
    if (!reportId) return
    try {
      setRunning(true)
      await runAndUpdateQualityChecks(reportId)
      await loadQualityChecks()
      if (onStatusChange) {
        const { getQualityCheckStatus } = await import('../../../services/exceptionReportQualityService')
        const status = await getQualityCheckStatus(reportId)
        setQualityStatus(status)
        onStatusChange(status)
      }
    } catch (error) {
      console.error('Error running quality checks:', error)
      alert('Error running quality checks: ' + error.message)
    } finally {
      setRunning(false)
    }
  }

  const handleStatusChange = async (checkId, newStatus, overrideReason = null) => {
    if (!reportId) return
    try {
      await updateQualityCheck(checkId, {
        validation_status: newStatus,
        override_reason: overrideReason
      })
      await loadQualityChecks()
      if (onStatusChange) {
        const { getQualityCheckStatus } = await import('../../../services/exceptionReportQualityService')
        const status = await getQualityCheckStatus(reportId)
        setQualityStatus(status)
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

  const passedCount = qualityChecks.filter(c => c.validation_status === 'passed').length
  const totalCount = qualityChecks.length
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
  const blockingCount = qualityChecks.filter(c => c.is_blocking && c.validation_status !== 'passed').length

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quality Criteria Validation</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Five quality criteria that must be met before submitting the exception report for approval.
            </p>
          </div>
          {mode !== 'view' && reportId && (
            <button
              onClick={handleRunChecks}
              disabled={running}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Running...' : 'Run Checks'}</span>
            </button>
          )}
        </div>
      </div>

      {qualityStatus && (
        <div className={`border rounded-lg p-4 ${
          qualityStatus.can_submit
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Quality Check Summary
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {passedCount} of {totalCount} criteria passed ({passRate}%)
                {blockingCount > 0 && ` - ${blockingCount} blocking issue(s)`}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              qualityStatus.can_submit
                ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
            }`}>
              {qualityStatus.can_submit ? 'Ready to Submit' : 'Not Ready'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {qualityChecks.map((check) => (
          <div
            key={check.id}
            className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${
              check.validation_status === 'passed'
                ? 'border-green-200 dark:border-green-800'
                : check.validation_status === 'failed'
                ? 'border-red-200 dark:border-red-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(check.validation_status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {check.criterion_number}. {check.criterion_name}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.validation_status)}`}>
                    {check.validation_status?.replace('_', ' ').toUpperCase() || 'NOT CHECKED'}
                  </span>
                  {check.is_blocking && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                      Blocking
                    </span>
                  )}
                </div>
                {check.criterion_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {check.criterion_description}
                  </p>
                )}
                {check.automated_check_result && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {JSON.stringify(check.automated_check_result, null, 2)}
                    </pre>
                  </div>
                )}
                {check.manual_check_comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <strong>Comment:</strong> {check.manual_check_comment}
                  </p>
                )}
                {check.override_reason && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    <strong>Override Reason:</strong> {check.override_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
