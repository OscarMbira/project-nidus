/**
 * Tools & Techniques Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getTools } from '../../services/rmsToolsTechniquesService'

export default function ToolsSection({ rmsId, readOnly = false }) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadTools()
    }
  }, [rmsId])

  const loadTools = async () => {
    try {
      setLoading(true)
      const result = await getTools(rmsId)
      if (result.success) {
        setTools(result.data || [])
      }
    } catch (error) {
      console.error('Error loading tools:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Tools & Techniques
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Tools and techniques for risk management
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading tools...</div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No tools defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tools.map((tool) => (
            <div key={tool.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{tool.tool_name}</h4>
              {tool.tool_description && <p className="text-gray-700 dark:text-gray-300">{tool.tool_description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
