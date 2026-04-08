/**
 * Responsibility Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

const RESPONSIBILITY_TYPES = [
  { value: 'accepts_product', label: 'Accepts Product' },
  { value: 'accepts_subset', label: 'Accepts Subset' },
  { value: 'signs_off', label: 'Signs Off' },
  { value: 'approves', label: 'Approves' },
  { value: 'reviews', label: 'Reviews' }
]

export default function ResponsibilityForm({ responsibility, onSubmit, onCancel, projectId, acceptanceCriteria = [] }) {
  const [formData, setFormData] = useState({
    responsibility_type: 'accepts_product',
    role_name: '',
    role_description: '',
    assigned_to_id: null,
    assigned_to_name: '',
    acceptance_criteria_ids: []
  })
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (responsibility) {
      setFormData({
        responsibility_type: responsibility.responsibility_type || 'accepts_product',
        role_name: responsibility.role_name || '',
        role_description: responsibility.role_description || '',
        assigned_to_id: responsibility.assigned_to_id || null,
        assigned_to_name: responsibility.assigned_to_name || '',
        acceptance_criteria_ids: responsibility.acceptance_criteria_ids || []
      })
    }
    if (projectId) {
      loadTeamMembers()
    }
  }, [responsibility, projectId])

  const loadTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setTeamMembers((data || []).map(m => m.user).filter(Boolean))
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.role_name) {
      alert('Role name is required')
      return
    }
    onSubmit(formData)
  }

  const handleCriteriaToggle = (criterionId) => {
    setFormData(prev => {
      const currentIds = prev.acceptance_criteria_ids || []
      const newIds = currentIds.includes(criterionId)
        ? currentIds.filter(id => id !== criterionId)
        : [...currentIds, criterionId]
      return { ...prev, acceptance_criteria_ids: newIds }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Responsibility Type
          </label>
          <select
            value={formData.responsibility_type}
            onChange={(e) => setFormData({ ...formData, responsibility_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {RESPONSIBILITY_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assigned To
          </label>
          <select
            value={formData.assigned_to_id || ''}
            onChange={(e) => {
              const member = teamMembers.find(m => m.id === e.target.value)
              setFormData({
                ...formData,
                assigned_to_id: e.target.value || null,
                assigned_to_name: member?.full_name || ''
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select team member</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.role_name}
            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Product Owner, Operations Manager"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role Description
          </label>
          <textarea
            value={formData.role_description}
            onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the role and responsibilities"
          />
        </div>

        {acceptanceCriteria.length > 0 && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acceptance Criteria (select which criteria this role accepts)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              {acceptanceCriteria.map(criterion => (
                <label key={criterion.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <input
                    type="checkbox"
                    checked={formData.acceptance_criteria_ids?.includes(criterion.id) || false}
                    onChange={() => handleCriteriaToggle(criterion.id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {criterion.criteria_reference || `#${criterion.criteria_number}`}: {criterion.criteria_title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {responsibility ? 'Update' : 'Add'} Responsibility
        </button>
      </div>
    </form>
  )
}
