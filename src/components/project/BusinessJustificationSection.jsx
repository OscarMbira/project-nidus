import { useState } from 'react'
import { Info, Plus, Trash2, X } from 'lucide-react'

// Parse newline-separated objectives into trimmed, non-empty lines
function parseObjectiveLines(value) {
  if (!value || typeof value !== 'string') return []
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
}

/**
 * BusinessJustificationSection
 * Captures Business Justification fields for PMO project creation.
 * Supports pre-fill from mandate and named (non-registered) contact addition.
 */
export default function BusinessJustificationSection({
  formData,
  handleChange,
  errors,
  organisationUsers = [],
  fromMandate = null,
  onAuthorityUserChange,
  onAddNamedContact,
  mode = 'all',
}) {
  const [newObjective, setNewObjective] = useState('')
  const [newBenefit, setNewBenefit] = useState('')

  const objectiveLines = parseObjectiveLines(formData.business_objective)
  const benefitLines = parseObjectiveLines(formData.expected_benefits_summary)

  const setBusinessObjectiveLines = (lines) => {
    handleChange({
      target: {
        name: 'business_objective',
        value: lines.join('\n')
      }
    })
  }

  const addObjective = () => {
    const trimmed = newObjective.trim()
    if (!trimmed) return
    setBusinessObjectiveLines([...objectiveLines, trimmed])
    setNewObjective('')
  }

  const removeObjective = (index) => {
    const next = objectiveLines.filter((_, i) => i !== index)
    setBusinessObjectiveLines(next)
  }

  const clearAllObjectives = () => {
    setBusinessObjectiveLines([])
    setNewObjective('')
  }

  const setBenefitLines = (lines) => {
    handleChange({
      target: {
        name: 'expected_benefits_summary',
        value: lines.join('\n'),
      },
    })
  }

  const addBenefit = () => {
    const trimmed = newBenefit.trim()
    if (!trimmed) return
    setBenefitLines([...benefitLines, trimmed])
    setNewBenefit('')
  }

  const removeBenefit = (index) => {
    const next = benefitLines.filter((_, i) => i !== index)
    setBenefitLines(next)
  }

  const clearAllBenefits = () => {
    setBenefitLines([])
    setNewBenefit('')
  }

  const showObjectives = mode === 'all' || mode === 'objectives'
  const showBenefits = mode === 'all' || mode === 'benefits'
  const headerTitle = showObjectives && showBenefits
    ? 'Business Justification'
    : showBenefits
      ? 'Benefits'
      : 'Business Objectives'
  const headerDescription = showObjectives && showBenefits
    ? 'Define business objectives, strategic alignment, and expected benefits'
    : showBenefits
      ? 'Define expected benefits and ownership'
      : 'Define business objectives and strategic alignment'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
      {/* Section Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {headerTitle}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {headerDescription}
        </p>
      </div>

      <div className="space-y-6">

        {/* Benefit Owner — simple text field, no dropdown */}
        {showBenefits && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benefit Owner <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="benefit_owner_name"
            name="benefit_owner_name"
            value={formData.benefit_owner_name || ''}
            onChange={(e) => {
              const value = e.target.value
              // Update name and clear any linked user_id so this is purely text-based
              handleChange({ target: { name: 'benefit_owner_name', value } })
              handleChange({ target: { name: 'benefit_owner_user_id', value: '' } })
            }}
            placeholder="Enter Benefit Owner's name..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              (errors.benefit_owner_name || errors.benefit_owner_user_id) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {(errors.benefit_owner_name || errors.benefit_owner_user_id) && (
            <p className="mt-1 text-sm text-red-600">
              {errors.benefit_owner_name || errors.benefit_owner_user_id}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Person responsible for ensuring benefits are realized and measured.</span>
          </p>
        </div>
        )}

        {/* Business Objective — one item per line with add/remove/clear controls */}
        {showObjectives && (
        <div>
          <label htmlFor="business_objective" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Objective / Problem Statement <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Defaults from Mandate Project Objectives (4) when available — one objective per line. You can add more items or remove any that no longer apply.
          </p>
          <div className="space-y-2">
            {objectiveLines.length > 0 && (
              <ul className="space-y-2">
                {objectiveLines.map((line, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                  >
                    <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                      {line}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeObjective(index)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove this objective"
                      aria-label={`Remove objective ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {objectiveLines.length > 0 && (
              <button
                type="button"
                onClick={clearAllObjectives}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear all objectives
              </button>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                id="business_objective"
                name="business_objective_input"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addObjective()
                  }
                }}
                placeholder="Add an objective (one per line)..."
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.business_objective ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                aria-label="New objective"
              />
              <button
                type="button"
                onClick={addObjective}
                disabled={!newObjective.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add objective
              </button>
            </div>
          </div>
          {errors.business_objective && (
            <p className="mt-1 text-sm text-red-600">{errors.business_objective}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>What business problem are we solving? Why is this project necessary?</span>
          </p>
        </div>
        )}

        {/* Strategic Alignment */}
        {showObjectives && (
        <div>
          <label htmlFor="strategic_alignment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Strategic Alignment <span className="text-red-500">*</span>
          </label>
          <textarea
            id="strategic_alignment"
            name="strategic_alignment"
            value={formData.strategic_alignment || ''}
            onChange={handleChange}
            rows={5}
            className={`w-full min-h-[7rem] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y ${
              errors.strategic_alignment ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Digital Transformation Strategy, Cost Reduction Initiative, Customer Experience"
          />
          {errors.strategic_alignment && (
            <p className="mt-1 text-sm text-red-600">{errors.strategic_alignment}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>How does this project align to organizational strategy?</span>
          </p>
        </div>
        )}

        {/* Expected Benefits Summary — multiple high-level benefits (one per line) */}
        {showBenefits && (
        <div>
          <label htmlFor="expected_benefits_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expected Benefits (High Level) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Summarize the key benefits this project will deliver — one benefit per line. You can add more items or remove any that no longer apply.
          </p>
          <div className="space-y-2">
            {benefitLines.length > 0 && (
              <ul className="space-y-2">
                {benefitLines.map((line, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                  >
                    <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                      {line}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove this benefit"
                      aria-label={`Remove benefit ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {benefitLines.length > 0 && (
              <button
                type="button"
                onClick={clearAllBenefits}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear all benefits
              </button>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                id="expected_benefits_summary"
                name="expected_benefits_summary_input"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addBenefit()
                  }
                }}
                placeholder="Add a benefit (one per line)..."
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.expected_benefits_summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                aria-label="New benefit"
              />
              <button
                type="button"
                onClick={addBenefit}
                disabled={!newBenefit.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add benefit
              </button>
            </div>
          </div>
          {errors.expected_benefits_summary && (
            <p className="mt-1 text-sm text-red-600">{errors.expected_benefits_summary}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>What measurable outcomes will this project deliver?</span>
          </p>
        </div>
        )}

      </div>
    </div>
  )
}
