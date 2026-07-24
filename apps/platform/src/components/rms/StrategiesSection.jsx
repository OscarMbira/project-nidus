/**
 * Response Strategies Section Component
 * Simplified version - full implementation can be added later
 */

import { useState, useEffect } from 'react'
import { getStrategies } from '../../services/rmsResponseStrategiesService'

export default function StrategiesSection({ rmsId, readOnly = false }) {
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadStrategies()
    }
  }, [rmsId])

  const loadStrategies = async () => {
    try {
      setLoading(true)
      const result = await getStrategies(rmsId)
      if (result.success) {
        setStrategies(result.data || [])
      }
    } catch (error) {
      console.error('Error loading strategies:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Risk Response Strategies
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Define strategies for responding to risks (avoid, reduce, transfer, accept, exploit, enhance)
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading strategies...</div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No response strategies defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{strategy.strategy_name}</h4>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs uppercase">
                  {strategy.strategy_type}
                </span>
              </div>
              {strategy.strategy_description && <p className="text-gray-700 dark:text-gray-300">{strategy.strategy_description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
