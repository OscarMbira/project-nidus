/**
 * Milestone Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const MILESTONE_TYPES_PROJECT = [
  { value: 'project_start', label: 'Project Start' },
  { value: 'stage_start', label: 'Stage Start' },
  { value: 'stage_end', label: 'Stage End' },
  { value: 'project_end', label: 'Project End' },
  { value: 'key_deliverable', label: 'Key Deliverable' },
  { value: 'decision_point', label: 'Decision Point' },
  { value: 'other', label: 'Other' }
]

const MILESTONE_TYPES_STAGE = [
  { value: 'stage_start', label: 'Stage Start' },
  { value: 'deliverable', label: 'Deliverable' },
  { value: 'quality_gate', label: 'Quality Gate' },
  { value: 'decision_point', label: 'Decision Point' },
  { value: 'stage_end', label: 'Stage End' },
  { value: 'other', label: 'Other' }
]

export default function MilestoneForm({ milestone, onSubmit, onCancel, planType }) {
  const [formData, setFormData] = useState({
    milestone_name: '',
    milestone_description: '',
    milestone_date: '',
    milestone_type: planType === 'project_plan' ? 'project_start' : 'stage_start',
    is_critical: false,
    dependencies: ''
  })

  useEffect(() => {
    if (milestone) {
      setFormData({
        milestone_name: milestone.milestone_name || '',
        milestone_description: milestone.milestone_description || '',
        milestone_date: milestone.milestone_date || '',
        milestone_type: milestone.milestone_type || (planType === 'project_plan' ? 'project_start' : 'stage_start'),
        is_critical: milestone.is_critical || false,
        dependencies: milestone.dependencies || ''
      })
    }
  }, [milestone, planType])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.milestone_name || !formData.milestone_date) {
      alert('Milestone name and date are required')
      return
    }
    onSubmit(formData)
  }

  const milestoneTypes = planType === 'project_plan' ? MILESTONE_TYPES_PROJECT : MILESTONE_TYPES_STAGE

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestone Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.milestone_name}
            onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter milestone name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestone Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.milestone_date}
            onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestone Type
          </label>
          <select
            value={formData.milestone_type}
            onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {milestoneTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.milestone_description}
            onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter milestone description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_critical}
              onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Critical Milestone
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dependencies
          </label>
          <textarea
            value={formData.dependencies}
            onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe dependencies"
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
          {milestone ? 'Update' : 'Add'} Milestone
        </button>
      </div>
    </form>
  )
}
