/**
 * Tool Card Component
 * Individual tool/technology display card
 */

import { Edit2, Trash2, Settings, ExternalLink } from 'lucide-react'

export default function ToolCard({ tool, onEdit, onDelete, readOnly = false }) {
  const toolTypeLabels = {
    software: 'Software',
    platform: 'Platform',
    hardware: 'Hardware',
    template: 'Template',
    framework: 'Framework',
    other: 'Other'
  }

  const proficiencyLabels = {
    none: 'None',
    basic: 'Basic',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tool.tool_name}
            </h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {toolTypeLabels[tool.tool_type] || tool.tool_type}
            </span>
            {tool.license_required && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                License Required
              </span>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{tool.tool_description}</p>

          {tool.tool_purpose && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Purpose</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{tool.tool_purpose}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {tool.applicable_to && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Applicable To</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tool.applicable_to}</p>
              </div>
            )}

            {tool.proficiency_required && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Proficiency Required</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {proficiencyLabels[tool.proficiency_required] || tool.proficiency_required}
                </p>
              </div>
            )}
          </div>

          {(tool.cost || tool.external_link) && (
            <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              {tool.cost && (
                <span>
                  <strong>Cost:</strong> ${tool.cost}
                </span>
              )}
              {tool.external_link && (
                <a
                  href={tool.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Tool
                </a>
              )}
            </div>
          )}

          {tool.license_info && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>License Info:</strong> {tool.license_info}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(tool)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit tool"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(tool.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete tool"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
