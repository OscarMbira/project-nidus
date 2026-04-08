import { Info } from 'lucide-react'

/**
 * RiskComplexitySection Component
 * Captures Risk & Complexity Pre-Assessment fields for PMO project creation
 * Phase 2 - PMO Project Creation Governance Upgrade
 */
export default function RiskComplexitySection({ formData, handleChange, errors, mode = 'all' }) {
  const showRisk = mode === 'all' || mode === 'risk'
  const showResources = mode === 'all' || mode === 'resources'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Section Header — hidden on risk-only tab (page already has "Risks" title) */}
      {showResources && (
        <div className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {showRisk && showResources
                ? 'Risk & Complexity Pre-Assessment'
                : showRisk
                  ? 'Risk & Complexity'
                  : 'Resource & Capacity Indicators'}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {showRisk && showResources
                ? '(Section E)'
                : showRisk
                  ? '(Risk)'
                  : '(Resources)'}
            </span>
          </div>
        </div>
      )}

      {/* Section Content */}
      <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
          {showRisk && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initial Risk Rating */}
            <div>
              <label htmlFor="initial_risk_rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Initial Risk Rating <span className="text-red-500">*</span>
              </label>
              <select
                id="initial_risk_rating"
                name="initial_risk_rating"
                value={formData.initial_risk_rating || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.initial_risk_rating ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Risk Rating...</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
              {errors.initial_risk_rating && (
                <p className="mt-1 text-sm text-red-600">{errors.initial_risk_rating}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Initial assessment of overall project risk (detailed risk register comes later)</span>
              </p>
            </div>

            {/* Complexity Rating */}
            <div>
              <label htmlFor="complexity_rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Complexity Rating <span className="text-red-500">*</span>
              </label>
              <select
                id="complexity_rating"
                name="complexity_rating"
                value={formData.complexity_rating || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.complexity_rating ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Complexity...</option>
                <option value="low">Low Complexity</option>
                <option value="medium">Medium Complexity</option>
                <option value="high">High Complexity</option>
              </select>
              {errors.complexity_rating && (
                <p className="mt-1 text-sm text-red-600">{errors.complexity_rating}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Consider: technical complexity, integration points, team size, dependencies</span>
              </p>
            </div>
          </div>

          {/* Delivery Complexity */}
          <div>
            <label htmlFor="delivery_complexity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Complexity <span className="text-red-500">*</span>
            </label>
            <select
              id="delivery_complexity"
              name="delivery_complexity"
              value={formData.delivery_complexity || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.delivery_complexity ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Delivery Complexity...</option>
              <option value="single_vendor">Single Vendor/Team</option>
              <option value="multi_vendor">Multiple Vendors/Teams</option>
            </select>
            {errors.delivery_complexity && (
              <p className="mt-1 text-sm text-red-600">{errors.delivery_complexity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Multiple vendors increase coordination complexity</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regulatory Impact */}
            <div>
              <label htmlFor="regulatory_impact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Regulatory / Compliance Impact <span className="text-red-500">*</span>
              </label>
              <select
                id="regulatory_impact"
                name="regulatory_impact"
                value={formData.regulatory_impact === true ? 'true' : formData.regulatory_impact === false ? 'false' : ''}
                onChange={(e) => {
                  const value = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null
                  handleChange({ target: { name: 'regulatory_impact', value } })
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.regulatory_impact ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select...</option>
                <option value="true">Yes - Has Regulatory Impact</option>
                <option value="false">No - No Regulatory Impact</option>
              </select>
              {errors.regulatory_impact && (
                <p className="mt-1 text-sm text-red-600">{errors.regulatory_impact}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Does this project involve compliance, regulatory, or legal requirements?</span>
              </p>
            </div>

            {/* Data Sensitivity */}
            <div>
              <label htmlFor="data_sensitivity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Sensitivity Level <span className="text-red-500">*</span>
              </label>
              <select
                id="data_sensitivity"
                name="data_sensitivity"
                value={formData.data_sensitivity || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.data_sensitivity ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Sensitivity Level...</option>
                <option value="public">Public (No Sensitivity)</option>
                <option value="internal">Internal Use Only</option>
                <option value="confidential">Confidential</option>
              </select>
              {errors.data_sensitivity && (
                <p className="mt-1 text-sm text-red-600">{errors.data_sensitivity}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>What is the highest level of data sensitivity this project will handle?</span>
              </p>
            </div>
          </div>
          </>
          )}

          {showResources && (
          <div className={`${showRisk ? 'border-t border-gray-200 dark:border-gray-700 pt-6' : ''}`}>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Resource & Capacity Indicators <span className="text-sm text-gray-500 dark:text-gray-400">(Optional)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Estimated Effort */}
              <div>
                <label htmlFor="estimated_effort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Effort
                </label>
                <select
                  id="estimated_effort"
                  name="estimated_effort"
                  value={formData.estimated_effort || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Effort Level...</option>
                  <option value="small">Small (1-3 months, &lt;5 people)</option>
                  <option value="medium">Medium (3-6 months, 5-15 people)</option>
                  <option value="large">Large (6+ months, 15+ people)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>High-level effort estimate for capacity planning</span>
                </p>
              </div>

              {/* External Vendors Required */}
              <div>
                <label htmlFor="external_vendors_required" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  External Vendors Required
                </label>
                <select
                  id="external_vendors_required"
                  name="external_vendors_required"
                  value={formData.external_vendors_required === true ? 'true' : formData.external_vendors_required === false ? 'false' : ''}
                  onChange={(e) => {
                    const value = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null
                    handleChange({ target: { name: 'external_vendors_required', value } })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes - External Vendors Needed</option>
                  <option value="false">No - Internal Delivery Only</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Will external contractors or vendors be required?</span>
                </p>
              </div>
            </div>

            {/* Key Skills Required */}
            <div className="mb-4">
              <label htmlFor="key_skills_required" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Skills Required
              </label>
              <textarea
                id="key_skills_required"
                name="key_skills_required"
                value={formData.key_skills_required || ''}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Cloud Architecture, Data Engineering, React Development"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Critical skills/competencies needed for success</span>
              </p>
            </div>

          </div>
          )}
      </div>
    </div>
  )
}
