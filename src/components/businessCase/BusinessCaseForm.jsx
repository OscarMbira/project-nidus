/**
 * BusinessCaseForm
 * Multi-section create/edit form for the Business Case document (9 sections).
 * Sections are shown as tabs for clarity.
 */

import { useState } from 'react'
import BusinessCaseFinancials from './BusinessCaseFinancials'

const SECTIONS = [
  { id: 'summary', label: 'Executive Summary' },
  { id: 'reasons', label: 'Reasons' },
  { id: 'options', label: 'Business Options' },
  { id: 'timescale', label: 'Timescale' },
  { id: 'costs', label: 'Costs & Investment' },
  { id: 'risks', label: 'Major Risks' },
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

  const field = (key) => ({
    value: data[key] ?? '',
    onChange: (e) => onChange({ [key]: e.target.value }),
  })

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const errorClass = 'text-xs text-red-500 mt-1'

  return (
    <div>
      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSection === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

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
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Reasons for the Project</label>
            <textarea rows={4} {...field('reasons_for_project')}
              placeholder="Why is this project needed? What business need, problem, or opportunity is being addressed?"
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Problem Statement</label>
            <textarea rows={3} {...field('problem_statement')}
              placeholder="Describe the specific problem or opportunity in concrete terms."
              className={inputClass} />
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
            <textarea rows={4} {...field('option_justification')}
              placeholder="Why was this option selected over the alternatives? Summarise the key reasons."
              className={inputClass} />
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
            <textarea rows={4} {...field('key_milestones')}
              placeholder="List key milestones with target dates (one per line)."
              className={inputClass} />
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
            <textarea rows={5} {...field('major_risks')}
              placeholder="Summarise the key risks identified for this project. Include risk description, likelihood, and impact."
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Overall Risk Rating</label>
            <select {...field('overall_risk_rating')} className={inputClass}>
              {RISK_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
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
