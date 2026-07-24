/**
 * Team Member Form Component
 * Form for adding/editing PID team structure members
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addTeamMember, updateTeamMember } from '../../services/pidTeamStructureService'
import { supabase } from '../../services/supabaseClient'

export default function TeamMemberForm({ pidId, teamMember = null, mode = 'create', projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    role_name: '',
    role_description: '',
    assigned_user_id: null,
    assigned_user_name: '',
    role_type: 'project_management',
    responsibilities: '',
    authority_level: '',
    display_order: 0
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadTeamMembers()
    if (teamMember) {
      setFormData({
        role_name: teamMember.role_name || '',
        role_description: teamMember.role_description || '',
        assigned_user_id: teamMember.assigned_user_id || null,
        assigned_user_name: teamMember.assigned_user_name || '',
        role_type: teamMember.role_type || 'project_management',
        responsibilities: teamMember.responsibilities || '',
        authority_level: teamMember.authority_level || '',
        display_order: teamMember.display_order || 0
      })
    }
  }, [teamMember, projectId])

  const loadTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      const members = (data || [])
        .map(up => up.user)
        .filter(u => u)

      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    if (!formData.role_name.trim()) {
      setErrors({ role_name: 'Role name is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addTeamMember(pidId, formData)
      } else {
        result = await updateTeamMember(teamMember.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving team member: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving team member:', error)
      alert('Error saving team member: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Team Member' : 'Edit Team Member'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="role_name"
            value={formData.role_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Executive, Project Manager, Team Manager"
          />
          {errors.role_name && (
            <p className="mt-1 text-sm text-red-600">{errors.role_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role Type
          </label>
          <select
            name="role_type"
            value={formData.role_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="project_board">Project Board</option>
            <option value="project_management">Project Management</option>
            <option value="team_management">Team Management</option>
            <option value="assurance">Assurance</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role Description
          </label>
          <textarea
            name="role_description"
            value={formData.role_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the role..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assign to User (Optional)
          </label>
          <select
            name="assigned_user_id"
            value={formData.assigned_user_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User Name (if external)
          </label>
          <input
            type="text"
            name="assigned_user_name"
            value={formData.assigned_user_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Name if external user"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Responsibilities
          </label>
          <textarea
            name="responsibilities"
            value={formData.responsibilities}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Key responsibilities for this role..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Authority Level
          </label>
          <input
            type="text"
            name="authority_level"
            value={formData.authority_level}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Authority level for this role"
          />
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : mode === 'create' ? 'Add Team Member' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
