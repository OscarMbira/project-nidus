/**
 * Skill Card Component
 */

import { Users, Edit, Trash2, AlertCircle } from 'lucide-react'

const PROFICIENCY_COLORS = {
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  advanced: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  expert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

export default function SkillCard({ skill, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {skill.skill_name}
            </h4>
            {skill.is_critical && (
              <span className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Critical
              </span>
            )}
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {skill.skill_category?.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${PROFICIENCY_COLORS[skill.proficiency_level] || PROFICIENCY_COLORS.intermediate}`}>
              {skill.proficiency_level}
            </span>
          </div>
          {skill.skill_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {skill.skill_description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {skill.required_for && (
              <span>Required for: {skill.required_for}</span>
            )}
            {skill.resource_area && (
              <span>Area: {skill.resource_area}</span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit skill"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete skill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
