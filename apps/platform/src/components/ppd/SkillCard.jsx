/**
 * Skill Card Component
 * Displays a single skill item
 */

import { Edit2, Trash2, Users, Star } from 'lucide-react'

const SKILL_CATEGORY_COLORS = {
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  management: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  domain: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  soft_skills: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  certification: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const PROFICIENCY_LABELS = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert'
}

export default function SkillCard({ skill, mode = 'view', onEdit, onDelete }) {
  const categoryColor = SKILL_CATEGORY_COLORS[skill.skill_category] || SKILL_CATEGORY_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {skill.skill_name}
            </h4>
            {skill.is_critical && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Critical
              </span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColor}`}>
              {skill.skill_category?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              {PROFICIENCY_LABELS[skill.proficiency_level] || skill.proficiency_level}
            </span>
          </div>

          {skill.skill_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {skill.skill_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {skill.required_for && (
              <span>Required for: {skill.required_for}</span>
            )}
            {skill.resource_area && (
              <span>Resource area: {skill.resource_area}</span>
            )}
          </div>
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit skill"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
