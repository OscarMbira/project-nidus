/**
 * Project Roles Page
 * Manage project roles and permissions
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectRoles, getDefaultRoleTemplates, deleteRole } from '../../services/projectRoleService'
import RoleEditorModal from '../../components/app/RoleEditorModal'
import PermissionMatrix from '../../components/app/PermissionMatrix'
import { Shield, Plus, Edit, Trash2, Loader, AlertCircle } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import PermissionGate from '../../components/auth/PermissionGate'

export default function ProjectRoles() {
  const { projectId } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [templates, setTemplates] = useState([])
  const [showEditor, setShowEditor] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  useEffect(() => {
    loadRoles()
  }, [projectId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const result = await getProjectRoles(projectId)
      if (result.success) {
        setRoles(result.data || [])
      }

      const templatesResult = await getDefaultRoleTemplates()
      if (templatesResult.success) {
        setTemplates(templatesResult.data || [])
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      showToast('error', 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    setShowEditor(true)
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setShowEditor(true)
  }

  const handleDelete = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return

    try {
      const result = await deleteRole(roleId)
      if (result.success) {
        showToast('success', 'Role deleted successfully')
        loadRoles()
      } else {
        showToast('error', result.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      showToast('error', 'Failed to delete role')
    }
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingRole(null)
    loadRoles()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const systemRoles = roles.filter((r) => r.is_system_role)
  const customRoles = roles.filter((r) => !r.is_system_role)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Roles</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage roles and permissions for your project
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMatrix(true)}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Shield className="h-4 w-4 mr-2" />
            Permission Matrix
          </button>
          <PermissionGate permission="role.create" projectId={projectId}>
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Role
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* System Roles */}
      {systemRoles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Roles (Templates)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              These roles are provided by default and cannot be modified
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {systemRoles.map((role) => (
              <div key={role.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {role.role_display_name || role.role_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {role.role_description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Level {role.role_level}
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(role)}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Roles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Custom Roles ({customRoles.length})
          </h2>
        </div>
        {customRoles.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {customRoles.map((role) => (
              <div key={role.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {role.role_display_name || role.role_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {role.role_description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Level {role.role_level}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <PermissionGate permission="role.edit" projectId={projectId}>
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="role.delete" projectId={projectId}>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No custom roles yet</p>
            <PermissionGate permission="role.create" projectId={projectId}>
              <button
                onClick={handleCreate}
                className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create your first custom role
              </button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditor && (
        <RoleEditorModal
          projectId={projectId}
          role={editingRole}
          isOpen={showEditor}
          onClose={handleEditorClose}
        />
      )}

      {showMatrix && (
        <PermissionMatrix
          projectId={projectId}
          roles={roles}
          isOpen={showMatrix}
          onClose={() => setShowMatrix(false)}
        />
      )}
    </div>
  )
}

