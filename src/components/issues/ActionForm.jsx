import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, User, Calendar, DollarSign, Clock } from 'lucide-react'
import { addAction, updateAction } from '../../services/issueActionService'
import { format } from 'date-fns'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function ActionForm({ issueId, action, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    action_description: '',
    action_type: 'corrective',
    assigned_to_id: '',
    assigned_to_name: '',
    target_date: '',
    estimated_effort_hours: '',
    estimated_cost: '',
    status: 'planned'
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (action) {
      setFormData({
        action_description: action.action_description || '',
        action_type: action.action_type || 'corrective',
        assigned_to_id: action.assigned_to_id || '',
        assigned_to_name: action.assigned_to_name || '',
        target_date: action.target_date ? format(new Date(action.target_date), 'yyyy-MM-dd') : '',
        estimated_effort_hours: action.estimated_effort_hours || '',
        estimated_cost: action.estimated_cost || '',
        status: action.status || 'planned'
      })
    }
    fetchTeamMembers()
  }, [action, issueId])

  const fetchTeamMembers = async () => {
    try {
      // Get project_id from issue
      const { data: issue } = await supabase
        .from('issues')
        .select('project_id')
        .eq('id', issueId)
        .single()

      if (!issue) return

      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', issue.project_id)
        .eq('is_deleted', false)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (action) {
        await updateAction(action.id, {
          ...formData,
          estimated_effort_hours: formData.estimated_effort_hours ? parseFloat(formData.estimated_effort_hours) : null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          target_date: formData.target_date || null
        })
      } else {
        await addAction(issueId, {
          ...formData,
          estimated_effort_hours: formData.estimated_effort_hours ? parseFloat(formData.estimated_effort_hours) : null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          target_date: formData.target_date || null
        })
      }

      onSave()
    } catch (error) {
      console.error('Error saving action:', error)
      alert('Error saving action: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {action ? 'Edit Action' : 'Add Action'}
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
              Action Description *
            </label>
            <textarea
              name="action_description"
              value={formData.action_description}
              onChange={handleChange}
              rows={4}
              required
              minLength={20}
              placeholder="Describe the action to be taken..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type *
              </label>
              <select
                name="action_type"
                value={formData.action_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="investigation">Investigation</option>
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="workaround">Workaround</option>
                <option value="escalation">Escalation</option>
                <option value="communication">Communication</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assigned To
              </label>
              <select
                name="assigned_to_id"
                value={formData.assigned_to_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member, index) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Target Date *
              </label>
              <input
                type="date"
                name="target_date"
                value={formData.target_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Estimated Effort (Hours)
              </label>
              <input
                type="number"
                name="estimated_effort_hours"
                value={formData.estimated_effort_hours}
                onChange={handleChange}
                step="0.5"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Estimated Cost ($)
              </label>
              <input
                type="number"
                name="estimated_cost"
                value={formData.estimated_cost}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
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
              {saving ? 'Saving...' : action ? 'Update' : 'Add'} Action
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
