/**
 * Role Descriptions Section
 * Section 8: Detailed role definitions
 */

import { useState, useEffect } from 'react'
import { getRoles, addRole, updateRole, deleteRole, assignRoleToUser } from '../../services/briefRolesService'
import { supabase } from '../../services/supabaseClient'
import RoleCard from './RoleCard'
import { Plus } from 'lucide-react'

const ROLE_CATEGORIES = [
  { value: 'executive', label: 'Executive' },
  { value: 'project_board', label: 'Project Board' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'team_manager', label: 'Team Manager' },
  { value: 'project_assurance', label: 'Project Assurance' },
  { value: 'project_support', label: 'Project Support' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'other', label: 'Other' }
]

export default function RoleDescriptionsSection({ briefId, readOnly = false }) {
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    role_name: '',
    role_category: 'other',
    role_description: '',
    key_responsibilities: '',
    authority_level: '',
    reporting_to: '',
    required_skills: '',
    required_experience: '',
    time_commitment: '',
    assigned_to_user_id: '',
    assigned_to_name: '',
    is_mandatory: false
  })

  useEffect(() => {
    if (briefId) {
      loadRoles()
      loadUsers()
    }
  }, [briefId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await getRoles(briefId)
      setRoles(data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateRole(editingId, formData)
      } else {
        await addRole(briefId, formData)
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
      role_name: role.role_name,
      role_category: role.role_category,
      role_description: role.role_description || '',
      key_responsibilities: role.key_responsibilities || '',
      authority_level: role.authority_level || '',
      reporting_to: role.reporting_to || '',
      required_skills: role.required_skills || '',
      required_experience: role.required_experience || '',
      time_commitment: role.time_commitment || '',
      assigned_to_user_id: role.assigned_to_user_id || '',
      assigned_to_name: role.assigned_to_name || '',
      is_mandatory: role.is_mandatory || false
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
      role_category: 'other',
      role_description: '',
      key_responsibilities: '',
      authority_level: '',
      reporting_to: '',
      required_skills: '',
      required_experience: '',
      time_commitment: '',
      assigned_to_user_id: '',
      assigned_to_name: '',
      is_mandatory: false
    })
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before adding roles
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            8. Role Descriptions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define detailed role descriptions for the project team. Executive and PM are mandatory.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role_category}
                onChange={(e) => setFormData({ ...formData, role_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {ROLE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role Description
            </label>
            <textarea
              value={formData.role_description}
              onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Responsibilities
            </label>
            <textarea
              value={formData.key_responsibilities}
              onChange={(e) => setFormData({ ...formData, key_responsibilities: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Authority Level
              </label>
              <input
                type="text"
                value={formData.authority_level}
                onChange={(e) => setFormData({ ...formData, authority_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Decision-making authority"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reporting To
              </label>
              <input
                type="text"
                value={formData.reporting_to}
                onChange={(e) => setFormData({ ...formData, reporting_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Reports to which role"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Skills
              </label>
              <textarea
                value={formData.required_skills}
                onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Experience
              </label>
              <textarea
                value={formData.required_experience}
                onChange={(e) => setFormData({ ...formData, required_experience: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Commitment
              </label>
              <input
                type="text"
                value={formData.time_commitment}
                onChange={(e) => setFormData({ ...formData, time_commitment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 0.5 FTE, 2 days/week"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <select
                value={formData.assigned_to_user_id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value)
                  setFormData({
                    ...formData,
                    assigned_to_user_id: e.target.value,
                    assigned_to_name: user?.full_name || ''
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mandatory Role
                </span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {editingId ? 'Update' : 'Add'} Role
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                resetForm()
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Roles List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No roles defined yet. At least Executive and PM are required.
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role, index) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {role.role_name}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm capitalize">
                      {role.role_category.replace('_', ' ')}
                    </span>
                    {role.is_mandatory && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
                        Mandatory
                      </span>
                    )}
                  </div>
                  {role.role_description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{role.role_description}</p>
                  )}
                  {role.assigned_to_user_id || role.assigned_to_name ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Assigned to: {role.assigned_to_name || role.assigned_user?.full_name || 'Unknown'}
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Not yet assigned</p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
