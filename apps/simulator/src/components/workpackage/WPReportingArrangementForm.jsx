/**
 * Work Package Reporting Arrangement Form Component
 * Form for adding/editing Work Package reporting arrangements
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addReportingArrangement, updateReportingArrangement } from '../../services/wpReportingArrangementsService'
import { supabase } from '../../services/supabaseClient'

export default function WPReportingArrangementForm({ wpId, arrangement = null, mode = 'create', projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    report_type: 'checkpoint_report',
    report_frequency: '',
    report_recipients: '',
    report_format: 'written',
    report_template: '',
    report_owner: null,
    report_description: '',
    display_order: 0
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadTeamMembers()
    if (arrangement) {
      setFormData({
        report_type: arrangement.report_type || 'checkpoint_report',
        report_frequency: arrangement.report_frequency || '',
        report_recipients: arrangement.report_recipients || '',
        report_format: arrangement.report_format || 'written',
        report_template: arrangement.report_template || '',
        report_owner: arrangement.report_owner || null,
        report_description: arrangement.report_description || '',
        display_order: arrangement.display_order || 0
      })
    }
  }, [arrangement, projectId])

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

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addReportingArrangement(wpId, formData)
      } else {
        result = await updateReportingArrangement(arrangement.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving reporting arrangement: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving reporting arrangement:', error)
      alert('Error saving reporting arrangement: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Reporting Arrangement' : 'Edit Reporting Arrangement'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type
            </label>
            <select
              name="report_type"
              value={formData.report_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="checkpoint_report">Checkpoint Report</option>
              <option value="highlight_report">Highlight Report</option>
              <option value="exception_report">Exception Report</option>
              <option value="ad_hoc">Ad Hoc</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Format
            </label>
            <select
              name="report_format"
              value={formData.report_format}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="written">Written</option>
              <option value="verbal">Verbal</option>
              <option value="dashboard">Dashboard</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Frequency
          </label>
          <input
            type="text"
            name="report_frequency"
            value={formData.report_frequency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Weekly, Monthly, On-demand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Recipients
          </label>
          <textarea
            name="report_recipients"
            value={formData.report_recipients}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Who receives the report..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Owner
          </label>
          <select
            name="report_owner"
            value={formData.report_owner || ''}
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
            Report Template
          </label>
          <input
            type="text"
            name="report_template"
            value={formData.report_template}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Report template name or reference"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Description
          </label>
          <textarea
            name="report_description"
            value={formData.report_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Description of the reporting arrangement..."
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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Arrangement' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
