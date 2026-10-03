/**
 * BusinessCaseForm
 * Multi-section create/edit form for the Business Case document.
 * Sections are shown as tabs for clarity.
 */

import { useState, useEffect } from 'react'
import BusinessCaseFinancials from './BusinessCaseFinancials'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'

const SECTIONS = [
  { id: 'summary', label: 'Executive Summary' },
  { id: 'reasons', label: 'Reasons' },
  { id: 'options', label: 'Business Options' },
  { id: 'timescale', label: 'Timescale' },
  { id: 'costs', label: 'Costs & Investment' },
  { id: 'risks', label: 'Major Risks' },
  { id: 'disbenefits', label: 'Dis-benefits' },
]

const RECOMMENDED_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'do_nothing', label: 'Do Nothing' },
  { value: 'do_minimum', label: 'Do Minimum' },
  { value: 'do_something', label: 'Do Something' },
  { value: 'other', label: 'Other' },
]

const RISK_RATINGS = [
  { value: '', label: '— Select —' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function BusinessCaseForm({ data, onChange, errors = {} }) {
  const [activeSection, setActiveSection] = useState('summary')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeSection !== 'audit' || !data?.id) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [data.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeSection, data?.id, data?.updated_by])

  const field = (key) => ({
    value: data[key] ?? '',
    onChange: (e) => onChange({ [key]: e.target.value }),
  })

  const setListField = (key, value) => onChange({ [key]: value })

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const errorClass = 'text-xs text-red-500 mt-1'

  return (
    <div>
      {/* Section tabs */}
      <div className="mb-6">
        <DetailAuditTabList
          activeTab={activeSection}
          onChange={setActiveSection}
          ariaLabel="Business case sections"
          tabs={[
            ...SECTIONS.map((s) => ({ value: s.id, label: s.label })),
            { value: 'audit', label: 'Audit details' },
          ]}
        />
      </div>

      {activeSection === 'audit' && (
        !data?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this business case is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this business case, and how it is classified.">
            <AuditCard title="Identity" description="How this business case is labelled and tracked.">
              <AuditField label="Reference" value={data.case_reference} />
              <AuditField label="Title" value={data.case_title} />
              <AuditField label="Status" value={humanizeAuditToken(data.document_status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this business case sits.">
              <AuditField label="Overall risk rating" value={humanizeAuditToken(data.overall_risk_rating)} />
              <AuditField label="Recommended option" value={humanizeAuditToken(data.recommended_option)} />
            </AuditCard>
            <AuditCard title="Record history" description="When this business case was created and last changed.">
              <AuditField label="Created by" value={data.creator ? [data.creator.first_name, data.creator.last_name].filter(Boolean).join(' ') || data.creator.email : null} />
              <AuditTimestampPair dateLabel="Created at" value={data.created_at} />
              <AuditField label="Updated by" value={data.updated_by ? auditUserLabels[data.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={data.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {/* Section: Executive Summary */}
      {activeSection === 'summary' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Business Case Title *</label>
            <input type="text" {...field('case_title')} placeholder="A clear, concise title for this business case"
              className={`${inputClass} ${errors.case_title ? 'border-red-500' : ''}`} />
            {errors.case_title && <p className={errorClass}>{errors.case_title}</p>}
          </div>
          <div>
            <label className={labelClass}>Executive Summary</label>
            <textarea rows={4} {...field('executive_summary')}
              placeholder="A brief overview of the business case — what the project is, why it is needed, and the recommended course of action."
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Strategic Alignment</label>
            <textarea rows={3} {...field('strategic_alignment')}
              placeholder="How does this project align with organisational strategy, goals, or corporate objectives?"
              className={inputClass} />
          </div>
        </div>
      )}

      {/* Section: Reasons */}
      {activeSection === 'reasons' && (
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Reasons for the Project</label>
            <MultiLineListInput
              viewModeId="bc-reasons-for-project"
              id="bc_reasons_for_project"
              value={data.reasons_for_project || ''}
              onChange={(next) => setListField('reasons_for_project', next)}
              placeholder="Add a reason…"
              ariaLabelPrefix="reason"
              itemColumnLabel="Reason"
            />
          </div>
          <div>
            <label className={labelClass}>Problem Statement</label>
            <MultiLineListInput
              viewModeId="bc-problem-statement"
              id="bc_problem_statement"
              value={data.problem_statement || ''}
              onChange={(next) => setListField('problem_statement', next)}
              placeholder="Add a problem or opportunity point…"
              ariaLabelPrefix="problem point"
              itemColumnLabel="Problem point"
            />
          </div>
        </div>
      )}

      {/* Section: Business Options */}
      {activeSection === 'options' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Summarise the recommended option here. Use the <strong>Options</strong> tab on the view page to add detailed option comparisons.
          </p>
          <div>
            <label className={labelClass}>Recommended Option</label>
            <select {...field('recommended_option')} className={inputClass}>
              {RECOMMENDED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Option Justification</label>
            <MultiLineListInput
              viewModeId="bc-option-justification"
              id="bc_option_justification"
              value={data.option_justification || ''}
              onChange={(next) => setListField('option_justification', next)}
              placeholder="Add a justification point…"
              ariaLabelPrefix="justification"
              itemColumnLabel="Justification"
            />
          </div>
        </div>
      )}

      {/* Section: Timescale */}
      {activeSection === 'timescale' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Planned Start Date</label>
              <input type="date" {...field('start_date')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Planned End Date</label>
              <input type="date" {...field('end_date')} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Timescale Description</label>
            <textarea rows={3} {...field('timescale_description')}
              placeholder="Describe the overall timescale and any critical timing constraints."
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Key Milestones</label>
            <MultiLineListInput
              viewModeId="bc-key-milestones"
              id="bc_key_milestones"
              value={data.key_milestones || ''}
              onChange={(next) => setListField('key_milestones', next)}
              placeholder="Add a milestone with target date…"
              ariaLabelPrefix="milestone"
              itemColumnLabel="Milestone"
            />
          </div>
        </div>
      )}

      {/* Section: Costs & Investment */}
      {activeSection === 'costs' && (
        <BusinessCaseFinancials
          data={data}
          readOnly={false}
          onChange={(updates) => onChange(updates)}
        />
      )}

      {/* Section: Major Risks */}
      {activeSection === 'risks' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Major Risks Summary</label>
            <MultiLineListInput
              viewModeId="bc-major-risks"
              id="bc_major_risks"
              value={data.major_risks || ''}
              onChange={(next) => setListField('major_risks', next)}
              placeholder="Add a risk (description, likelihood, impact)…"
              ariaLabelPrefix="risk"
              itemColumnLabel="Risk"
            />
          </div>
          <div>
            <label className={labelClass}>Overall Risk Rating</label>
            <select {...field('overall_risk_rating')} className={inputClass}>
              {RISK_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Section: Dis-benefits (optional — organisation may opt out) */}
      {activeSection === 'disbenefits' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="bc_dis_benefits_included"
              type="checkbox"
              checked={data.dis_benefits_included !== false}
              onChange={(e) => onChange({ dis_benefits_included: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="bc_dis_benefits_included" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Capture dis-benefits for this business case
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Uncheck if your organisation does not track negative consequences for this case.
          </p>
          {data.dis_benefits_included !== false && (
            <div>
              <label className={labelClass}>Dis-benefits / Negative Consequences</label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Add one dis-benefit per line.
              </p>
              <MultiLineListInput
                viewModeId="bc-dis-benefits-description"
                id="bc_dis_benefits_description"
                value={data.dis_benefits_description || ''}
                onChange={(next) => setListField('dis_benefits_description', next)}
                placeholder="e.g. Temporary productivity dip during cutover"
                ariaLabelPrefix="dis-benefit"
                itemColumnLabel="Dis-benefit"
              />
            </div>
          )}
        </div>
      )}

      {/* Section navigation hint */}
      <div className="mt-6 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
        {SECTIONS.findIndex(s => s.id === activeSection) > 0 && (
          <button
            type="button"
            onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === activeSection)
              setActiveSection(SECTIONS[idx - 1].id)
            }}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ← Previous
          </button>
        )}
        <span className="mx-auto">
          Section {SECTIONS.findIndex(s => s.id === activeSection) + 1} of {SECTIONS.length}
        </span>
        {SECTIONS.findIndex(s => s.id === activeSection) < SECTIONS.length - 1 && (
          <button
            type="button"
            onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === activeSection)
              setActiveSection(SECTIONS[idx + 1].id)
            }}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
