/**
 * MandateCompletionProgress Component
 * Shows completion progress for mandate sections (12 sections total)
 * Works for both Platform and Simulator
 */

import { CheckCircle, Circle, AlertCircle } from 'lucide-react'

export default function MandateCompletionProgress({ progress, isPractice = false }) {
  if (!progress) return null

  const { percentage, completed, total, sections } = progress

  const getSectionStatus = (sectionName) => {
    return sections?.[sectionName] ? 'completed' : 'incomplete'
  }

  const sectionLabels = {
    purpose: '1. Purpose',
    authority: '2. Authority Responsible',
    background: '3. Background',
    objectives: '4. Project Objectives',
    scope: '5. Scope (Deliverables)',
    constraints: '6. Constraints',
    interfaces: '7. Interfaces',
    quality: '8. Quality Expectations',
    businessCase: '9. Outline Business Case',
    roles: '11. Proposed Roles',
    stakeholders: '12. Customers & Users',
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-600'
    if (percentage >= 70) return 'bg-yellow-600'
    if (percentage >= 50) return 'bg-orange-600'
    return 'bg-red-600'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isPractice ? 'Learning Progress' : 'Completion Progress'}
        </h3>
        <span className={`text-2xl font-bold ${getProgressColor(percentage).replace('bg-', 'text-')}`}>
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
        <div
          className={`${getProgressColor(percentage)} h-3 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {completed} of {total} sections completed
      </p>

      {/* Section Checklist */}
      <div className="space-y-2">
        {Object.entries(sectionLabels).map(([key, label]) => {
          const status = getSectionStatus(key)
          const isCompleted = status === 'completed'
          
          return (
            <div key={key} className="flex items-center space-x-2 text-sm">
              {isCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
              <span className={isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {percentage < 100 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Complete all sections before submitting for review.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
