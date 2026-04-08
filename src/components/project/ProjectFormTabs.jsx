import { memo } from 'react'
import { CheckCircle2 } from 'lucide-react'

/**
 * ProjectFormTabs Component
 * Tab navigation for PMO Project Creation form
 * Phase 2 Enhancement - Better UX with tabs instead of accordions
 */
function ProjectFormTabs({ activeTab, setActiveTab, formData }) {
  const tabs = [
    {
      id: 'details',
      label: 'Project Details',
      description: 'Basic information'
    },
    {
      id: 'governance',
      label: 'Governance',
      description: 'Authority structure'
    },
    {
      id: 'justificationObjectives',
      label: 'Business Objectives',
      description: 'Need & alignment'
    },
    {
      id: 'justificationBenefits',
      label: 'Benefits & Ownership',
      description: 'Outcomes & owner'
    },
    {
      id: 'delivery',
      label: 'Delivery',
      description: 'Lifecycle controls'
    },
    {
      id: 'tolerances',
      label: 'Tolerances',
      description: 'Limits & thresholds'
    },
    {
      id: 'financial',
      label: 'Financial',
      description: 'Budget & funding'
    },
    {
      id: 'risks',
      label: 'Risks',
      description: 'Risk & complexity'
    },
    {
      id: 'resources',
      label: 'Resources',
      description: 'Capacity indicators'
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Compliance docs'
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      description: 'Link to portfolio'
    },
    {
      id: 'programme',
      label: 'Programme',
      description: 'Link to programme'
    }
  ]

  // Check if tab has any data entered (for completion indicator)
  const isTabStarted = (tabId) => {
    switch (tabId) {
      case 'details':
        return !!(formData.project_name || formData.project_description)

      case 'governance':
        return !!(
          formData.executive_user_id ||
          formData.executive_name ||
          formData.board_required !== null ||
          formData.funding_authority_user_id ||
          formData.funding_authority_name ||
          formData.approving_authority_user_id ||
          formData.approving_authority_name
        )

      case 'justificationObjectives':
        return !!(
          formData.business_objective ||
          formData.strategic_alignment
        )

      case 'justificationBenefits':
        return !!(
          formData.expected_benefits_summary ||
          formData.benefit_owner_user_id ||
          formData.benefit_owner_name
        )

      case 'delivery':
        return !!(
          formData.delivery_methodology ||
          formData.lifecycle_template ||
          formData.stage_model
        )

      case 'tolerances':
        return !!(
          (formData.tolerance_time_days && formData.tolerance_time_days.trim()) ||
          (formData.tolerance_cost_percentage && formData.tolerance_cost_percentage.trim()) ||
          (formData.tolerance_scope_description && formData.tolerance_scope_description.trim()) ||
          (formData.tolerance_quality_description && formData.tolerance_quality_description.trim()) ||
          (formData.tolerance_risk_description && formData.tolerance_risk_description.trim()) ||
          (formData.tolerance_benefits_description && formData.tolerance_benefits_description.trim())
        )

      case 'financial':
        return !!(
          formData.budget_type ||
          formData.budget_approval_status ||
          (Array.isArray(formData.budget_categories) && formData.budget_categories.length > 0)
        )

      case 'risks':
        return !!(
          formData.initial_risk_rating ||
          formData.complexity_rating ||
          formData.delivery_complexity ||
          formData.regulatory_impact !== null ||
          formData.data_sensitivity
        )

      case 'resources':
        return !!(
          formData.estimated_effort ||
          formData.key_skills_required ||
          formData.external_vendors_required !== null
        )

      case 'documents':
        return !!(
          formData.mandate_status ||
          formData.business_case_status ||
          formData.funding_approval_status ||
          formData.rfp_reference ||
          formData.document_repository_url
        )

      case 'portfolio':
        return !!formData.portfolio_id

      case 'programme':
        return !!formData.programme_id

      default:
        return false
    }
  }

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <p
        id="project-form-steps-heading"
        className="px-1 pt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
      >
        Steps
      </p>
      <nav
        className="grid grid-cols-2 gap-2 px-1 py-3 sm:grid-cols-3 lg:grid-cols-4"
        aria-labelledby="project-form-steps-heading"
        aria-label="Project creation steps"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          const hasData = isTabStarted(tab.id)
          const stepNum = index + 1

          const statusParts = []
          if (isActive) statusParts.push('current step')
          if (hasData) statusParts.push('has saved progress')
          const ariaStatus = statusParts.length ? `. ${statusParts.join(', ')}.` : ''

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${stepNum} of ${tabs.length}: ${tab.label}. ${tab.description}${ariaStatus}`}
              className={`
                group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                dark:border-gray-700 dark:focus-visible:ring-offset-gray-900
                ${isActive
                  ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/35'
                  : 'border-gray-200 bg-gray-50/80 hover:border-gray-300 hover:bg-gray-100/90 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600 dark:hover:bg-gray-800/70'
                }
              `}
            >
              <span
                className={`
                  mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums
                  ${hasData
                    ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : isActive
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {hasData ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <span aria-hidden>{stepNum}</span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`
                    block text-sm font-semibold leading-snug
                    ${isActive
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-800 dark:text-gray-100'
                    }
                  `}
                >
                  {tab.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">
                  {tab.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default memo(ProjectFormTabs)
