/**
 * Milestone Form Component
 */

import { useState, useEffect } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { X, Save } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

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

function MilestoneFormBody({ milestone, onSubmit, onCancel, planType }) {
  const [formData, setFormData] = useState({
    milestone_name: '',
    milestone_description: '',
    milestone_date: '',
    milestone_type: planType === 'project_plan' ? 'project_start' : 'stage_start',
    is_critical: false,
    dependencies: ''
  })
  const [formTab, setFormTab] = useState('details')

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
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' && (
        !milestone?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this milestone is saved.</p>
        ) : (
          <AuditDetailsPanel description="How this milestone is labelled and classified, and when it was created and last changed.">
            <AuditCard title="Identity" description="How this milestone is labelled and tracked.">
              <AuditField label="Milestone name" value={formData.milestone_name || milestone.milestone_name} />
              <AuditField label="Type" value={humanizeAuditToken(milestone.milestone_type)} />
              <AuditField label="Critical" value={milestone.is_critical ? 'Yes' : 'No'} />
            </AuditCard>
            <AuditCard title="Record history" description="When this milestone was created and last changed.">
              <AuditTimestampPair dateLabel="Created at" value={milestone.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={milestone.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.plan_milestones.milestone_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Milestone Name <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.plan_milestones.milestone_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Milestone Date <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <input
            type="date"
            value={formData.milestone_date}
            onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.plan_milestones.milestone_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestone Type
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.plan_milestones.milestone_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </FieldLabelWithHelp>
          <textarea
            value={formData.milestone_description}
            onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter milestone description"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.plan_milestones.is_critical" className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_critical}
              onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Critical Milestone
            </span>
          </FieldLabelWithHelp>
        </div>

        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.plan_milestones.dependencies" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dependencies
          </FieldLabelWithHelp>
          <textarea
            value={formData.dependencies}
            onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe dependencies"
          />
        </div>
      </div>
      </>
      )}

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

// v1345 slice 4: field help for this component (public.plan_milestones.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'milestone_name', 'milestone_date', 'milestone_type', 'milestone_description', 'is_critical',
  'dependencies',
].map((name) => `public.plan_milestones.${name}`)

export default function MilestoneForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <MilestoneFormBody {...props} />
    </FieldHelpScope>
  )
}
