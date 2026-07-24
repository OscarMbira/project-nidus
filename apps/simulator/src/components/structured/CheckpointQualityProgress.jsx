import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

export default function CheckpointQualityProgress({ qualityStatus }) {
  if (!qualityStatus) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No quality status available
      </div>
    )
  }

  const total = qualityStatus.total_criteria || 0
  const passed = qualityStatus.passed || 0
  const failed = qualityStatus.failed || 0
  const needsReview = qualityStatus.needs_review || 0
  const notChecked = qualityStatus.not_checked || 0
  const completion = qualityStatus.completion_percentage || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-white">Quality Check Progress</h4>
        <span className={`px-3 py-1 rounded-lg font-semibold ${
          qualityStatus.can_submit
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {completion.toFixed(0)}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div className="h-full flex">
          {passed > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(passed / total) * 100}%` }}
              title={`${passed} passed`}
            />
          )}
          {failed > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(failed / total) * 100}%` }}
              title={`${failed} failed`}
            />
          )}
          {needsReview > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(needsReview / total) * 100}%` }}
              title={`${needsReview} need review`}
            />
          )}
          {notChecked > 0 && (
            <div
              className="bg-gray-400"
              style={{ width: `${(notChecked / total) * 100}%` }}
              title={`${notChecked} not checked`}
            />
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Passed:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{passed}</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Failed:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{failed}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">Review:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{needsReview}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Pending:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{notChecked}</span>
        </div>
      </div>

      {qualityStatus.blocking_issues && qualityStatus.blocking_issues.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Blocking Issues:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
            {qualityStatus.blocking_issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
