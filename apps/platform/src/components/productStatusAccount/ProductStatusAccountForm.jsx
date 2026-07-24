/**
 * Product Status Account Form Component
 * Form for creating/editing Product Status Accounts
 */

import { useState, useEffect } from 'react'
import { X, Save, Calendar, User, Package } from 'lucide-react'
import { createProductStatusAccount, updateProductStatusAccount, getProductStatusAccountById } from '../../services/productStatusAccountService'
import { supabase } from '../../services/supabaseClient'
import PSAStatusIndicator from './PSAStatusIndicator'
import PSAProgressIndicator from './PSAProgressIndicator'

export default function ProductStatusAccountForm({
  projectId,
  psaId = null,
  productDeliverableId = null,
  productDescriptionId = null,
  mode = 'create',
  onSave,
  onCancel
}) {
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    product_name: '',
    product_reference: '',
    product_type: 'deliverable',
    product_category: '',
    current_status: 'not_started',
    status_notes: '',
    progress_percentage: 0,
    progress_indicator: 'on_track',
    progress_notes: '',
    planned_start_date: '',
    actual_start_date: '',
    planned_completion_date: '',
    forecast_completion_date: '',
    actual_completion_date: '',
    quality_status: 'not_applicable',
    quality_notes: '',
    acceptance_status: 'not_applicable',
    acceptance_notes: '',
    handover_status: 'not_applicable',
    handover_notes: '',
    status_summary: '',
    key_achievements: '',
    next_milestones: '',
    risks_and_issues: '',
    actions_required: '',
    assigned_to_id: null,
    team_name: '',
    product_deliverable_id: productDeliverableId,
    product_description_id: productDescriptionId
  })
  const [productDeliverables, setProductDeliverables] = useState([])
  const [productDescriptions, setProductDescriptions] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (psaId && mode !== 'create') {
      loadProductStatusAccount()
    }
    if (projectId) {
      loadProductDeliverables()
      loadProductDescriptions()
      loadTeamMembers()
    }
  }, [psaId, mode, projectId])

  const loadProductStatusAccount = async () => {
    try {
      setLoading(true)
      const result = await getProductStatusAccountById(psaId)
      if (result.success && result.data) {
        const data = result.data
        setFormData({
          report_date: data.report_date || new Date().toISOString().split('T')[0],
          product_name: data.product_name || '',
          product_reference: data.product_reference || '',
          product_type: data.product_type || 'deliverable',
          product_category: data.product_category || '',
          current_status: data.current_status || 'not_started',
          status_notes: data.status_notes || '',
          progress_percentage: data.progress_percentage || 0,
          progress_indicator: data.progress_indicator || 'on_track',
          progress_notes: data.progress_notes || '',
          planned_start_date: data.planned_start_date || '',
          actual_start_date: data.actual_start_date || '',
          planned_completion_date: data.planned_completion_date || '',
          forecast_completion_date: data.forecast_completion_date || '',
          actual_completion_date: data.actual_completion_date || '',
          quality_status: data.quality_status || 'not_applicable',
          quality_notes: data.quality_notes || '',
          acceptance_status: data.acceptance_status || 'not_applicable',
          acceptance_notes: data.acceptance_notes || '',
          handover_status: data.handover_status || 'not_applicable',
          handover_notes: data.handover_notes || '',
          status_summary: data.status_summary || '',
          key_achievements: data.key_achievements || '',
          next_milestones: data.next_milestones || '',
          risks_and_issues: data.risks_and_issues || '',
          actions_required: data.actions_required || '',
          assigned_to_id: data.assigned_to_id || null,
          team_name: data.team_name || '',
          product_deliverable_id: data.product_deliverable_id || null,
          product_description_id: data.product_description_id || null
        })
      }
    } catch (error) {
      console.error('Error loading product status account:', error)
      alert('Error loading product status account: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProductDeliverables = async () => {
    try {
      const { data } = await supabase
        .from('product_deliverables')
        .select('id, product_name, product_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('product_name')

      setProductDeliverables(data || [])
    } catch (error) {
      console.error('Error loading product deliverables:', error)
    }
  }

  const loadProductDescriptions = async () => {
    try {
      const { data } = await supabase
        .from('product_descriptions')
        .select('id, product_title, pd_reference')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('product_title')

      setProductDescriptions(data || [])
    } catch (error) {
      console.error('Error loading product descriptions:', error)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    // Validation
    if (!formData.product_name.trim()) {
      setErrors({ product_name: 'Product name is required' })
      setSaving(false)
      return
    }

    try {
      let result
      if (mode === 'create') {
        result = await createProductStatusAccount(projectId, formData)
      } else {
        result = await updateProductStatusAccount(psaId, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving product status account: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving product status account:', error)
      alert('Error saving product status account: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product status account...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {mode === 'create' ? 'Create Product Status Account' : 'Edit Product Status Account'}
        </h2>

        {/* Basic Information */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.product_name && (
                <p className="mt-1 text-sm text-red-600">{errors.product_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Reference
              </label>
              <input
                type="text"
                name="product_reference"
                value={formData.product_reference}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Type
              </label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="deliverable">Deliverable</option>
                <option value="output">Output</option>
                <option value="outcome">Outcome</option>
                <option value="benefit">Benefit</option>
                <option value="document">Document</option>
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link to Product Deliverable
              </label>
              <select
                name="product_deliverable_id"
                value={formData.product_deliverable_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">None</option>
                {productDeliverables.map(deliverable => (
                  <option key={deliverable.id} value={deliverable.id}>
                    {deliverable.product_name} {deliverable.product_code ? `(${deliverable.product_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link to Product Description
              </label>
              <select
                name="product_description_id"
                value={formData.product_description_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">None</option>
                {productDescriptions.map(pd => (
                  <option key={pd.id} value={pd.id}>
                    {pd.product_title} ({pd.pd_reference})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="current_status"
                value={formData.current_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="not_started">Not Started</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="quality_check">Quality Check</option>
                <option value="completed">Completed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="handed_over">Handed Over</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Notes
              </label>
              <textarea
                name="status_notes"
                value={formData.status_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Progress</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress Percentage (0-100)
              </label>
              <input
                type="number"
                name="progress_percentage"
                value={formData.progress_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress Indicator
              </label>
              <select
                name="progress_indicator"
                value={formData.progress_indicator}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="delayed">Delayed</option>
                <option value="ahead_of_schedule">Ahead of Schedule</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress Notes
              </label>
              <textarea
                name="progress_notes"
                value={formData.progress_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Schedule</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planned Start Date
              </label>
              <input
                type="date"
                name="planned_start_date"
                value={formData.planned_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Actual Start Date
              </label>
              <input
                type="date"
                name="actual_start_date"
                value={formData.actual_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planned Completion Date
              </label>
              <input
                type="date"
                name="planned_completion_date"
                value={formData.planned_completion_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Forecast Completion Date
              </label>
              <input
                type="date"
                name="forecast_completion_date"
                value={formData.forecast_completion_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Actual Completion Date
              </label>
              <input
                type="date"
                name="actual_completion_date"
                value={formData.actual_completion_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Status Summary</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Overall Status Summary
            </label>
            <textarea
              name="status_summary"
              value={formData.status_summary}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Provide an overall summary of the product status..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Achievements
            </label>
            <textarea
              name="key_achievements"
              value={formData.key_achievements}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Key achievements since last report..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Next Milestones
            </label>
            <textarea
              name="next_milestones"
              value={formData.next_milestones}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Next milestones to achieve..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Risks and Issues
            </label>
            <textarea
              name="risks_and_issues"
              value={formData.risks_and_issues}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Summary of risks and issues..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Actions Required
            </label>
            <textarea
              name="actions_required"
              value={formData.actions_required}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Actions required to proceed..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
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
            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
