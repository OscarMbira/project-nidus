import { FileText, Calendar } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { generateReportReference } from '../../../services/controllingStageService'
import { useEffect } from 'react'

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
const FREQUENCY_OPTIONS = [
  { value: '', label: 'Select frequency' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'ad-hoc', label: 'Ad-hoc' }
]

function HighlightReportDocumentInfoSectionBody({ formData, onChange, errors, mode, projectId, stageBoundaryId }) {
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.report_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>Report Title *</FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.report_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            <Calendar className="h-4 w-4 inline mr-1" />
            Report Date *
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.version_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version</FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.report_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Reference</FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</FieldLabelWithHelp>
          <select
            value={formData.frequency || ''}
            onChange={(e) => onChange('frequency', e.target.value)}
            disabled={disabled}
            className={inputClass('frequency')}
          >
            {FREQUENCY_OPTIONS.map((o, index) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabelWithHelp helpKey="public.highlight_reports.next_report_due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Report Due</FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.reporting_period_start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>Reporting Period Start *</FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.highlight_reports.reporting_period_end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>Reporting Period End *</FieldLabelWithHelp>
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

// v1345 slice 4: field help for this component (public.highlight_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'report_title', 'report_date', 'version_no', 'report_reference', 'frequency', 'next_report_due_date',
  'reporting_period_start', 'reporting_period_end',
].map((name) => `public.highlight_reports.${name}`)

export default function HighlightReportDocumentInfoSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <HighlightReportDocumentInfoSectionBody {...props} />
    </FieldHelpScope>
  )
}
