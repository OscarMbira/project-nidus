/**
 * Brief Completion Progress Component
 * Shows section completion indicator
 */

import { useState, useEffect } from 'react'
import { validateCompleteness } from '../../services/briefValidationService'

export default function BriefCompletionProgress({ briefId }) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (briefId) {
      loadProgress()
    }
  }, [briefId])

  const loadProgress = async () => {
    try {
      setLoading(true)
      const data = await validateCompleteness(briefId)
      setProgress(data)
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !progress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading progress...</div>
      </div>
    )
  }

  const sections = [
    { key: 'project_definition', label: 'Project Definition' },
    { key: 'outline_business_case', label: 'Business Case' },
    { key: 'product_description', label: 'Product Description' },
    { key: 'project_approach', label: 'Project Approach' },
    { key: 'team_structure', label: 'Team Structure' },
    { key: 'role_descriptions', label: 'Role Descriptions' },
    { key: 'references', label: 'References' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Completion Progress
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {progress.completion_percentage}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {progress.total_completed} of {progress.total_required} sections
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress.completion_percentage}%` }}
        />
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const sectionData = progress.sections[section.key]
          const isComplete = sectionData.completed === sectionData.total
          return (
            <div
              key={section.key}
              className={`p-3 rounded-lg border ${
                isComplete
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {section.label}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {sectionData.completed}/{sectionData.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    isComplete ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${(sectionData.completed / sectionData.total) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {progress.is_complete && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ✓ All sections complete! Ready for submission.
          </p>
        </div>
      )}
    </div>
  )
}
