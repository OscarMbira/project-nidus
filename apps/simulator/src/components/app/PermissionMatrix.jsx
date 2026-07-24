/**
 * Permission Matrix Component
 * Grid view showing roles × permissions
 */

import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'
import { appDb } from '../../services/supabaseClient'

export default function PermissionMatrix({ projectId, roles, isOpen, onClose }) {
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadMatrix()
    }
  }, [isOpen, roles])

  const loadMatrix = async () => {
    try {
      setLoading(true)

      // Load permissions
      const { data: perms, error: permError } = await appDb
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('permission_category', { ascending: true })
        .order('permission_code', { ascending: true })

      if (permError) throw permError
      setPermissions(perms || [])

      // Load role-permission mappings
      const rolePermsMap = {}
      for (const role of roles) {
        const { data: rp, error: rpError } = await appDb
          .from('role_permissions')
          .select('permission:permissions(permission_code)')
          .eq('role_id', role.id)
          .eq('is_active', true)
          .eq('is_deleted', false)

        if (!rpError && rp) {
          rolePermsMap[role.id] = new Set(rp.map((item) => item.permission?.permission_code).filter(Boolean))
        }
      }
      setRolePermissions(rolePermsMap)
    } catch (error) {
      console.error('Error loading permission matrix:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (roleId, permissionCode) => {
    return rolePermissions[roleId]?.has(permissionCode) || false
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.permission_category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(perm)
    return acc
  }, {})

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full p-6 max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Permission Matrix</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 z-10">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.id}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]"
                      >
                        {role.role_display_name || role.role_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <>
                      <tr key={`category-${category}`} className="bg-gray-50 dark:bg-gray-700">
                        <td
                          colSpan={roles.length + 1}
                          className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white capitalize"
                        >
                          {category}
                        </td>
                      </tr>
                      {perms.map((perm) => (
                        <tr key={perm.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 z-10">
                            <div>
                              <div className="font-medium">{perm.permission_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {perm.permission_code}
                              </div>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={role.id} className="px-4 py-3 text-center">
                              {hasPermission(role.id, perm.permission_code) ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full">
                                  <span className="text-gray-400 text-xs">—</span>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">Has Permission</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">—</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">No Permission</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

