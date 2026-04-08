/**
 * Acceptance Criterion Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const CRITERIA_CATEGORIES = [
  { value: 'functional', label: 'Functional' },
  { value: 'performance', label: 'Performance' },
  { value: 'quality', label: 'Quality' },
  { value: 'usability', label: 'Usability' },
  { value: 'security', label: 'Security' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
]

const STAKEHOLDER_GROUPS = [
  { value: 'users', label: 'Users' },
  { value: 'operations', label: 'Operations' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'management', label: 'Management' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'all', label: 'All' }
]

const PRIORITIES = [
  { value: 'must_have', label: 'Must Have' },
  { value: 'should_have', label: 'Should Have' },
  { value: 'could_have', label: 'Could Have' },
  { value: 'wont_have', label: "Won't Have" }
]

const ACCEPTANCE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'waived', label: 'Waived' },
  { value: 'deferred', label: 'Deferred' }
]

export default function AcceptanceCriterionForm({ criterion, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    criteria_title: '',
    criteria_description: '',
    criteria_category: 'functional',
    stakeholder_group: 'all',
    priority: 'must_have',
    measurement_method: '',
    target_value: '',
    tolerance_lower: '',
    tolerance_upper: '',
    unit_of_measure: '',
    is_measurable: false,
    is_realistic: false,
    is_provable_in_project: true,
    proxy_measure: '',
    validation_notes: '',
    acceptance_status: 'pending'
  })

  useEffect(() => {
    if (criterion) {
      setFormData({
        criteria_title: criterion.criteria_title || '',
        criteria_description: criterion.criteria_description || '',
        criteria_category: criterion.criteria_category || 'functional',
        stakeholder_group: criterion.stakeholder_group || 'all',
        priority: criterion.priority || 'must_have',
        measurement_method: criterion.measurement_method || '',
        target_value: criterion.target_value || '',
        tolerance_lower: criterion.tolerance_lower || '',
        tolerance_upper: criterion.tolerance_upper || '',
        unit_of_measure: criterion.unit_of_measure || '',
        is_measurable: criterion.is_measurable || false,
        is_realistic: criterion.is_realistic || false,
        is_provable_in_project: criterion.is_provable_in_project !== undefined ? criterion.is_provable_in_project : true,
        proxy_measure: criterion.proxy_measure || '',
        validation_notes: criterion.validation_notes || '',
        acceptance_status: criterion.acceptance_status || 'pending'
      })
    }
  }, [criterion])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.criteria_title || !formData.criteria_description) {
      alert('Criteria title and description are required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Criteria Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.criteria_title}
            onChange={(e) => setFormData({ ...formData, criteria_title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Brief title for the criterion"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Criteria Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.criteria_description}
            onChange={(e) => setFormData({ ...formData, criteria_description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Full description of the acceptance criterion"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={formData.criteria_category}
            onChange={(e) => setFormData({ ...formData, criteria_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {CRITERIA_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stakeholder Group
          </label>
          <select
            value={formData.stakeholder_group}
            onChange={(e) => setFormData({ ...formData, stakeholder_group: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {STAKEHOLDER_GROUPS.map(group => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PRIORITIES.map(pri => (
              <option key={pri.value} value={pri.value}>
                {pri.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Acceptance Status
          </label>
          <select
            value={formData.acceptance_status}
            onChange={(e) => setFormData({ ...formData, acceptance_status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {ACCEPTANCE_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Measurement Method
          </label>
          <textarea
            value={formData.measurement_method}
            onChange={(e) => setFormData({ ...formData, measurement_method: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="How it will be measured"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Value
          </label>
          <input
            type="text"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Quantifiable target"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unit of Measure
          </label>
          <input
            type="text"
            value={formData.unit_of_measure}
            onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., seconds, %, count"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance Lower
          </label>
          <input
            type="text"
            value={formData.tolerance_lower}
            onChange={(e) => setFormData({ ...formData, tolerance_lower: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Lower limit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance Upper
          </label>
          <input
            type="text"
            value={formData.tolerance_upper}
            onChange={(e) => setFormData({ ...formData, tolerance_upper: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Upper limit"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proxy Measure (if not directly provable)
          </label>
          <textarea
            value={formData.proxy_measure}
            onChange={(e) => setFormData({ ...formData, proxy_measure: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="If not directly provable, what proxy measure will be used"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_measurable}
              onChange={(e) => setFormData({ ...formData, is_measurable: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Validated as Measurable
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_realistic}
              onChange={(e) => setFormData({ ...formData, is_realistic: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Validated as Realistic
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_provable_in_project}
              onChange={(e) => setFormData({ ...formData, is_provable_in_project: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Can be Proven in Project
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Validation Notes
          </label>
          <textarea
            value={formData.validation_notes}
            onChange={(e) => setFormData({ ...formData, validation_notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Validation notes"
          />
        </div>
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
          {criterion ? 'Update' : 'Add'} Criterion
        </button>
      </div>
    </form>
  )
}
