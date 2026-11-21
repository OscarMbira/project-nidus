/**
 * Method Form Component
 * Add/edit communication method form
 */

import { useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

function MethodFormBody({ methodData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const [formTab, setFormTab] = useState('details')

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...methodData, [field]: value })
    }
  }

  const methodTypes = [
    { value: 'inform', label: 'Inform', description: 'One-way communication' },
    { value: 'consult', label: 'Consult', description: 'Seek feedback' },
    { value: 'involve', label: 'Involve', description: 'Work together' },
    { value: 'collaborate', label: 'Collaborate', description: 'Partner in decisions' },
    { value: 'empower', label: 'Empower', description: 'Final decision-making authority' }
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
      className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4"
    >
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' && (
        !methodData?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this method is saved.</p>
        ) : (
          <AuditDetailsPanel description="How this method is labelled and classified, and when it was created.">
            <AuditCard title="Identity" description="How this method is labelled and tracked.">
              <AuditField label="Method name" value={methodData.method_name} />
              <AuditField label="Type" value={humanizeAuditToken(methodData.method_type)} />
              <AuditField label="Mandatory" value={methodData.is_mandatory ? 'Yes' : 'No'} />
            </AuditCard>
            <AuditCard title="Record history" description="When this method was created.">
              <AuditTimestampPair dateLabel="Created at" value={methodData.created_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabelWithHelp helpKey="public.cms_communication_methods.method_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Method Name <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <input
            type="text"
            value={methodData.method_name || ''}
            onChange={(e) => handleChange('method_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Status Report, Team Meeting"
            required
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.cms_communication_methods.method_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Method Type (IAP2 Spectrum) <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <select
            value={methodData.method_type || ''}
            onChange={(e) => handleChange('method_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {methodTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.cms_communication_methods.method_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
          Description <span className="text-red-500">*</span>
        </FieldLabelWithHelp>
        <textarea
          value={methodData.method_description || ''}
          onChange={(e) => handleChange('method_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication method..."
          required
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.cms_communication_methods.when_to_use" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          When to Use
        </FieldLabelWithHelp>
        <textarea
          value={methodData.when_to_use || ''}
          onChange={(e) => handleChange('when_to_use', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="When this method should be applied..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabelWithHelp helpKey="public.cms_communication_methods.entry_criteria" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Entry Criteria
          </FieldLabelWithHelp>
          <textarea
            value={methodData.entry_criteria || ''}
            onChange={(e) => handleChange('entry_criteria', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Criteria to start this method..."
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.cms_communication_methods.exit_criteria" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Exit Criteria
          </FieldLabelWithHelp>
          <textarea
            value={methodData.exit_criteria || ''}
            onChange={(e) => handleChange('exit_criteria', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Criteria to complete this method..."
          />
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.cms_communication_methods.required_participants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Required Participants
        </FieldLabelWithHelp>
        <textarea
          value={methodData.required_participants || ''}
          onChange={(e) => handleChange('required_participants', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who must participate in this method..."
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.cms_communication_methods.documentation_required" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Documentation Required
        </FieldLabelWithHelp>
        <textarea
          value={methodData.documentation_required || ''}
          onChange={(e) => handleChange('documentation_required', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What to document for this method..."
        />
      </div>

      <div className="flex items-center">
        <FieldLabelWithHelp helpKey="public.cms_communication_methods.is_mandatory" className="flex items-center">
          <input
            type="checkbox"
            checked={methodData.is_mandatory || false}
            onChange={(e) => handleChange('is_mandatory', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mandatory Method
          </span>
        </FieldLabelWithHelp>
      </div>
      </>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Method
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// v1345 slice 4: field help for this component (public.cms_communication_methods.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'method_name', 'method_type', 'method_description', 'when_to_use', 'entry_criteria', 'exit_criteria',
  'required_participants', 'documentation_required', 'is_mandatory',
].map((name) => `public.cms_communication_methods.${name}`)

export default function MethodForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <MethodFormBody {...props} />
    </FieldHelpScope>
  )
}
