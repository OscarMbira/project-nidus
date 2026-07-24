/**
 * Risk Assessment History Component
 * Display assessment history for a risk
 */

import { Calendar, User, TrendingDown, TrendingUp } from 'lucide-react'

export default function RiskAssessmentHistory({ assessments }) {
  if (!assessments || assessments.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No assessment history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Assessment History
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track changes in risk assessment over time
        </p>
      </div>

      <div className="space-y-3">
        {assessments.map((assessment, index) => {
          const expectedValue = assessment.expected_value || (assessment.probability * assessment.impact)
          const isLatest = index === 0
          
          return (
            <div
              key={assessment.id || index}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
                isLatest ? 'border-blue-300 dark:border-blue-700 border-2' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isLatest && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        Latest
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs capitalize">
                      {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                    </span>
                    {index > 0 && assessments[index - 1] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Change: {expectedValue - (assessments[index - 1].expected_value || (assessments[index - 1].probability * assessments[index - 1].impact))} 
                        {expectedValue > (assessments[index - 1].expected_value || 0) ? (
                          <TrendingUp className="h-3 w-3 inline text-red-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 inline text-green-500" />
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block">Probability</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assessment.probability}/5
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block">Impact</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assessment.impact}/5
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block">Expected Value</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {expectedValue}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block">Risk Level</label>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assessment.risk_score?.includes('very_high') || assessment.risk_score?.includes('critical') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        assessment.risk_score?.includes('high') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        assessment.risk_score?.includes('medium') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {(assessment.risk_score || '').replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {assessment.notes && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                      {assessment.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                {assessment.assessed_by?.full_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{assessment.assessed_by.full_name}</span>
                  </div>
                )}
                {assessment.assessment_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(assessment.assessment_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
