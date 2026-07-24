/**
 * Plan Variance Analysis Component
 */

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { calculateVariance } from '../../services/stagePlanService'

export default function PlanVarianceAnalysis({ planId }) {
  const [variance, setVariance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (planId) {
      loadVariance()
    }
  }, [planId])

  const loadVariance = async () => {
    try {
      setLoading(true)
      const result = await calculateVariance(planId)
      if (result.success) {
        setVariance(result.data || [])
      }
    } catch (error) {
      console.error('Error loading variance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading variance analysis...</div>
  }

  if (!variance || variance.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Variance analysis is only available for completed stages with actual dates.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Variance Analysis (Planned vs Actual)
      </h3>
      {variance.map((item, index) => {
        const isPositive = parseFloat(item.variance) > 0
        const isNegative = parseFloat(item.variance) < 0
        const variancePercent = parseFloat(item.variance_percentage || 0)

        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {item.metric_name}
              </h4>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : isNegative ? (
                <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Minus className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Planned</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {parseFloat(item.planned_value || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Actual</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {parseFloat(item.actual_value || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Variance</p>
                <p
                  className={`font-medium ${
                    isPositive
                      ? 'text-red-600 dark:text-red-400'
                      : isNegative
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {parseFloat(item.variance || 0).toLocaleString()} ({variancePercent >= 0 ? '+' : ''}
                  {variancePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
