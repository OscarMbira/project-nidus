/**
 * CMS Communication Procedure Section Component
 * Planning, Control, Assurance approaches
 */

export default function CommunicationProcedureSection({ cmsData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...cmsData, [field]: value })
    }
  }

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Planning Approach</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.communication_planning_approach || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Control Approach</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.communication_control_approach || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Assurance Approach</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.communication_assurance_approach || 'Not specified'}
          </p>
        </div>
        {cmsData?.variance_from_corporate && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Variance from Corporate Standards</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
              {cmsData.variance_from_corporate}
            </p>
            {cmsData.variance_justification && (
              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Justification</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                  {cmsData.variance_justification}
                </p>
              </div>
            )}
          </div>
        )}
        {cmsData?.corporate_communication_policy_reference && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Corporate Policy Reference</h3>
            <p className="text-gray-700 dark:text-gray-300">{cmsData.corporate_communication_policy_reference}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Communication Planning Approach <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.communication_planning_approach || ''}
          onChange={(e) => handleChange('communication_planning_approach', e.target.value)}
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.communication_planning_approach ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Describe how communication planning will be conducted..."
          required
        />
        {errors.communication_planning_approach && (
          <p className="text-red-500 text-sm mt-1">{errors.communication_planning_approach}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Communication Control Approach <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.communication_control_approach || ''}
          onChange={(e) => handleChange('communication_control_approach', e.target.value)}
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.communication_control_approach ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Describe how communication control will be managed..."
          required
        />
        {errors.communication_control_approach && (
          <p className="text-red-500 text-sm mt-1">{errors.communication_control_approach}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Communication Assurance Approach <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.communication_assurance_approach || ''}
          onChange={(e) => handleChange('communication_assurance_approach', e.target.value)}
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.communication_assurance_approach ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Describe how communication assurance will be conducted..."
          required
        />
        {errors.communication_assurance_approach && (
          <p className="text-red-500 text-sm mt-1">{errors.communication_assurance_approach}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Corporate Communication Policy Reference
        </label>
        <input
          type="text"
          value={cmsData?.corporate_communication_policy_reference || ''}
          onChange={(e) => handleChange('corporate_communication_policy_reference', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Reference to corporate communication policy..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Variance from Corporate Standards (if any)
        </label>
        <textarea
          value={cmsData?.variance_from_corporate || ''}
          onChange={(e) => handleChange('variance_from_corporate', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Any variances from corporate standards..."
        />
      </div>

      {cmsData?.variance_from_corporate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Variance Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            value={cmsData?.variance_justification || ''}
            onChange={(e) => handleChange('variance_justification', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.variance_justification ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Justify why this variance is necessary..."
            required
          />
          {errors.variance_justification && (
            <p className="text-red-500 text-sm mt-1">{errors.variance_justification}</p>
          )}
        </div>
      )}
    </div>
  )
}
