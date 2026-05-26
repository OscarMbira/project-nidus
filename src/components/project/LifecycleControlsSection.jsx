import { useState } from 'react'
import { Info, Plus, Trash2, X } from 'lucide-react'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
function parseLines(value) {
  if (!value || typeof value !== 'string') return []
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

/**
 * LifecycleControlsSection Component
 * Captures Lifecycle & Control Configuration fields for PMO project creation
 * Phase 2 - PMO Project Creation Governance Upgrade (Tab-based UX)
 * All tolerance fields support multiple values (list add/remove/clear).
 */
export default function LifecycleControlsSection({
  formData,
  handleChange,
  errors,
  lifecycleTemplates = [],
  mode = 'all',
}) {
  const [newTime, setNewTime] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newScope, setNewScope] = useState('')
  const [newQuality, setNewQuality] = useState('')
  const [newRisk, setNewRisk] = useState('')
  const [newBenefits, setNewBenefits] = useState('')

  const timeLines = parseLines(formData.tolerance_time_days)
  const costLines = parseLines(formData.tolerance_cost_percentage)
  const scopeLines = parseLines(formData.tolerance_scope_description)
  const qualityLines = parseLines(formData.tolerance_quality_description)
  const riskLines = parseLines(formData.tolerance_risk_description)
  const benefitsLines = parseLines(formData.tolerance_benefits_description)

  const setLines = (name, lines) => {
    handleChange({ target: { name, value: lines.join('\n') } })
  }

  const showConfig = mode === 'all' || mode === 'config'
  const showTolerances = mode === 'all' || mode === 'tolerances'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
      {/* Section Content */}
      <div className="space-y-6">
        {showConfig && (
          <>
          {/* Delivery Methodology */}
          <div>
            <label htmlFor="delivery_methodology" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Methodology <span className="text-red-500">*</span>
            </label>
            <select
              id="delivery_methodology"
              name="delivery_methodology"
              value={formData.delivery_methodology || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.delivery_methodology ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Methodology...</option>
              <option value="PRINCE2">PRINCE2 (Structured)</option>
              <option value="Agile">Agile</option>
              <option value="Hybrid">Hybrid (PRINCE2 + Agile)</option>
              <option value="Waterfall">Waterfall</option>
              <option value="Structured">Structured</option>
            </select>
            {errors.delivery_methodology && (
              <p className="mt-1 text-sm text-red-600">{errors.delivery_methodology}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Primary delivery approach for this project</span>
            </p>
          </div>

          {/* Lifecycle Template */}
          <div>
            <label htmlFor="lifecycle_template" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lifecycle Template <span className="text-red-500">*</span>
            </label>
            <select
              id="lifecycle_template"
              name="lifecycle_template"
              value={formData.lifecycle_template || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.lifecycle_template ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {lifecycleTemplates.length > 0 ? 'Select Lifecycle Template...' : 'Select Lifecycle Template... (configure in PMO Admin)'}
              </option>
              {lifecycleTemplates.map((tpl, index) => (
                <option key={tpl.id} value={tpl.name}>
                  {tpl.name}
                </option>
              ))}
            </select>
            {errors.lifecycle_template && (
              <p className="mt-1 text-sm text-red-600">{errors.lifecycle_template}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Lifecycle template that will be applied to this project. Manage templates in PMO Admin → Lifecycle Templates.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stage Model */}
            <div>
              <label htmlFor="stage_model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Model <span className="text-red-500">*</span>
              </label>
              <select
                id="stage_model"
                name="stage_model"
                value={formData.stage_model || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.stage_model ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Stage Model...</option>
                <option value="fixed">Fixed (Predefined Stages)</option>
                <option value="flexible">Flexible (Adaptive Stages)</option>
              </select>
              {errors.stage_model && (
                <p className="mt-1 text-sm text-red-600">{errors.stage_model}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Fixed: stages are predefined. Flexible: stages adapt to project needs</span>
              </p>
            </div>

            {/* Stage Gate Enforcement */}
            <div>
              <label htmlFor="stage_gate_enforcement" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Gate Enforcement <span className="text-red-500">*</span>
              </label>
              <select
                id="stage_gate_enforcement"
                name="stage_gate_enforcement"
                value={formData.stage_gate_enforcement || 'required'}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.stage_gate_enforcement ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="required">Required (Hard Gate)</option>
                <option value="advisory">Advisory (Soft Gate)</option>
              </select>
              {errors.stage_gate_enforcement && (
                <p className="mt-1 text-sm text-red-600">{errors.stage_gate_enforcement}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Required: gate approval mandatory. Advisory: gate is guidance only</span>
              </p>
            </div>
          </div>
          </>
        )}

        {showTolerances && (
          <>
          {/* Tolerances */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Tolerances</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add one value per line. Use Enter or the Add button.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Time Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_time_days_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Tolerance (Days)
                </label>
                <div className="space-y-2">
                  {timeLines.length > 0 && (
                    <ul className="space-y-2">
                      {timeLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_time_days', timeLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove time tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {timeLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_time_days', []); setNewTime(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_time_days_input" value={newTime} onChange={(e) => setNewTime(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newTime.trim(); if (t) { setLines('tolerance_time_days', [...timeLines, t]); setNewTime(''); } } }} placeholder="e.g., 7 or 14 days" className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New time tolerance" />
                    <button type="button" onClick={() => { const t = newTime.trim(); if (t) { setLines('tolerance_time_days', [...timeLines, t]); setNewTime(''); } }} disabled={!newTime.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Benefits Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_benefits_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefits Tolerance (Description)
                </label>
                <div className="space-y-2">
                  {benefitsLines.length > 0 && (
                    <ul className="space-y-2">
                      {benefitsLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_benefits_description', benefitsLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove benefits tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {benefitsLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_benefits_description', []); setNewBenefits(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_benefits_input" value={newBenefits} onChange={(e) => setNewBenefits(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newBenefits.trim(); if (t) { setLines('tolerance_benefits_description', [...benefitsLines, t]); setNewBenefits(''); } } }} placeholder="Describe acceptable benefits variance (one per line)..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New benefits tolerance" />
                    <button type="button" onClick={() => { const t = newBenefits.trim(); if (t) { setLines('tolerance_benefits_description', [...benefitsLines, t]); setNewBenefits(''); } }} disabled={!newBenefits.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_cost_percentage_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Tolerance (%)
                </label>
                <div className="space-y-2">
                  {costLines.length > 0 && (
                    <ul className="space-y-2">
                      {costLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_cost_percentage', costLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove cost tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {costLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_cost_percentage', []); setNewCost(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_cost_percentage_input" value={newCost} onChange={(e) => setNewCost(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newCost.trim(); if (t) { setLines('tolerance_cost_percentage', [...costLines, t]); setNewCost(''); } } }} placeholder="e.g., 10% or 15%" className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New cost tolerance" />
                    <button type="button" onClick={() => { const t = newCost.trim(); if (t) { setLines('tolerance_cost_percentage', [...costLines, t]); setNewCost(''); } }} disabled={!newCost.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Scope Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_scope_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scope Tolerance (Description)
                </label>
                <div className="space-y-2">
                  {scopeLines.length > 0 && (
                    <ul className="space-y-2">
                      {scopeLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_scope_description', scopeLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove scope tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {scopeLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_scope_description', []); setNewScope(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_scope_input" value={newScope} onChange={(e) => setNewScope(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newScope.trim(); if (t) { setLines('tolerance_scope_description', [...scopeLines, t]); setNewScope(''); } } }} placeholder="Describe acceptable scope change (one per line)..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New scope tolerance" />
                    <button type="button" onClick={() => { const t = newScope.trim(); if (t) { setLines('tolerance_scope_description', [...scopeLines, t]); setNewScope(''); } }} disabled={!newScope.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quality Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_quality_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Tolerance (Description)
                </label>
                <div className="space-y-2">
                  {qualityLines.length > 0 && (
                    <ul className="space-y-2">
                      {qualityLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_quality_description', qualityLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove quality tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {qualityLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_quality_description', []); setNewQuality(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_quality_input" value={newQuality} onChange={(e) => setNewQuality(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newQuality.trim(); if (t) { setLines('tolerance_quality_description', [...qualityLines, t]); setNewQuality(''); } } }} placeholder="Describe acceptable quality variance (one per line)..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New quality tolerance" />
                    <button type="button" onClick={() => { const t = newQuality.trim(); if (t) { setLines('tolerance_quality_description', [...qualityLines, t]); setNewQuality(''); } }} disabled={!newQuality.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Risk Tolerance — multiple values */}
              <div>
                <label htmlFor="tolerance_risk_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Tolerance (Description)
                </label>
                <div className="space-y-2">
                  {riskLines.length > 0 && (
                    <ul className="space-y-2">
                      {riskLines.map((line, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">{line}</span>
                          <button type="button" onClick={() => setLines('tolerance_risk_description', riskLines.filter((_, i) => i !== index))} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove" aria-label={`Remove risk tolerance ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {riskLines.length > 0 && (
                    <button type="button" onClick={() => { setLines('tolerance_risk_description', []); setNewRisk(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" /> Clear all
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input type="text" id="tolerance_risk_input" value={newRisk} onChange={(e) => setNewRisk(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newRisk.trim(); if (t) { setLines('tolerance_risk_description', [...riskLines, t]); setNewRisk(''); } } }} placeholder="Describe risk threshold (one per line)..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" aria-label="New risk tolerance" />
                    <button type="button" onClick={() => { const t = newRisk.trim(); if (t) { setLines('tolerance_risk_description', [...riskLines, t]); setNewRisk(''); } }} disabled={!newRisk.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {errors?.tolerances && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.tolerances}</p>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> At least one tolerance (time or cost) must be defined for authorisation.
              </p>
            </div>
          </div>
          </>
        )}
        </div>
      </div>
  )
}
