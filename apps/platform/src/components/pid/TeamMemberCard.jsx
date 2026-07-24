/**
 * Team Member Card Component
 * Displays a single PID team structure member
 */

import { Edit2, Trash2, Users } from 'lucide-react'

const ROLE_TYPE_COLORS = {
  project_board: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  project_management: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  team_management: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  assurance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  support: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function TeamMemberCard({ teamMember, mode = 'view', onEdit, onDelete }) {
  const roleTypeColor = ROLE_TYPE_COLORS[teamMember.role_type] || ROLE_TYPE_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {teamMember.role_name}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${roleTypeColor}`}>
              {teamMember.role_type?.replace('_', ' ')}
            </span>
          </div>

          {teamMember.assigned_user?.full_name && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Assigned to: {teamMember.assigned_user.full_name}
              {teamMember.assigned_user.email && (
                <span className="text-gray-500"> ({teamMember.assigned_user.email})</span>
              )}
            </p>
          )}

          {teamMember.assigned_user_name && !teamMember.assigned_user && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Assigned to: {teamMember.assigned_user_name}
            </p>
          )}

          {teamMember.role_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {teamMember.role_description}
            </p>
          )}

          {teamMember.responsibilities && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsibilities:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{teamMember.responsibilities}</p>
            </div>
          )}

          {teamMember.authority_level && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Authority Level:</span> {teamMember.authority_level}
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit team member"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete team member"
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
