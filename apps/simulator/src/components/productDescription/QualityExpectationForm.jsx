/**
 * Quality Expectation Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const QUALITY_CATEGORIES = [
  { value: 'performance', label: 'Performance' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'usability', label: 'Usability' },
  { value: 'security', label: 'Security' },
  { value: 'maintainability', label: 'Maintainability' },
  { value: 'portability', label: 'Portability' },
  { value: 'scalability', label: 'Scalability' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' }
]

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

export default function QualityExpectationForm({ expectation, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    expectation_category: 'other',
    expectation_description: '',
    priority: 'medium',
    source: '',
    standard_reference: ''
  })
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (formTab !== 'audit' || !expectation) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(supabase, [expectation.created_by, expectation.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, expectation])

  useEffect(() => {
    if (expectation) {
      setFormData({
        expectation_category: expectation.expectation_category || 'other',
        expectation_description: expectation.expectation_description || '',
        priority: expectation.priority || 'medium',
        source: expectation.source || '',
        standard_reference: expectation.standard_reference || ''
      })
    }
  }, [expectation])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.expectation_description) {
      alert('Expectation description is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' && (
        !expectation?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this quality expectation is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this quality expectation, and how it is classified.">
            <AuditCard title="Identity" description="How this quality expectation is labelled and tracked.">
              <AuditField label="Category" value={humanizeAuditToken(expectation.expectation_category)} />
              <AuditField label="Priority" value={humanizeAuditToken(expectation.priority)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this quality expectation comes from.">
              <AuditField label="Source" value={expectation.source} />
              <AuditField label="Standard reference" value={expectation.standard_reference} />
            </AuditCard>
            <AuditCard title="Record history" description="When this quality expectation was created and last changed.">
              <AuditField label="Created by" value={expectation.created_by ? auditUserLabels[expectation.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={expectation.created_at} />
              <AuditField label="Updated by" value={expectation.updated_by ? auditUserLabels[expectation.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={expectation.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={formData.expectation_category}
            onChange={(e) => setFormData({ ...formData, expectation_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {QUALITY_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
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

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expectation Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.expectation_description}
            onChange={(e) => setFormData({ ...formData, expectation_description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the quality expectation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source
          </label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Who/what is the source"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Standard Reference
          </label>
          <input
            type="text"
            value={formData.standard_reference}
            onChange={(e) => setFormData({ ...formData, standard_reference: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Related standard if any"
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
          {expectation ? 'Update' : 'Add'} Expectation
        </button>
      </div>
    </form>
  )
}
