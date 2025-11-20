import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Save, Plus, Trash2, Zap } from 'lucide-react'

export default function AutomationRuleBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_description: '',
    rule_category: 'general',
    trigger_config: {
      type: '',
      conditions: {}
    },
    action_config: {
      type: '',
      parameters: {}
    },
    project_id: null,
    methodology_id: null,
    is_active: true,
    priority: 5,
  })

  useEffect(() => {
    if (id) {
      fetchRule()
    }
  }, [id])

  const fetchRule = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      
      setFormData({
        rule_name: data.rule_name || '',
        rule_description: data.rule_description || '',
        rule_category: data.rule_category || 'general',
        trigger_config: data.trigger_config || { type: '', conditions: {} },
        action_config: data.action_config || { type: '', parameters: {} },
        project_id: data.project_id,
        methodology_id: data.methodology_id,
        is_active: data.is_active ?? true,
        priority: data.priority || 5,
      })
    } catch (error) {
      console.error('Error fetching rule:', error)
      alert('Error loading rule: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }))
  }

  const handleTriggerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        [field]: value
      }
    }))
  }

  const handleActionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      action_config: {
        ...prev.action_config,
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        updated_by: user.id,
      }

      if (id) {
        const { error } = await supabase
          .from('automation_rules')
          .update(submitData)
          .eq('id', id)

        if (error) throw error
      } else {
        submitData.created_by = user.id
        const { error } = await supabase
          .from('automation_rules')
          .insert(submitData)

        if (error) throw error
      }

      navigate('/automation')
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Error saving rule: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const triggerTypes = [
    { value: 'task_created', label: 'Task Created' },
    { value: 'task_updated', label: 'Task Updated' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'task_assigned', label: 'Task Assigned' },
    { value: 'project_created', label: 'Project Created' },
    { value: 'project_status_changed', label: 'Project Status Changed' },
    { value: 'issue_created', label: 'Issue Created' },
    { value: 'risk_identified', label: 'Risk Identified' },
    { value: 'comment_added', label: 'Comment Added' },
    { value: 'scheduled', label: 'Scheduled' },
  ]

  const actionTypes = [
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'assign_task', label: 'Assign Task' },
    { value: 'update_status', label: 'Update Status' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'create_issue', label: 'Create Issue' },
    { value: 'send_email', label: 'Send Email' },
    { value: 'update_field', label: 'Update Field' },
    { value: 'run_integration', label: 'Run Integration' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/automation')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Automation
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="h-8 w-8" />
          {id ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure triggers and actions for workflow automation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                name="rule_name"
                value={formData.rule_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Auto-assign high priority tasks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="rule_description"
                value={formData.rule_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="rule_category"
                  value={formData.rule_category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="general">General</option>
                  <option value="task">Task</option>
                  <option value="project">Project</option>
                  <option value="notification">Notification</option>
                  <option value="integration">Integration</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trigger Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Type *
              </label>
              <select
                value={formData.trigger_config.type}
                onChange={(e) => handleTriggerChange('type', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select trigger type...</option>
                {triggerTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            {formData.trigger_config.type && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure trigger conditions in the JSON editor below or use the UI builder (coming soon).
                </p>
                <textarea
                  value={JSON.stringify(formData.trigger_config.conditions || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleTriggerChange('conditions', parsed)
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={6}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                  placeholder='{"project_id": "...", "status": "..."}'
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Action Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type *
              </label>
              <select
                value={formData.action_config.type}
                onChange={(e) => handleActionChange('type', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select action type...</option>
                {actionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            {formData.action_config.type && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure action parameters in the JSON editor below.
                </p>
                <textarea
                  value={JSON.stringify(formData.action_config.parameters || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleActionChange('parameters', parsed)
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={6}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                  placeholder='{"recipients": [...], "template": "..."}'
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/automation')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </form>
    </div>
  )
}

