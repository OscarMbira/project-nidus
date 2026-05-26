/**
 * Responsibility Form Component
 * Form for adding/editing acceptance responsibilities
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addResponsibility, updateResponsibility } from '../../services/ppdAcceptanceResponsibilitiesService'
import { supabase } from '../../services/supabaseClient'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function ResponsibilityForm({ ppdId, responsibility = null, mode = 'create', projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    role_name: '',
    role_category: 'user',
    user_id: null,
    user_name: '',
    acceptance_scope: '',
    criteria_ids: [],
    authority_level: 'reviewer',
    display_order: 0
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [criteria, setCriteria] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadTeamMembers()
    loadCriteria()
    if (responsibility) {
      setFormData({
        role_name: responsibility.role_name || '',
        role_category: responsibility.role_category || 'user',
        user_id: responsibility.user_id || null,
        user_name: responsibility.user_name || '',
        acceptance_scope: responsibility.acceptance_scope || '',
        criteria_ids: responsibility.criteria_ids || [],
        authority_level: responsibility.authority_level || 'reviewer',
        display_order: responsibility.display_order || 0
      })
    }
  }, [responsibility, projectId, ppdId])

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

  const loadCriteria = async () => {
    try {
      const { data } = await supabase
        .from('ppd_acceptance_criteria')
        .select('id, criteria_reference, criteria_title')
        .eq('ppd_id', ppdId)
        .eq('is_deleted', false)
        .order('criteria_number')

      setCriteria(data || [])
    } catch (error) {
      console.error('Error loading criteria:', error)
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

  const handleCriteriaToggle = (criteriaId) => {
    setFormData(prev => {
      const currentIds = prev.criteria_ids || []
      const newIds = currentIds.includes(criteriaId)
        ? currentIds.filter(id => id !== criteriaId)
        : [...currentIds, criteriaId]
      return {
        ...prev,
        criteria_ids: newIds
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!formData.role_name.trim()) {
      setErrors({ role_name: 'Role name is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addResponsibility(ppdId, formData)
      } else {
        result = await updateResponsibility(responsibility.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving responsibility: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving responsibility:', error)
      alert('Error saving responsibility: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Acceptance Responsibility' : 'Edit Acceptance Responsibility'}
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
            placeholder="e.g., Project Sponsor, Quality Manager"
          />
          {errors.role_name && (
            <p className="mt-1 text-sm text-red-600">{errors.role_name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role Category
            </label>
            <select
              name="role_category"
              value={formData.role_category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="user">User</option>
              <option value="operations">Operations</option>
              <option value="maintenance">Maintenance</option>
              <option value="management">Management</option>
              <option value="quality">Quality</option>
              <option value="regulatory">Regulatory</option>
              <option value="executive">Executive</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Authority Level
            </label>
            <select
              name="authority_level"
              value={formData.authority_level}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="final">Final Authority</option>
              <option value="recommender">Recommender</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assign to User (Optional)
          </label>
          <select
            name="user_id"
            value={formData.user_id || ''}
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
            name="user_name"
            value={formData.user_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Name if external user"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Acceptance Scope
          </label>
          <textarea
            name="acceptance_scope"
            value={formData.acceptance_scope}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="What they are responsible for accepting..."
          />
        </div>

        {criteria.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign to Acceptance Criteria (Optional)
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
              {criteria.map((criterion, index) => (
                <label key={criterion.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.criteria_ids || []).includes(criterion.id)}
                    onChange={() => handleCriteriaToggle(criterion.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {criterion.criteria_reference}: {criterion.criteria_title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Responsibility' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
