import { Info } from 'lucide-react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'

const DOC_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'missing', label: 'Not Yet Created' },
]

function DocStatusSelect({ id, label, value, onChange, error, help }) {
  return (
    <div>
      <FieldLabelWithHelp helpKey={`sim.projects.${id}`} htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} <span className="text-red-500">*</span>
      </FieldLabelWithHelp>
      <select
        id={id}
        name={id}
        value={value || ''}
        onChange={onChange}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <option value="">Select Status...</option>
        {DOC_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>{help}</span>
      </p>
    </div>
  )
}

/**
 * DocumentGovernanceSection — Project Setup document confirmation metadata.
 * Captures status of initiation-pack documents (not the document bodies).
 */
export default function DocumentGovernanceSection({ formData, handleChange, errors }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocStatusSelect
          id="mandate_status"
          label="Project Mandate Status"
          value={formData.mandate_status}
          onChange={handleChange}
          error={errors.mandate_status}
          help="Project mandate defines why the project is needed and who authorized it"
        />
        <DocStatusSelect
          id="business_case_status"
          label="Business Case Status"
          value={formData.business_case_status}
          onChange={handleChange}
          error={errors.business_case_status}
          help="Business case justifies the investment and expected ROI"
        />
        <DocStatusSelect
          id="brief_status"
          label="Project Brief / Charter Status"
          value={formData.brief_status}
          onChange={handleChange}
          error={errors.brief_status}
          help="Brief and Charter are the same record; confirms the definition document is in place"
        />
        <DocStatusSelect
          id="pid_status"
          label="Project Initiation Document (PID) Status"
          value={formData.pid_status}
          onChange={handleChange}
          error={errors.pid_status}
          help="PID is the baseline initiation pack used to start delivery"
        />
        <DocStatusSelect
          id="benefits_review_plan_status"
          label="Benefits Review Plan Status"
          value={formData.benefits_review_plan_status}
          onChange={handleChange}
          error={errors.benefits_review_plan_status}
          help="Plan for how benefits will be measured and reviewed after delivery"
        />

        <div>
          <FieldLabelWithHelp helpKey="sim.projects.funding_approval_status" htmlFor="funding_approval_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Funding Approval Document Status <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <select
            id="funding_approval_status"
            name="funding_approval_status"
            value={formData.funding_approval_status || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.funding_approval_status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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

        <div>
          <FieldLabelWithHelp helpKey="sim.projects.rfp_reference" htmlFor="rfp_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            RFP Reference <span className="text-sm text-gray-500 dark:text-gray-400">(If Applicable)</span>
          </FieldLabelWithHelp>
          <input
            type="text"
            id="rfp_reference"
            name="rfp_reference"
            value={formData.rfp_reference || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., RFP-2025-001, ITT/2025/123"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Reference to RFP/ITT if project resulted from procurement process</span>
          </p>
        </div>

        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="sim.projects.document_repository_url" htmlFor="document_repository_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Repository URL <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <input
            type="url"
            id="document_repository_url"
            name="document_repository_url"
            value={formData.document_repository_url || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.document_repository_url ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
    </div>
  )
}
