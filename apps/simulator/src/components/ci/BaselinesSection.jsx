/**
 * Baselines Section Component
 * Displays baselines for a project
 */

import { useState, useEffect } from 'react'
import { Layers, Plus } from 'lucide-react'
import { getBaselinesByProject } from '../../services/configurationBaselineService'
import BaselineCard from './BaselineCard'

export default function BaselinesSection({ projectId, onCreate }) {
  const [baselines, setBaselines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchBaselines()
    }
  }, [projectId])

  const fetchBaselines = async () => {
    try {
      setLoading(true)
      const data = await getBaselinesByProject(projectId)
      setBaselines(data || [])
    } catch (error) {
      console.error('Error fetching baselines:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Baselines
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {baselines.length} baseline{baselines.length !== 1 ? 's' : ''}
          </span>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Baseline
            </button>
          )}
        </div>
      </div>

      {baselines.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No baselines yet</p>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Create First Baseline
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {baselines.map((baseline) => (
            <BaselineCard key={baseline.id} baseline={baseline} />
          ))}
        </div>
      )}
    </div>
  )
}
