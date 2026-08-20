/**
 * Standard Form Component
 * Add/edit communication standard form
 */

import { useState } from 'react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

export default function StandardForm({ standardData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const [formTab, setFormTab] = useState('details')

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...standardData, [field]: value })
    }
  }

  const standardTypes = [
    { value: 'branding', label: 'Branding' },
    { value: 'tone', label: 'Tone of Voice' },
    { value: 'format', label: 'Format' },
    { value: 'language', label: 'Language' },
    { value: 'accessibility', label: 'Accessibility' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'other', label: 'Other' }
  ]

  const complianceLevels = [
    { value: 'mandatory', label: 'Mandatory' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'optional', label: 'Optional' }
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
        !standardData?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this standard is saved.</p>
        ) : (
          <AuditDetailsPanel description="How this standard is labelled and classified, and when it was created.">
            <AuditCard title="Identity" description="How this standard is labelled and tracked.">
              <AuditField label="Standard name" value={standardData.standard_name} />
              <AuditField label="Type" value={humanizeAuditToken(standardData.standard_type)} />
              <AuditField label="Compliance level" value={humanizeAuditToken(standardData.compliance_level)} />
            </AuditCard>
            <AuditCard title="Record history" description="When this standard was created.">
              <AuditTimestampPair dateLabel="Created at" value={standardData.created_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Standard Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={standardData.standard_name || ''}
            onChange={(e) => handleChange('standard_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Brand Guidelines, Tone of Voice"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Standard Type <span className="text-red-500">*</span>
          </label>
          <select
            value={standardData.standard_type || ''}
            onChange={(e) => handleChange('standard_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {standardTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={standardData.standard_description || ''}
          onChange={(e) => handleChange('standard_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication standard..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Applicability
        </label>
        <textarea
          value={standardData.applicability || ''}
          onChange={(e) => handleChange('applicability', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Where this standard applies..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Compliance Level
          </label>
          <select
            value={standardData.compliance_level || 'recommended'}
            onChange={(e) => handleChange('compliance_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {complianceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template Reference
          </label>
          <input
            type="text"
            value={standardData.template_reference || ''}
            onChange={(e) => handleChange('template_reference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Link to template..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          External Link
        </label>
        <input
          type="url"
          value={standardData.external_link || ''}
          onChange={(e) => handleChange('external_link', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://..."
        />
      </div>
      </>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Standard
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
