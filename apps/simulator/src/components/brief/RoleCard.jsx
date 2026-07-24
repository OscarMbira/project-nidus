/**
 * Role Card Component
 * Display role description
 */

import { User, Edit2, Trash2, AlertCircle } from 'lucide-react'

const ROLE_CATEGORY_COLORS = {
  executive: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  project_board: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  project_manager: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  team_manager: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  project_assurance: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  project_support: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  specialist: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
  other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

export default function RoleCard({ role, onEdit, onDelete, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {role.role_name}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${ROLE_CATEGORY_COLORS[role.role_category] || ROLE_CATEGORY_COLORS.other}`}>
              {role.role_category.replace('_', ' ')}
            </span>
            {role.is_mandatory && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Mandatory
              </span>
            )}
          </div>
          
          {role.role_description && (
            <p className="text-gray-700 dark:text-gray-300 mb-2">{role.role_description}</p>
          )}
          
          {role.key_responsibilities && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Key Responsibilities:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{role.key_responsibilities}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            {role.assigned_to_user_id || role.assigned_to_name ? (
              <div className="text-green-600 dark:text-green-400">
                <strong>Assigned:</strong> {role.assigned_to_name || role.assigned_user?.full_name || 'Unknown'}
              </div>
            ) : (
              <div className="text-yellow-600 dark:text-yellow-400">
                <strong>Status:</strong> Not yet assigned
              </div>
            )}
            {role.time_commitment && (
              <div className="text-gray-600 dark:text-gray-400">
                <strong>Time:</strong> {role.time_commitment}
              </div>
            )}
            {role.reporting_to && (
              <div className="text-gray-600 dark:text-gray-400">
                <strong>Reports to:</strong> {role.reporting_to}
              </div>
            )}
            {role.authority_level && (
              <div className="text-gray-600 dark:text-gray-400">
                <strong>Authority:</strong> {role.authority_level}
              </div>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(role)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(role.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
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
