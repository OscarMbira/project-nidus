import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { X, Save, Calendar, User, FileText } from 'lucide-react'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function ProductForm({ product, projectId, workPackages, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_code: '',
    product_description: '',
    product_type: 'deliverable',
    work_package_id: '',
    assigned_to_user_id: '',
    product_specification: '',
    acceptance_criteria: '',
    quality_standards: '',
    planned_completion_date: '',
    version_number: '1.0',
    notes: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        product_code: product.product_code || '',
        product_description: product.product_description || '',
        product_type: product.product_type || 'deliverable',
        work_package_id: product.work_package_id || '',
        assigned_to_user_id: product.assigned_to_user_id || '',
        product_specification: product.product_specification || '',
        acceptance_criteria: product.acceptance_criteria || '',
        quality_standards: product.quality_standards || '',
        planned_completion_date: product.planned_completion_date ? format(new Date(product.planned_completion_date), 'yyyy-MM-dd') : '',
        version_number: product.version_number || '1.0',
        notes: product.notes || '',
      })
    }
    fetchTeamMembers()
  }, [product, projectId])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        project_id: projectId,
        work_package_id: formData.work_package_id || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        planned_completion_date: formData.planned_completion_date || null,
        status: product ? product.status : 'not_started',
        created_by_user_id: user.id,
        updated_by: user.id,
      }

      if (product) {
        // Update
        const { error } = await supabase
          .from('product_deliverables')
          .update(submitData)
          .eq('id', product.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('product_deliverables')
          .insert(submitData)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Create Product'}
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
                Product Name *
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Code
              </label>
              <input
                type="text"
                name="product_code"
                value={formData.product_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., PROD-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="product_description"
              value={formData.product_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Type
              </label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="deliverable">Deliverable</option>
                <option value="output">Output</option>
                <option value="outcome">Outcome</option>
                <option value="benefit">Benefit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Work Package
              </label>
              <select
                name="work_package_id"
                value={formData.work_package_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Work Package</option>
                {workPackages.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.work_package_code || wp.work_package_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assign To
              </label>
              <select
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Team Member</option>
                {teamMembers.map((member, index) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Specification
            </label>
            <textarea
              name="product_specification"
              value={formData.product_specification}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Standards
              </label>
              <textarea
                name="quality_standards"
                value={formData.quality_standards}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Planned Completion Date
              </label>
              <input
                type="date"
                name="planned_completion_date"
                value={formData.planned_completion_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version Number
              </label>
              <input
                type="text"
                name="version_number"
                value={formData.version_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="1.0"
              />
            </div>
          </div>

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
              {saving ? 'Saving...' : product ? 'Update' : 'Create'} Product
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

