import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { X, Save, User, Calendar, AlertTriangle, TrendingUp } from 'lucide-react'
import { HoldButton } from './ui/HoldButton'

import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
export default function RiskForm({ risk, projectId, onSave, onCancel, onHoldComplete, linkedTaskId, linkedWorkPackageId }) {
  const [formData, setFormData] = useState({
    risk_title: '',
    risk_code: '',
    risk_description: '',
    risk_category: '',
    risk_type: 'threat',
    probability: 3,
    impact: 3,
    response_strategy: '',
    response_strategy_description: '',
    risk_owner_user_id: '',
    target_mitigation_date: '',
    next_review_date: '',
    impact_description: '',
    potential_consequences: '',
    affected_areas: [],
    task_id: '',
    work_package_id: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [saving, setSaving] = useState(false)
  const [newArea, setNewArea] = useState('')

  useEffect(() => {
    if (risk) {
      setFormData({
        risk_title: risk.risk_title || '',
        risk_code: risk.risk_code || '',
        risk_description: risk.risk_description || '',
        risk_category: risk.risk_category || '',
        risk_type: risk.risk_type || 'threat',
        probability: risk.probability || 3,
        impact: risk.impact || 3,
        response_strategy: risk.response_strategy || '',
        response_strategy_description: risk.response_strategy_description || '',
        risk_owner_user_id: risk.risk_owner_user_id || '',
        target_mitigation_date: risk.target_mitigation_date ? format(new Date(risk.target_mitigation_date), 'yyyy-MM-dd') : '',
        next_review_date: risk.next_review_date ? format(new Date(risk.next_review_date), 'yyyy-MM-dd') : '',
        impact_description: risk.impact_description || '',
        potential_consequences: risk.potential_consequences || '',
        affected_areas: risk.affected_areas || [],
        task_id: risk.task_id || '',
        work_package_id: risk.work_package_id || '',
      })
    } else {
      // Set linked IDs if provided
      setFormData(prev => ({
        ...prev,
        task_id: linkedTaskId || '',
        work_package_id: linkedWorkPackageId || '',
      }))
    }
    fetchTeamMembers()
    fetchLinkedItems()
  }, [risk, projectId, linkedTaskId, linkedWorkPackageId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const fetchLinkedItems = async () => {
    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, task_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('task_name', { ascending: true })
      if (tasksData) setTasks(tasksData)

      // Fetch work packages
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('id, work_package_name, work_package_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('work_package_name', { ascending: true })
      if (wpData) setWorkPackages(wpData)
    } catch (error) {
      console.error('Error fetching linked items:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddArea = () => {
    if (newArea.trim()) {
      setFormData(prev => ({
        ...prev,
        affected_areas: [...prev.affected_areas, newArea.trim()]
      }))
      setNewArea('')
    }
  }

  const handleRemoveArea = (index) => {
    setFormData(prev => ({
      ...prev,
      affected_areas: prev.affected_areas.filter((_, i) => i !== index)
    }))
  }

  const calculateRiskScore = () => {
    return formData.probability * formData.impact
  }

  const getRiskLevel = (score) => {
    if (score >= 20) return 'critical'
    if (score >= 12) return 'high'
    if (score >= 6) return 'medium'
    return 'low'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        project_id: projectId,
        risk_owner_user_id: formData.risk_owner_user_id || null,
        target_mitigation_date: formData.target_mitigation_date || null,
        next_review_date: formData.next_review_date || null,
        task_id: formData.task_id || null,
        work_package_id: formData.work_package_id || null,
        status: risk ? risk.status : 'identified',
        identified_by_user_id: user.id,
        updated_by: user.id,
      }

      if (risk) {
        // Update
        const { error } = await supabase
          .from('risks')
          .update(submitData)
          .eq('id', risk.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('risks')
          .insert(submitData)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving risk:', error)
      alert('Error saving risk: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const riskScore = calculateRiskScore()
  const riskLevel = getRiskLevel(riskScore)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {risk ? 'Edit Risk' : 'Create Risk'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Title *
              </label>
              <input
                type="text"
                name="risk_title"
                value={formData.risk_title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Code
              </label>
              <input
                type="text"
                name="risk_code"
                value={formData.risk_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., RISK-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Risk Description *
            </label>
            <textarea
              name="risk_description"
              value={formData.risk_description}
              onChange={handleChange}
              rows={5}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Type
              </label>
              <select
                name="risk_type"
                value={formData.risk_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="threat">Threat</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                name="risk_category"
                value={formData.risk_category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Category</option>
                <option value="technical">Technical</option>
                <option value="schedule">Schedule</option>
                <option value="resource">Resource</option>
                <option value="financial">Financial</option>
                <option value="quality">Quality</option>
                <option value="external">External</option>
                <option value="organizational">Organizational</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Strategy
              </label>
              <select
                name="response_strategy"
                value={formData.response_strategy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Strategy</option>
                <option value="avoid">Avoid</option>
                <option value="transfer">Transfer</option>
                <option value="mitigate">Mitigate</option>
                <option value="accept">Accept</option>
                <option value="exploit">Exploit (Opportunity)</option>
              </select>
            </div>
          </div>

          {/* Probability and Impact Matrix */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Risk Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Probability (1-5) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    name="probability"
                    min="1"
                    max="5"
                    value={formData.probability}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white w-8 text-center">
                    {formData.probability}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Impact (1-5) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    name="impact"
                    min="1"
                    max="5"
                    value={formData.impact}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white w-8 text-center">
                    {formData.impact}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score:</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{riskScore}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Risk Level:</span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  riskLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  riskLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {riskLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Risk Owner
              </label>
              <select
                name="risk_owner_user_id"
                value={formData.risk_owner_user_id}
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
                Response Strategy Description
              </label>
              <textarea
                name="response_strategy_description"
                value={formData.response_strategy_description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Target Mitigation Date
              </label>
              <input
                type="date"
                name="target_mitigation_date"
                value={formData.target_mitigation_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Next Review Date
              </label>
              <input
                type="date"
                name="next_review_date"
                value={formData.next_review_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Impact Description
            </label>
            <textarea
              name="impact_description"
              value={formData.impact_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Potential Consequences
            </label>
            <textarea
              name="potential_consequences"
              value={formData.potential_consequences}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Link to Related Items */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Link to Related Items (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Task
                </label>
                <select
                  name="task_id"
                  value={formData.task_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Task Link</option>
                  {tasks.map((task, index) => (
                    <option key={task.id} value={task.id}>
                      {task.task_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Work Package
                </label>
                <select
                  name="work_package_id"
                  value={formData.work_package_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Work Package Link</option>
                  {workPackages.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.work_package_code || wp.work_package_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Affected Areas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                placeholder="Add affected area..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.affected_areas.map((area, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <HoldButton
              entityType="risk"
              entityId={risk?.id}
              formData={formData}
              projectId={projectId}
              onHoldComplete={onHoldComplete || onCancel}
            />
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
              {saving ? 'Saving...' : risk ? 'Update' : 'Create'} Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

