/**
 * Channel Card Component
 * Individual channel display card
 */

import { Edit2, Trash2, Star } from 'lucide-react'

export default function ChannelCard({ channel, onEdit, onDelete, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {channel.channel_name}
            </h4>
            {channel.is_preferred && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs flex items-center gap-1">
                <Star className="h-3 w-3" />
                Preferred
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {channel.channel_type?.replace('_', ' ') || 'Other'}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{channel.channel_description}</p>
          
          {channel.applicability && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Applicability</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{channel.applicability}</p>
            </div>
          )}

          <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
            {channel.effectiveness_rating && (
              <span>
                <strong>Effectiveness:</strong> {channel.effectiveness_rating}/5
              </span>
            )}
            {channel.cost_estimate && (
              <span>
                <strong>Cost:</strong> ${channel.cost_estimate}
              </span>
            )}
          </div>

          {channel.accessibility_requirements && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Accessibility:</strong> {channel.accessibility_requirements}
            </div>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(channel)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit channel"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(channel.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete channel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
