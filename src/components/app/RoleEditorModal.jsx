/**
 * Role Editor Modal
 * Create or edit project roles with permissions
 */

import { useState, useEffect } from 'react'
import { X, Save, Loader, AlertCircle } from 'lucide-react'
import { createCustomRole, updateRole, getRoleWithPermissions } from '../../services/projectRoleService'
import { appDb } from '../../services/supabaseClient'
import { useToast } from '../../hooks/useToast'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function RoleEditorModal({ projectId, role, isOpen, onClose }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [formData, setFormData] = useState({
    roleName: '',
    displayName: '',
    description: '',
    roleLevel: 5,
    canManageUsers: false,
    canManageProjects: false,
  })
  const [permissions, setPermissions] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [error, setError] = useState(null)

  const isEditing = !!role

  useEffect(() => {
    if (isOpen) {
      loadPermissions()
      if (isEditing) {
        loadRole()
      } else {
        resetForm()
      }
    }
  }, [isOpen, role])

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true)
      const { data, error } = await appDb
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('permission_category', { ascending: true })
        .order('permission_code', { ascending: true })

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const loadRole = async () => {
    try {
      const result = await getRoleWithPermissions(role.id)
      if (result.success) {
        const roleData = result.data
        setFormData({
          roleName: roleData.role_name,
          displayName: roleData.role_display_name,
          description: roleData.role_description || '',
          roleLevel: roleData.role_level,
          canManageUsers: roleData.can_manage_users,
          canManageProjects: roleData.can_manage_projects,
        })
        setSelectedPermissions(
          (roleData.permissions || []).map((p) => p.permission_code)
        )
      }
    } catch (error) {
      console.error('Error loading role:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      roleName: '',
      displayName: '',
      description: '',
      roleLevel: 5,
      canManageUsers: false,
      canManageProjects: false,
    })
    setSelectedPermissions([])
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.roleName || !formData.displayName) {
      setError('Role name and display name are required')
      return
    }

    setLoading(true)
    try {
      const roleData = {
        ...formData,
        permissions: selectedPermissions,
      }

      let result
      if (isEditing) {
        result = await updateRole(role.id, roleData)
      } else {
        result = await createCustomRole(projectId, roleData)
      }

      if (result.success) {
        showToast('success', `Role ${isEditing ? 'updated' : 'created'} successfully`)
        onClose()
      } else {
        setError(result.error || `Failed to ${isEditing ? 'update' : 'create'} role`)
      }
    } catch (error) {
      console.error('Error saving role:', error)
      setError(error.message || `Failed to ${isEditing ? 'update' : 'create'} role`)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionCode) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionCode)
        ? prev.filter((p) => p !== permissionCode)
        : [...prev, permissionCode]
    )
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
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Role' : 'Create Custom Role'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="custom_role_name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Custom Role"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe this role's responsibilities..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Level
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.roleLevel}
                  onChange={(e) => setFormData({ ...formData, roleLevel: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  checked={formData.canManageUsers}
                  onChange={(e) => setFormData({ ...formData, canManageUsers: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Can Manage Users
                </label>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  checked={formData.canManageProjects}
                  onChange={(e) => setFormData({ ...formData, canManageProjects: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Can Manage Projects
                </label>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Permissions ({selectedPermissions.length} selected)
              </label>
              {loadingPermissions ? (
                <div className="text-center py-8">
                  <Loader className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 ml-4">
                        {perms.map((perm, index) => (
                          <label
                            key={perm.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.permission_code)}
                              onChange={() => togglePermission(perm.permission_code)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {perm.permission_name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Role' : 'Create Role'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

