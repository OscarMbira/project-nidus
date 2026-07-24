/**
 * Role Card Component
 * Individual role/responsibility display card
 */

import { Edit2, Trash2, User, Users } from 'lucide-react'

export default function RoleCard({ role, onEdit, onDelete, readOnly = false }) {
  const roleTypeLabels = {
    communication_manager: 'Communication Manager',
    report_author: 'Report Author',
    approver: 'Approver',
    distributor: 'Distributor',
    recipient: 'Recipient',
    facilitator: 'Facilitator',
    other: 'Other'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {role.role_name}
            </h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {roleTypeLabels[role.role_type] || role.role_type}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{role.role_description}</p>

          {role.responsibilities && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Responsibilities</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {role.responsibilities}
              </p>
            </div>
          )}

          {role.assigned_user && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>
                <strong>Assigned to:</strong> {role.assigned_user?.full_name || role.assigned_user?.email || 'Unassigned'}
              </span>
            </div>
          )}

          {role.required_skills && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Required Skills:</strong> {role.required_skills}
            </div>
          )}

          {role.authority_level && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>Authority Level:</strong> {role.authority_level}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(role)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit role"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(role.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete role"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
