/**
 * Practice Business Case View Page
 * Read-only full view of a practice business case.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, FileText } from 'lucide-react'
import { getPracticeBusinessCaseById } from '../../services/sim/practiceBusinessCaseService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const STATUS_COLORS = {
  draft: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  refined: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  under_review: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  archived: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

const EXPORT_SECTIONS = [
  { title: 'Business Case', fields: [
    { key: 'case_reference', label: 'Reference' },
    { key: 'case_title', label: 'Title' },
    { key: 'lifecycle_stage', label: 'Status' },
    { key: 'document_version', label: 'Version' },
    { key: 'case_description', label: 'Executive Summary' },
    { key: 'business_justification', label: 'Business Justification' },
    { key: 'recommended_option', label: 'Recommended Option' },
    { key: 'option_justification', label: 'Option Justification' },
    { key: 'estimated_cost', label: 'Estimated Cost' },
    { key: 'estimated_benefits', label: 'Estimated Benefits' },
    { key: 'net_present_value', label: 'NPV' },
    { key: 'return_on_investment', label: 'ROI (%)' },
    { key: 'payback_period_months', label: 'Payback Period (months)' },
    { key: 'expected_risks', label: 'Major Risks' },
    { key: 'expected_benefits', label: 'Expected Benefits' },
  ]}
]

function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">{title}</h2>
      <dl className="space-y-4">{children}</dl>
    </div>
  )
}

export default function PracticeBusinessCaseView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseItem, setCaseItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCase()
  }, [id])

  const loadCase = async () => {
    try {
      setLoading(true)
      const result = await getPracticeBusinessCaseById(id)
      if (result.success) {
        setCaseItem(result.data)
      } else {
        setError(result.error || 'Business case not found')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !caseItem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error || 'Business case not found'}</p>
        <button onClick={() => navigate('/simulator/practice-business-cases')} className="mt-4 text-blue-600 hover:underline text-sm">
          Back to list
        </button>
      </div>
    )
  }

  const options = Array.isArray(caseItem.options_considered) ? caseItem.options_considered : []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate('/simulator/practice-business-cases')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
      </button>

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <FileText className="w-7 h-7 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{caseItem.case_title}</h1>
            <div className="flex items-center gap-3 mt-1">
              {caseItem.case_reference && (
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{caseItem.case_reference}</span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[caseItem.lifecycle_stage] || STATUS_COLORS.draft}`}>
                {caseItem.lifecycle_stage?.replace('_', ' ') || 'draft'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">v{caseItem.document_version || 1}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportWord={() => exportRecordToWord(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportExcel={() => exportRecordToExcel(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportCSV={() => exportRecordToCSV(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportXML={() => exportRecordToXML(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportJSON={() => exportRecordToJSON(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
            onExportPrint={() => exportRecordToPrint(EXPORT_SECTIONS, caseItem, `PracticeBC_${caseItem.case_reference || id}`)}
          />
          <button
            onClick={() => navigate(`/simulator/practice-business-cases/${id}/edit`)}
            className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
        </div>
      </div>

      {/* Sections */}
      <Section title="Executive Summary">
        <Field label="Summary" value={caseItem.case_description} />
      </Section>

      <Section title="Reasons">
        <Field label="Business Justification" value={caseItem.business_justification} />
      </Section>

      <Section title="Business Options">
        {options.length > 0 ? (
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.title}</span>
                  {opt.is_recommended && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">Recommended</span>
                  )}
                </div>
                {opt.description && <p className="text-xs text-gray-600 dark:text-gray-400">{opt.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No options recorded</p>
        )}
        <Field label="Recommended Option" value={caseItem.recommended_option} />
        <Field label="Option Justification" value={caseItem.option_justification} />
      </Section>

      <Section title="Timescale">
        {caseItem.target_start_date || caseItem.target_end_date ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target Start Date" value={caseItem.target_start_date ? new Date(caseItem.target_start_date).toLocaleDateString() : null} />
            <Field label="Target End Date" value={caseItem.target_end_date ? new Date(caseItem.target_end_date).toLocaleDateString() : null} />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No timescale recorded</p>
        )}
      </Section>

      <Section title="Costs & Investment">
        <div className="grid grid-cols-2 gap-4">
          {caseItem.estimated_cost != null && (
            <Field label="Estimated Cost" value={`$${Number(caseItem.estimated_cost).toLocaleString()}`} />
          )}
          {caseItem.estimated_benefits != null && (
            <Field label="Estimated Benefits" value={`$${Number(caseItem.estimated_benefits).toLocaleString()}`} />
          )}
          {caseItem.net_present_value != null && (
            <Field label="Net Present Value" value={`$${Number(caseItem.net_present_value).toLocaleString()}`} />
          )}
          {caseItem.return_on_investment != null && (
            <Field label="Return on Investment" value={`${caseItem.return_on_investment}%`} />
          )}
          {caseItem.payback_period_months != null && (
            <Field label="Payback Period" value={`${caseItem.payback_period_months} months`} />
          )}
        </div>
        <Field label="Cost Notes" value={caseItem.expected_costs} />
      </Section>

      <Section title="Major Risks & Benefits">
        <Field label="Expected Risks" value={caseItem.expected_risks} />
        <Field label="Expected Benefits" value={caseItem.expected_benefits} />
      </Section>

      {/* Meta */}
      <div className="text-xs text-gray-400 dark:text-gray-600">
        Created: {caseItem.created_at ? new Date(caseItem.created_at).toLocaleString() : '—'}
        {caseItem.updated_at && ` · Updated: ${new Date(caseItem.updated_at).toLocaleString()}`}
        {caseItem.practice_projects?.project_name && ` · Project: ${caseItem.practice_projects.project_name}`}
      </div>
    </div>
  )
}
