/**
 * Role Form Component
 * Add/edit role/responsibility form
 */

import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabaseClient'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function RoleForm({ roleData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
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
      setLoadingUsers(false)
    }
  }

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...roleData, [field]: value })
    }
  }

  const roleTypes = [
    { value: 'communication_manager', label: 'Communication Manager' },
    { value: 'report_author', label: 'Report Author' },
    { value: 'approver', label: 'Approver' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'recipient', label: 'Recipient' },
    { value: 'facilitator', label: 'Facilitator' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
      className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={roleData.role_name || ''}
            onChange={(e) => handleChange('role_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Communication Manager"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role Type <span className="text-red-500">*</span>
          </label>
          <select
            value={roleData.role_type || ''}
            onChange={(e) => handleChange('role_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {roleTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={roleData.role_description || ''}
          onChange={(e) => handleChange('role_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this role..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Responsibilities <span className="text-red-500">*</span>
        </label>
        <textarea
          value={roleData.responsibilities || ''}
          onChange={(e) => handleChange('responsibilities', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="List the key responsibilities for this role..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assigned User
          </label>
          <select
            value={roleData.assigned_user_id || ''}
            onChange={(e) => handleChange('assigned_user_id', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loadingUsers}
          >
            <option value="">Unassigned</option>
            {users.map((user, index) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Authority Level
          </label>
          <input
            type="text"
            value={roleData.authority_level || ''}
            onChange={(e) => handleChange('authority_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Manager, Senior, Lead"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Required Skills
        </label>
        <textarea
          value={roleData.required_skills || ''}
          onChange={(e) => handleChange('required_skills', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Skills and qualifications needed for this role..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Role
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
