import { Info } from 'lucide-react'

/**
 * GovernanceSection
 * Captures Governance & Authority fields for PMO project creation.
 * Executive, Funding Authority, and Approving Authority are simple text fields;
 * pre-filled from mandate when present, otherwise user enters the name.
 */
export default function GovernanceSection({
  formData,
  handleChange,
  errors,
  onAuthorityNameChange,
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
      {/* Section Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Governance & Authority
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Define project executive, board, and authority structure
        </p>
      </div>

      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Executive / Sponsor — simple text */}
          <div>
            <label htmlFor="executive_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Executive / Sponsor <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Required for authorisation)</span>
            </label>
            <input
              type="text"
              id="executive_name"
              name="executive_name"
              value={formData.executive_name || ''}
              onChange={(e) => onAuthorityNameChange('executive_name', 'executive_user_id')(e.target.value)}
              placeholder="Enter name..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.executive_user_id || errors.executive_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {(errors.executive_user_id || errors.executive_name) && (
              <p className="mt-1 text-sm text-red-600">{errors.executive_user_id || errors.executive_name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>The Executive is accountable for project success and provides direction</span>
            </p>
          </div>

          {/* Board Required */}
          <div>
            <label htmlFor="board_required" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Board Required <span className="text-red-500">*</span>
            </label>
            <select
              id="board_required"
              name="board_required"
              value={formData.board_required === true ? 'true' : formData.board_required === false ? 'false' : ''}
              onChange={(e) => {
                const value = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null
                handleChange({ target: { name: 'board_required', value } })
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.board_required ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select...</option>
              <option value="true">Yes - Board Required</option>
              <option value="false">No - Board Not Required</option>
            </select>
            {errors.board_required && (
              <p className="mt-1 text-sm text-red-600">{errors.board_required}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Project boards provide direction, oversight, and assurance for larger projects</span>
            </p>
          </div>
        </div>

        {/* Board Members Note */}
        {formData.board_required === true && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Board member assignment will be available after project authorisation.
              Typical board roles include: Senior User, Senior Supplier, and Project Executive.
            </p>
          </div>
        )}

        {/* Funding Authority — simple text */}
        <div>
          <label htmlFor="funding_authority_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Funding Authority <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="funding_authority_name"
            name="funding_authority_name"
            value={formData.funding_authority_name || ''}
            onChange={(e) => onAuthorityNameChange('funding_authority_name', 'funding_authority_user_id')(e.target.value)}
            placeholder="Enter name..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.funding_authority_user_id || errors.funding_authority_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {(errors.funding_authority_user_id || errors.funding_authority_name) && (
            <p className="mt-1 text-sm text-red-600">{errors.funding_authority_user_id || errors.funding_authority_name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Person responsible for funding decisions and budget ownership</span>
          </p>
        </div>

        {/* Approving Authority — simple text */}
        <div>
          <label htmlFor="approving_authority_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Approving Authority <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="approving_authority_name"
            name="approving_authority_name"
            value={formData.approving_authority_name || ''}
            onChange={(e) => onAuthorityNameChange('approving_authority_name', 'approving_authority_user_id')(e.target.value)}
            placeholder="Enter name..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.approving_authority_user_id || errors.approving_authority_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {(errors.approving_authority_user_id || errors.approving_authority_name) && (
            <p className="mt-1 text-sm text-red-600">{errors.approving_authority_user_id || errors.approving_authority_name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Person responsible for stage gate approvals and go/no-go decisions</span>
          </p>
        </div>

      </div>
    </div>
  )
}
