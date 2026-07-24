/**
 * Audience Group Card Component
 * Individual audience group display card
 */

import { Edit2, Trash2, Users } from 'lucide-react'

export default function AudienceGroupCard({ group, onEdit, onDelete, readOnly = false }) {
  const groupTypeLabels = {
    project_board: 'Project Board',
    project_team: 'Project Team',
    stakeholders: 'Stakeholders',
    customers: 'Customers',
    suppliers: 'Suppliers',
    regulators: 'Regulators',
    public: 'Public',
    other: 'Other'
  }

  const confidentialityLabels = {
    public: 'Public',
    internal: 'Internal',
    confidential: 'Confidential',
    restricted: 'Restricted'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {group.group_name}
            </h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {groupTypeLabels[group.group_type] || group.group_type}
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">
              {confidentialityLabels[group.confidentiality_level] || group.confidentiality_level}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{group.group_description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {group.communication_needs && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Communication Needs</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{group.communication_needs}</p>
              </div>
            )}

            {group.frequency_preference && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Frequency Preference</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {group.frequency_preference.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>

          {group.channel_preferences && group.channel_preferences.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Preferred Channels</p>
              <div className="flex flex-wrap gap-2">
                {group.channel_preferences.map((channel, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </div>
          )}

          {group.key_messages && group.key_messages.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Key Messages</p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {group.key_messages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {group.stakeholder_category && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Stakeholder Category:</strong> {group.stakeholder_category}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(group)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit audience group"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(group.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete audience group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
