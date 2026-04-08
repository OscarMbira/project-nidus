import { FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function BoardPresentationSummary({ report, options = [], qualityStatus = null }) {
  if (!report) return null

  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-green-600 dark:text-green-400'
    }
  }

  const recommendedOption = options.find(opt => opt.is_recommended)

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Board Presentation Summary
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Executive summary for Project Board presentation
        </p>
      </div>

      {/* Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Exception</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{report.exception_title || 'N/A'}</p>
          <p className={`text-sm font-medium mt-1 ${getUrgencyColor(report.urgency)}`}>
            Urgency: {(report.urgency || 'medium').toUpperCase()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            {report.time_variance_days !== null && report.time_variance_days >= 0 ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white">Time Impact</h4>
          </div>
          {report.time_variance_days !== null ? (
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {report.time_variance_days > 0 ? '+' : ''}{report.time_variance_days} days
            </p>
          ) : (
            <p className="text-sm text-gray-500">Not specified</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            {report.cost_variance_amount !== null && report.cost_variance_amount >= 0 ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white">Cost Impact</h4>
          </div>
          {report.cost_variance_amount !== null ? (
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {report.cost_variance_amount >= 0 ? '+' : ''}{formatCurrency(report.cost_variance_amount)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Not specified</p>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Executive Summary</h4>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Document:</strong> {report.document_ref || 'N/A'} v{report.version_no || '1.0'}
          </div>
          <div>
            <strong>Report Date:</strong> {report.report_date ? format(new Date(report.report_date), 'MMM dd, yyyy') : 'N/A'}
          </div>
          {report.exception_summary && (
            <div>
              <strong>Summary:</strong>
              <p className="ml-4 mt-1 text-gray-600 dark:text-gray-400">{report.exception_summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      {recommendedOption && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-green-900 dark:text-green-100">Recommended Option</h4>
          </div>
          <h5 className="font-bold text-green-900 dark:text-green-100 mb-2">
            Option {recommendedOption.option_number}: {recommendedOption.option_title}
          </h5>
          {recommendedOption.option_description && (
            <p className="text-sm text-green-800 dark:text-green-200 mb-2">
              {recommendedOption.option_description}
            </p>
          )}
          {report.recommendation_summary && (
            <div className="mt-3 pt-3 border-t border-green-300 dark:border-green-700">
              <strong className="text-green-900 dark:text-green-100">Recommendation:</strong>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                {report.recommendation_summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quality Status */}
      {qualityStatus && (
        <div className={`rounded-lg p-4 border ${
          qualityStatus.can_submit
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {qualityStatus.can_submit ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <h4 className="font-semibold">
              Quality Check Status
            </h4>
          </div>
          <p className="text-sm">
            {qualityStatus.passed || 0} of {qualityStatus.total_criteria || 0} criteria passed
            {qualityStatus.failed > 0 && ` - ${qualityStatus.failed} blocking issue(s)`}
          </p>
        </div>
      )}

      {/* Requested Decision */}
      {report.requested_decision && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Requested Decision</h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
            {report.requested_decision}
          </p>
        </div>
      )}

      {/* Options Summary */}
      {options.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Options Summary</h4>
          <div className="space-y-3">
            {options.map((option) => (
              <div key={option.id} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4">
                <div className="flex items-center gap-2">
                  <strong className="text-gray-900 dark:text-white">
                    Option {option.option_number}: {option.option_title}
                  </strong>
                  {option.is_recommended && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                {option.risk_level && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Risk Level: {option.risk_level.toUpperCase()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
