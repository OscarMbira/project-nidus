import { FileText, Calendar } from 'lucide-react'
import { generateReportReference } from '../../../services/controllingStageService'
import { useEffect } from 'react'

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Select frequency' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'ad-hoc', label: 'Ad-hoc' }
]

export default function HighlightReportDocumentInfoSection({ formData, onChange, errors, mode, projectId, stageBoundaryId }) {
  useEffect(() => {
    if (mode !== 'create' || !projectId) return
    if (formData.report_reference) return
    generateReportReference(projectId, stageBoundaryId, formData.report_date || formData.reporting_period_end)
      .then((ref) => ref && onChange('report_reference', ref))
      .catch((err) => console.warn('Generate reference:', err))
  }, [projectId, stageBoundaryId, mode])

  const disabled = mode === 'view'
  const inputClass = (name) =>
    `w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
      errors?.[name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Document Information
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Version, reference, reporting frequency and period for the Highlight Report.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Title *</label>
          <input
            type="text"
            value={formData.report_title || ''}
            onChange={(e) => onChange('report_title', e.target.value)}
            disabled={disabled}
            placeholder="Highlight Report"
            className={inputClass('report_title')}
          />
          {errors?.report_title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Report Date *
          </label>
          <input
            type="date"
            value={formData.report_date || formData.reporting_period_end || ''}
            onChange={(e) => onChange('report_date', e.target.value)}
            disabled={disabled}
            max={new Date().toISOString().split('T')[0]}
            className={inputClass('report_date')}
          />
          {errors?.report_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version</label>
          <input
            type="text"
            value={formData.version_no || '1.0'}
            onChange={(e) => onChange('version_no', e.target.value)}
            disabled={disabled}
            placeholder="1.0"
            className={inputClass('version_no')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Reference</label>
          <input
            type="text"
            value={formData.report_reference || ''}
            onChange={(e) => onChange('report_reference', e.target.value)}
            disabled={disabled}
            placeholder="HLR-PROJ001-STAGE1-001"
            className={inputClass('report_reference')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
          <select
            value={formData.frequency || ''}
            onChange={(e) => onChange('frequency', e.target.value)}
            disabled={disabled}
            className={inputClass('frequency')}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Report Due</label>
          <input
            type="date"
            value={formData.next_report_due_date || ''}
            onChange={(e) => onChange('next_report_due_date', e.target.value)}
            disabled={disabled}
            className={inputClass('next_report_due_date')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reporting Period Start *</label>
          <input
            type="date"
            value={formData.reporting_period_start || ''}
            onChange={(e) => onChange('reporting_period_start', e.target.value)}
            disabled={disabled}
            className={inputClass('reporting_period_start')}
          />
          {errors?.reporting_period_start && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reporting_period_start}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reporting Period End *</label>
          <input
            type="date"
            value={formData.reporting_period_end || ''}
            onChange={(e) => onChange('reporting_period_end', e.target.value)}
            disabled={disabled}
            className={inputClass('reporting_period_end')}
          />
          {errors?.reporting_period_end && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reporting_period_end}</p>}
        </div>
      </div>
    </div>
  )
}
