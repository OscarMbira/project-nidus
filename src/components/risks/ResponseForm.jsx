/**
 * Response Form Component
 * Add/edit response action for a risk
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { createResponse, updateResponse } from '../../services/riskResponseService'
import { SmartAmountInput } from '../ui/SmartAmountInput'

export default function ResponseForm({ riskId, response, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    action_description: '',
    action_type: 'preventive',
    assigned_to_id: '',
    target_date: '',
    estimated_cost: '',
    status: 'planned'
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchTeamMembers()
    if (response) {
      setFormData({
        action_description: response.action_description || '',
        action_type: response.action_type || 'preventive',
        assigned_to_id: response.assigned_to_id || '',
        target_date: response.target_date ? response.target_date.split('T')[0] : '',
        estimated_cost: response.estimated_cost?.toString() || '',
        status: response.status || 'planned'
      })
    }
  }, [response, riskId])

  const fetchTeamMembers = async () => {
    try {
      // Get project from risk
      const { data: riskData } = await platformDb
        .from('risks')
        .select('project_id')
        .eq('id', riskId)
        .single()

      if (!riskData) return

      const { data, error } = await platformDb
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', riskData.project_id)
        .eq('is_deleted', false)

      if (error) throw error

      const members = (data || [])
        .map(up => up.user)
        .filter(u => u)

      setTeamMembers(members)
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate
    const newErrors = {}
    if (!formData.action_description || formData.action_description.trim().length < 20) {
      newErrors.action_description = 'Action description must be at least 20 characters'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      return
    }

    setSaving(true)
    try {
      const submitData = {
        ...formData,
        risk_id: riskId,
        assigned_to_id: formData.assigned_to_id || null,
        target_date: formData.target_date || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null
      }

      let result
      if (response) {
        result = await updateResponse(response.id, submitData)
      } else {
        result = await createResponse(submitData)
      }

      if (result.success) {
        onSave()
      } else {
        alert('Error: ' + (result.error || 'Failed to save response'))
      }
    } catch (error) {
      console.error('Error saving response:', error)
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {response ? 'Edit Response Action' : 'Add Response Action'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action Description * <span className="text-xs text-gray-500">(Min 20 characters)</span>
            </label>
            <textarea
              value={formData.action_description}
              onChange={(e) => handleChange('action_description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.action_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Describe the response action to be taken..."
            />
            {errors.action_description && <p className="text-sm text-red-600 mt-1">{errors.action_description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type *
              </label>
              <select
                value={formData.action_type}
                onChange={(e) => handleChange('action_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="preventive">Preventive - Prevent risk from occurring</option>
                <option value="corrective">Corrective - Correct issue if it occurs</option>
                <option value="contingency">Contingency - Contingency plan action</option>
                <option value="fallback">Fallback - Fallback plan action</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <select
                value={formData.assigned_to_id}
                onChange={(e) => handleChange('assigned_to_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => handleChange('target_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Cost ($)
            </label>
            <SmartAmountInput
              value={formData.estimated_cost ? parseFloat(formData.estimated_cost) : null}
              onChange={(value) => handleChange('estimated_cost', value)}
              placeholder="Enter cost (e.g., 5k, 50k)"
              min={0}
              showShorthandHelper
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : response ? 'Update' : 'Create'} Response
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
