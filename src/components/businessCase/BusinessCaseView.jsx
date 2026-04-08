/**
 * BusinessCaseView
 * Read-only, multi-section view of a Business Case record.
 * Used inside the BusinessCaseView page.
 */

import BusinessCaseFinancials from './BusinessCaseFinancials'
import BusinessCaseOptions from './BusinessCaseOptions'
import BusinessCaseBenefits from './BusinessCaseBenefits'
import BusinessCaseDisBenefits from './BusinessCaseDisBenefits'
import BusinessCaseApprovals from './BusinessCaseApprovals'
import BusinessCaseRevisionHistory from './BusinessCaseRevisionHistory'
import BusinessCaseDistribution from './BusinessCaseDistribution'
import BusinessCaseStatusBadge from './BusinessCaseStatusBadge'

const RISK_COLORS = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-red-600 dark:text-red-400',
  critical: 'text-red-800 dark:text-red-300 font-bold',
}

function Section({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, value, multiline = false }) {
  if (!value) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {multiline
        ? <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{value}</p>
        : <p className="text-sm text-gray-900 dark:text-white">{value}</p>
      }
    </div>
  )
}

export default function BusinessCaseViewComponent({
  businessCase,
  canApprove = false,
  onRefresh,
}) {
  if (!businessCase) return null

  const OPTION_LABELS = {
    do_nothing: 'Do Nothing',
    do_minimum: 'Do Minimum',
    do_something: 'Do Something',
    other: 'Other',
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Section title="Document Information">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Reference</p>
            <p className="font-semibold text-gray-900 dark:text-white">{businessCase.case_reference}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Version</p>
            <p className="font-medium text-gray-900 dark:text-white">{businessCase.version_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Status</p>
            <BusinessCaseStatusBadge status={businessCase.document_status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Created</p>
            <p className="text-gray-900 dark:text-white">{businessCase.created_date}</p>
          </div>
          {businessCase.projects?.name && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Project</p>
              <p className="text-gray-900 dark:text-white">{businessCase.projects.name}</p>
            </div>
          )}
          {businessCase.programmes?.name && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Programme</p>
              <p className="text-gray-900 dark:text-white">{businessCase.programmes.name}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Section 1: Executive Summary */}
      <Section title="Section 1 — Executive Summary">
        <Field label="Executive Summary" value={businessCase.executive_summary} multiline />
        <Field label="Strategic Alignment" value={businessCase.strategic_alignment} multiline />
      </Section>

      {/* Section 2: Reasons */}
      <Section title="Section 2 — Reasons for the Project">
        <Field label="Reasons" value={businessCase.reasons_for_project} multiline />
        <Field label="Problem Statement" value={businessCase.problem_statement} multiline />
      </Section>

      {/* Section 3: Business Options */}
      <Section title="Section 3 — Business Options">
        {businessCase.recommended_option && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase mb-1">Recommended Option</p>
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              {OPTION_LABELS[businessCase.recommended_option] || businessCase.recommended_option}
            </p>
          </div>
        )}
        <Field label="Option Justification" value={businessCase.option_justification} multiline />

        {/* Detailed options comparison */}
        {businessCase.options?.length > 0 && (
          <div className="mt-4">
            <BusinessCaseOptions
              caseId={businessCase.id}
              options={businessCase.options}
              readOnly
            />
          </div>
        )}
      </Section>

      {/* Section 4: Expected Benefits */}
      <Section title="Section 4 — Expected Benefits">
        {businessCase.benefits?.length > 0
          ? <BusinessCaseBenefits caseId={businessCase.id} benefits={businessCase.benefits} readOnly />
          : <p className="text-sm text-gray-500 dark:text-gray-400 italic">No benefits recorded.</p>
        }
      </Section>

      {/* Section 5: Dis-benefits */}
      <Section title="Section 5 — Dis-benefits / Negative Consequences">
        {businessCase.dis_benefits?.length > 0
          ? <BusinessCaseDisBenefits caseId={businessCase.id} disBenefits={businessCase.dis_benefits} readOnly />
          : <p className="text-sm text-gray-500 dark:text-gray-400 italic">No dis-benefits recorded.</p>
        }
      </Section>

      {/* Section 6: Timescale */}
      <Section title="Section 6 — Timescale">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Planned Start Date" value={businessCase.start_date} />
          <Field label="Planned End Date" value={businessCase.end_date} />
        </div>
        <Field label="Timescale Description" value={businessCase.timescale_description} multiline />
        <Field label="Key Milestones" value={businessCase.key_milestones} multiline />
      </Section>

      {/* Section 7 & 8: Costs & Investment Appraisal */}
      <Section title="Section 7–8 — Costs & Investment Appraisal">
        <BusinessCaseFinancials data={businessCase} readOnly />
      </Section>

      {/* Section 9: Major Risks */}
      <Section title="Section 9 — Major Risks">
        {businessCase.overall_risk_rating && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Overall Risk Rating</p>
            <p className={`text-sm font-semibold uppercase ${RISK_COLORS[businessCase.overall_risk_rating]}`}>
              {businessCase.overall_risk_rating}
            </p>
          </div>
        )}
        <Field label="Major Risks Summary" value={businessCase.major_risks} multiline />
      </Section>

      {/* Approvals */}
      <Section title="Approval History">
        <BusinessCaseApprovals
          caseId={businessCase.id}
          canApprove={canApprove}
          caseTitle={businessCase.case_title}
        />
      </Section>

      {/* Revision History */}
      <Section title="Revision History">
        <BusinessCaseRevisionHistory caseId={businessCase.id} />
      </Section>

      {/* Distribution */}
      <Section title="Distribution List">
        <BusinessCaseDistribution caseId={businessCase.id} readOnly />
      </Section>
    </div>
  )
}
