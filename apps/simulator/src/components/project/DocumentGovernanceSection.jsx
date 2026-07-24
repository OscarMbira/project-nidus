import { Info } from 'lucide-react'

/**
 * DocumentGovernanceSection Component
 * Captures Document Governance Metadata fields for PMO project creation
 * Phase 2 - PMO Project Creation Governance Upgrade
 * NOTE: This section captures METADATA only - no document content or uploads
 */
export default function DocumentGovernanceSection({ formData, handleChange, errors }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Mandate Status */}
            <div>
              <label htmlFor="mandate_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Mandate Status <span className="text-red-500">*</span>
              </label>
              <select
                id="mandate_status"
                name="mandate_status"
                value={formData.mandate_status || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.mandate_status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Status...</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="missing">Not Yet Created</option>
              </select>
              {errors.mandate_status && (
                <p className="mt-1 text-sm text-red-600">{errors.mandate_status}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Project mandate defines why the project is needed and who authorized it</span>
              </p>
            </div>

            {/* Business Case Status */}
            <div>
              <label htmlFor="business_case_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Case Status <span className="text-red-500">*</span>
              </label>
              <select
                id="business_case_status"
                name="business_case_status"
                value={formData.business_case_status || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.business_case_status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Status...</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="missing">Not Yet Created</option>
              </select>
              {errors.business_case_status && (
                <p className="mt-1 text-sm text-red-600">{errors.business_case_status}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Business case justifies the investment and expected ROI</span>
              </p>
            </div>
          </div>

          {/* Funding Approval Status */}
          <div>
            <label htmlFor="funding_approval_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Funding Approval Document Status <span className="text-red-500">*</span>
            </label>
            <select
              id="funding_approval_status"
              name="funding_approval_status"
              value={formData.funding_approval_status || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.funding_approval_status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Status...</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {errors.funding_approval_status && (
              <p className="mt-1 text-sm text-red-600">{errors.funding_approval_status}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Status of formal funding approval documentation</span>
            </p>
          </div>

          {/* RFP Reference (Conditional) */}
          <div>
            <label htmlFor="rfp_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              RFP Reference <span className="text-sm text-gray-500 dark:text-gray-400">(If Applicable)</span>
            </label>
            <input
              type="text"
              id="rfp_reference"
              name="rfp_reference"
              value={formData.rfp_reference || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., RFP-2025-001, ITT/2025/123"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Reference to RFP/ITT if project resulted from procurement process</span>
            </p>
          </div>

          {/* Document Repository URL */}
          <div>
            <label htmlFor="document_repository_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="document_repository_url"
              name="document_repository_url"
              value={formData.document_repository_url || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.document_repository_url ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://sharepoint.company.com/projects/..."
            />
            {errors.document_repository_url && (
              <p className="mt-1 text-sm text-red-600">{errors.document_repository_url}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Link to SharePoint, Google Drive, or other document storage location</span>
            </p>
          </div>
        
    </div>
  )
}
