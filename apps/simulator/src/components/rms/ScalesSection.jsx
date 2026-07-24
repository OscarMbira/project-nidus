/**
 * Assessment Scales Section Component
 * Scales list management (simplified - full implementation can be added later)
 */

import { useState, useEffect } from 'react'
import { Plus, BarChart3 } from 'lucide-react'
import { getScales } from '../../services/rmsAssessmentScalesService'

export default function ScalesSection({ rmsId, readOnly = false }) {
  const [scales, setScales] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadScales()
    }
  }, [rmsId])

  const loadScales = async () => {
    try {
      setLoading(true)
      const result = await getScales(rmsId)
      if (result.success) {
        setScales(result.data || [])
      }
    } catch (error) {
      console.error('Error loading scales:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!rmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the RMS first before adding scales
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Assessment Scales
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define probability, impact, and proximity scales for risk assessment
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => alert('Scale form component to be implemented')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Scale
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading scales...</div>
      ) : scales.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No assessment scales defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scales.map((scale) => (
            <div
              key={scale.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {scale.scale_name}
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs uppercase">
                      {scale.scale_type}
                    </span>
                    {scale.is_default && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                        Default
                      </span>
                    )}
                  </div>
                  {scale.scale_description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{scale.scale_description}</p>
                  )}
                  {scale.scale_config && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Configuration</p>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                        {JSON.stringify(scale.scale_config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
