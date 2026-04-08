import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, Calendar, User, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { HoldButton } from '../ui/HoldButton'

export default function WorkPackageForm({ workPackage, projectId, stageBoundaries, onSave, onCancel, onHoldComplete }) {
  const [formData, setFormData] = useState({
    work_package_name: '',
    work_package_code: '',
    work_package_description: '',
    stage_boundary_id: '',
    assigned_to_user_id: '',
    objectives: '',
    products_deliverables: [],
    quality_criteria: '',
    acceptance_criteria: '',
    planned_start_date: '',
    planned_end_date: '',
    estimated_cost: '',
    notes: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [newDeliverable, setNewDeliverable] = useState('')

  useEffect(() => {
    if (workPackage) {
      setFormData({
        work_package_name: workPackage.work_package_name || '',
        work_package_code: workPackage.work_package_code || '',
        work_package_description: workPackage.work_package_description || '',
        stage_boundary_id: workPackage.stage_boundary_id || '',
        assigned_to_user_id: workPackage.assigned_to_user_id || '',
        objectives: workPackage.objectives || '',
        products_deliverables: workPackage.products_deliverables || [],
        quality_criteria: workPackage.quality_criteria || '',
        acceptance_criteria: workPackage.acceptance_criteria || '',
        planned_start_date: workPackage.planned_start_date ? format(new Date(workPackage.planned_start_date), 'yyyy-MM-dd') : '',
        planned_end_date: workPackage.planned_end_date ? format(new Date(workPackage.planned_end_date), 'yyyy-MM-dd') : '',
        estimated_cost: workPackage.estimated_cost || '',
        notes: workPackage.notes || '',
      })
    }
    fetchTeamMembers()
  }, [workPackage, projectId])

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      setFormData(prev => ({
        ...prev,
        products_deliverables: [...prev.products_deliverables, newDeliverable.trim()]
      }))
      setNewDeliverable('')
    }
  }

  const handleRemoveDeliverable = (index) => {
    setFormData(prev => ({
      ...prev,
      products_deliverables: prev.products_deliverables.filter((_, i) => i !== index)
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
        project_id: projectId,
        stage_boundary_id: formData.stage_boundary_id || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        status: workPackage ? workPackage.status : 'draft',
        updated_by: user.id,
      }

      if (workPackage) {
        // Update
        const { error } = await supabase
          .from('work_packages')
          .update(submitData)
          .eq('id', workPackage.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('work_packages')
          .insert(submitData)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving work package:', error)
      alert('Error saving work package: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {workPackage ? 'Edit Work Package' : 'Create Work Package'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Package Name *
              </label>
              <input
                type="text"
                name="work_package_name"
                value={formData.work_package_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Package Code
              </label>
              <input
                type="text"
                name="work_package_code"
                value={formData.work_package_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., WP-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="work_package_description"
              value={formData.work_package_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Stage and Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Stage
              </label>
              <select
                name="stage_boundary_id"
                value={formData.stage_boundary_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Stage</option>
                {stageBoundaries.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.gate_name} - {stage.stage_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assign To (Team Manager/Lead)
              </label>
              <select
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Team Member</option>
                {teamMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Objectives
            </label>
            <textarea
              name="objectives"
              value={formData.objectives}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="What needs to be achieved..."
            />
          </div>

          {/* Products/Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Products/Deliverables
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDeliverable())}
                placeholder="Add deliverable..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="space-y-1">
              {formData.products_deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-900 dark:text-white">{deliverable}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quality and Acceptance Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Criteria
              </label>
              <textarea
                name="quality_criteria"
                value={formData.quality_criteria}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Acceptance Criteria
              </label>
              <textarea
                name="acceptance_criteria"
                value={formData.acceptance_criteria}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Dates and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Planned Start Date
              </label>
              <input
                type="date"
                name="planned_start_date"
                value={formData.planned_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Planned End Date
              </label>
              <input
                type="date"
                name="planned_end_date"
                value={formData.planned_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Cost
              </label>
              <input
                type="number"
                name="estimated_cost"
                value={formData.estimated_cost}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <HoldButton
              entityType="work_package"
              entityId={workPackage?.id}
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
              {saving ? 'Saving...' : workPackage ? 'Update' : 'Create'} Work Package
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

