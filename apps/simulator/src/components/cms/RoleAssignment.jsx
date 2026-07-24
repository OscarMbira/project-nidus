/**
 * Role Assignment Component
 * Component for assigning users to roles
 */

import { useState, useEffect } from 'react'
import { User, X, Users } from 'lucide-react'
import { platformDb } from '../../services/supabaseClient'
import { updateRole } from '../../services/cmsRolesResponsibilitiesService'

export default function RoleAssignment({ role, onUpdate, readOnly = false }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showUserList, setShowUserList] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (userId) => {
    if (readOnly) return
    try {
      setAssigning(true)
      await updateRole(role.id, { assigned_user_id: userId })
      if (onUpdate) {
        onUpdate()
      }
      setShowUserList(false)
    } catch (error) {
      console.error('Error assigning role:', error)
      alert('Error assigning role: ' + error.message)
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (readOnly) return
    if (!confirm('Are you sure you want to unassign this user from the role?')) return
    try {
      setAssigning(true)
      await updateRole(role.id, { assigned_user_id: null })
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error unassigning role:', error)
      alert('Error unassigning role: ' + error.message)
    } finally {
      setAssigning(false)
    }
  }

  if (!role) return null

  const assignedUser = users.find(u => u.id === role.assigned_user_id)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{role.role_name}</h4>
            {assignedUser ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Assigned to: {assignedUser.full_name || assignedUser.email}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500">Unassigned</p>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            {assignedUser ? (
              <button
                onClick={handleUnassign}
                disabled={assigning}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-1" />
                Unassign
              </button>
            ) : (
              <button
                onClick={() => setShowUserList(!showUserList)}
                disabled={assigning}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                <User className="w-4 h-4 inline mr-1" />
                Assign
              </button>
            )}
          </div>
        )}
      </div>

      {showUserList && !readOnly && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select User:</p>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAssign(user.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                >
                  {user.full_name || user.email}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
