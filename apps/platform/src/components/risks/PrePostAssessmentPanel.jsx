/**
 * Pre-Post Assessment Panel Component
 * Side-by-side comparison of pre-response and post-response assessments
 */

import { Target, TrendingDown } from 'lucide-react'
import RiskScoreBadge from './RiskScoreBadge'

export default function PrePostAssessmentPanel({ risk }) {
  const preScore = risk.pre_expected_value || (risk.pre_probability && risk.pre_impact ? risk.pre_probability * risk.pre_impact : null)
  const postScore = risk.post_expected_value || (risk.post_probability && risk.post_impact ? risk.post_probability * risk.post_impact : null)
  const reduction = preScore && postScore ? preScore - postScore : null
  const reductionPercent = preScore && postScore && preScore > 0 ? ((reduction / preScore) * 100).toFixed(0) : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pre-Response Assessment */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pre-Response Assessment (Inherent Risk)
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Probability</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {risk.pre_probability || 'N/A'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/5</span>
              </div>
              {risk.pre_probability_rationale && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                  {risk.pre_probability_rationale}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Impact</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {risk.pre_impact || 'N/A'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/5</span>
              </div>
              {risk.pre_impact_rationale && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                  {risk.pre_impact_rationale}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Value:</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{preScore || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level:</span>
              <RiskScoreBadge score={risk.pre_risk_score} expectedValue={preScore} />
            </div>
          </div>

          {(risk.pre_cost_impact || risk.pre_schedule_impact_days) && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {risk.pre_cost_impact && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cost Impact:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${parseFloat(risk.pre_cost_impact).toLocaleString()}
                  </span>
                </div>
              )}
              {risk.pre_schedule_impact_days && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Schedule Impact:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {risk.pre_schedule_impact_days} days
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post-Response Assessment */}
      <div className={`rounded-lg border-2 p-6 ${
        postScore ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className={`h-5 w-5 ${postScore ? 'text-green-600' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Post-Response Assessment (Residual Risk)
          </h3>
        </div>
        
        {postScore ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Probability</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {risk.post_probability || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/5</span>
                </div>
                {risk.post_probability_rationale && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                    {risk.post_probability_rationale}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Impact</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {risk.post_impact || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/5</span>
                </div>
                {risk.post_impact_rationale && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                    {risk.post_impact_rationale}
                  </p>
                )}
              </div>
            </div>

            {reduction !== null && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Risk Reduction:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    -{reduction} ({reductionPercent}%)
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Value:</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{postScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level:</span>
                <RiskScoreBadge score={risk.post_risk_score} expectedValue={postScore} />
              </div>
            </div>

            {(risk.post_cost_impact || risk.post_schedule_impact_days) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {risk.post_cost_impact && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cost Impact:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${parseFloat(risk.post_cost_impact).toLocaleString()}
                    </span>
                  </div>
                )}
                {risk.post_schedule_impact_days && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Schedule Impact:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {risk.post_schedule_impact_days} days
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Post-response assessment not yet completed
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Complete response actions and update assessment to see residual risk
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
