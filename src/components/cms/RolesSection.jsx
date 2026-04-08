/**
 * Roles Section Component
 * Roles and responsibilities list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getRoles, addRole, updateRole, deleteRole } from '../../services/cmsRolesResponsibilitiesService'
import { platformDb } from '../../services/supabaseClient'
import RoleCard from './RoleCard'
import RoleForm from './RoleForm'

export default function RolesSection({ cmsId, readOnly = false }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    role_name: '',
    role_type: '',
    role_description: '',
    responsibilities: '',
    assigned_user_id: null,
    authority_level: '',
    required_skills: ''
  })

  useEffect(() => {
    if (cmsId) {
      loadRoles()
    }
  }, [cmsId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await getRoles(cmsId)
      // Enrich with user data if assigned_user_id exists
      const enrichedData = await Promise.all((data || []).map(async (role) => {
        if (role.assigned_user_id) {
          try {
            const { data: userData } = await platformDb
              .from('users')
              .select('id, full_name, email')
              .eq('id', role.assigned_user_id)
              .single()
            return { ...role, assigned_user: userData }
          } catch {
            return role
          }
        }
        return role
      }))
      setRoles(enrichedData)
    } catch (error) {
      console.error('Error loading roles:', error)
      alert('Error loading roles: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateRole(editingId, formData)
      } else {
        await addRole(cmsId, formData)
      }
      await loadRoles()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Error saving role: ' + error.message)
    }
  }

  const handleEdit = (role) => {
    setFormData({
      role_name: role.role_name || '',
      role_type: role.role_type || '',
      role_description: role.role_description || '',
      responsibilities: role.responsibilities || '',
      assigned_user_id: role.assigned_user_id || null,
      authority_level: role.authority_level || '',
      required_skills: role.required_skills || ''
    })
    setEditingId(role.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    try {
      await deleteRole(id)
      await loadRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error deleting role: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      role_name: '',
      role_type: '',
      role_description: '',
      responsibilities: '',
      assigned_user_id: null,
      authority_level: '',
      required_skills: ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding roles
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Roles and Responsibilities
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define roles and responsibilities for communication management
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <RoleForm
          roleData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Roles List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading roles...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No roles and responsibilities defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
