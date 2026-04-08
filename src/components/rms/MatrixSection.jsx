/**
 * Risk Matrix Section Component
 * Matrix list management (simplified - full implementation can be added later)
 */

import { useState, useEffect } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { getMatrices } from '../../services/rmsRiskMatrixService'

export default function MatrixSection({ rmsId, readOnly = false }) {
  const [matrices, setMatrices] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadMatrices()
    }
  }, [rmsId])

  const loadMatrices = async () => {
    try {
      setLoading(true)
      const result = await getMatrices(rmsId)
      if (result.success) {
        setMatrices(result.data || [])
      }
    } catch (error) {
      console.error('Error loading matrices:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!rmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the RMS first before adding matrices
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Risk Matrix Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define risk matrices for assessing risk levels based on probability and impact
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => alert('Matrix form component to be implemented')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Matrix
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading matrices...</div>
      ) : matrices.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No risk matrices defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matrices.map((matrix) => (
            <div
              key={matrix.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {matrix.matrix_name}
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {matrix.matrix_type?.replace('_', ' ')}
                    </span>
                    {matrix.is_default && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                        Default
                      </span>
                    )}
                  </div>
                  {matrix.matrix_description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{matrix.matrix_description}</p>
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
