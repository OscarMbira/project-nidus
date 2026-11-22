import { memo } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import SearchableSelect from '@nidus/ui/SearchableSelect'
import GovernanceSection from './GovernanceSection'
import BusinessJustificationSection from './BusinessJustificationSection'
import LifecycleControlsSection from './LifecycleControlsSection'
import FinancialControlsSection from './FinancialControlsSection'
import RiskComplexitySection from './RiskComplexitySection'
import DocumentGovernanceSection from './DocumentGovernanceSection'
import PortfolioAssignmentSection from './PortfolioAssignmentSection'
import ProgrammeAssignmentSection from './ProgrammeAssignmentSection'
import MultiLineListInput from './MultiLineListInput'
import StakeholderQuickCaptureSection from './StakeholderQuickCaptureSection'
import MilestoneQuickCaptureSection from './MilestoneQuickCaptureSection'
import { Briefcase, Network } from 'lucide-react'

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'
/** v1345 slice 3: help keys for every wizard field (public.projects.<column>; list steps use their heading). */
const PROJECT_WIZARD_HELP_KEYS = [
  'project_code', 'project_name', 'project_description', 'project_type_id', 'project_status_id', 'industries',
  'success_criteria', 'project_classification', 'project_objectives', 'priority', 'billing_type', 'project_manager_user_id',
  'start_date', 'end_date', 'executive_name', 'board_required', 'funding_authority_name', 'approving_authority_name',
  'benefit_owner_name', 'business_objective', 'strategic_alignment', 'expected_benefits_summary',
  'delivery_methodology', 'lifecycle_template', 'stage_model', 'stage_gate_enforcement', 'tolerance_time_days',
  'tolerance_benefits_description', 'tolerance_cost_percentage', 'tolerance_scope_description', 'tolerance_quality_description',
  'tolerance_risk_description', 'budget_currency', 'budget_type', 'budget_categories', 'budget_approval_status',
  'initial_risk_rating', 'complexity_rating', 'delivery_complexity', 'regulatory_impact', 'data_sensitivity',
  'estimated_effort', 'external_vendors_required', 'key_skills_required', 'portfolio_id', 'programme_id',
  'project_constraints', 'project_assumptions', 'key_deliverables', 'wizard_stakeholders', 'wizard_milestones', 'required_approvals',
  'mandate_status', 'business_case_status', 'brief_status', 'pid_status', 'benefits_review_plan_status',
  'funding_approval_status', 'rfp_reference', 'document_repository_url',
].map((name) => `public.projects.${name}`)

/**
 * Shared 12-step body for Create / Edit / View project wizard.
 * @param {'create'|'edit'|'view'} mode — view: read-only fields + summary-only portfolio/programme
 */
function ProjectWizardPanels({
  mode = 'edit',
  activeTab,
  formData,
  errors,
  handleChange,
  projectTypeOptions,
  statusOptions,
  industryOptions = [],
  selectedIndustryIds = [],
  primaryIndustryId = null,
  onToggleIndustry,
  onSetPrimaryIndustry,
  handleProjectTypeChange,
  handleProjectStatusChange,
  handleAuthorityNameChange,
  lifecycleTemplates,
  fundingSources,
  budgetCategories,
  handleBudgetCategoriesChange,
  selectedPortfolioId,
  selectedPortfolio,
  onPortfolioChange,
  selectedProgrammeId,
  selectedProgramme,
  onProgrammeChange,
  portfolioReadOnlySummary,
  programmeReadOnlySummary,
  stakeholderRows = [],
  onAddStakeholder,
  onRemoveStakeholder,
  addingStakeholder = false,
  milestoneRows = [],
  onAddMilestone,
  onRemoveMilestone,
  addingMilestone = false,
  // v1344 (A1 / A2): option lists from project_attribute_options (SQL v1480) and the PM field
  attributeOptions = { priority: [], billing_type: [], classification: [] },
  projectManager = { canChange: false, options: [], currentName: '' },
}) {
  const isView = mode === 'view'
  // A stored value missing from the list still shows (e.g. a retired option).
  const withCurrent = (opts, value) =>
    value && !(opts || []).some((o) => o.value === value) ? [...(opts || []), { value, label: value }] : (opts || [])
  const classificationOptions = withCurrent(attributeOptions.classification, formData.project_classification)
  const billingOptions = withCurrent(attributeOptions.billing_type, formData.billing_type)
  const priorityOptions = withCurrent(attributeOptions.priority, formData.priority)

  return (
    <FieldHelpScope helpKeys={PROJECT_WIZARD_HELP_KEYS}>
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Project Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Basic project information to identify and describe your project.
            </p>
          </div>

          <fieldset disabled={isView} className="min-w-0 space-y-6 border-0 p-0">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FieldLabelWithHelp helpKey="public.projects.project_code" htmlFor="project_code" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Code (Optional)
                </FieldLabelWithHelp>
                <input
                  type="text"
                  id="project_code"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  placeholder="e.g., PRJ-2025-001"
                  autoFocus={!isView}
                  readOnly={isView}
                  className={`w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${isView ? 'cursor-default' : ''}`}
                />
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.projects.project_name" htmlFor="project_name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" required>
                  Project Name <span className="text-red-500">*</span>
                </FieldLabelWithHelp>
                <input
                  type="text"
                  id="project_name"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                  required={!isView}
                  readOnly={isView}
                  className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.project_name ? 'border-red-500' : 'border-gray-300'
                  } focus:border-blue-500 dark:border-gray-600 ${isView ? 'cursor-default' : ''}`}
                />
                {errors.project_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_name}</p>
                )}
              </div>
            </div>

            <div>
              <FieldLabelWithHelp helpKey="public.projects.project_description" htmlFor="project_description" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Description
              </FieldLabelWithHelp>
              <textarea
                id="project_description"
                name="project_description"
                value={formData.project_description}
                onChange={handleChange}
                rows={4}
                readOnly={isView}
                className={`w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${isView ? 'cursor-default' : ''}`}
                placeholder="Describe your project..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FieldLabelWithHelp helpKey="public.projects.project_type_id" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" required>
                  Project Type <span className="text-red-500">*</span>
                </FieldLabelWithHelp>
                <SearchableSelect
                  options={projectTypeOptions}
                  value={formData.project_type_id}
                  onChange={handleProjectTypeChange}
                  placeholder="Select a project type"
                  searchPlaceholder="Search project types..."
                  required={!isView}
                  disabled={isView}
                  className={errors.project_type_id ? 'border-red-500' : ''}
                />
                {errors.project_type_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_type_id}</p>
                )}
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.projects.project_status_id" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" required>
                  {mode === 'create' ? 'Initial Status' : 'Status'} <span className="text-red-500">*</span>
                </FieldLabelWithHelp>
                <SearchableSelect
                  options={statusOptions}
                  value={formData.project_status_id}
                  onChange={handleProjectStatusChange}
                  placeholder="Select a status"
                  searchPlaceholder="Search statuses..."
                  required={!isView}
                  disabled={isView}
                  className={errors.project_status_id ? 'border-red-500' : ''}
                />
                {errors.project_status_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_status_id}</p>
                )}
              </div>
            </div>

            <div>
              <FieldLabelWithHelp helpKey="public.projects.industries" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Industry / Sector
              </FieldLabelWithHelp>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Which of your organisation's industries this project spans — tick as many as apply
                (e.g. a software delivery project for a banking client is both). Mark one as
                Primary; it drives the sidebar's default industry section and the built-in role
                picker's default filter. Configure available industries in PMO Admin →
                Organisation Industries.
              </p>
              {industryOptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No industries configured for this organisation.</p>
              ) : (
                <div className="space-y-1.5 rounded-lg border border-gray-300 dark:border-gray-600 p-3">
                  {industryOptions.map((opt) => {
                    const checked = selectedIndustryIds.includes(opt.value)
                    const isPrimary = checked && primaryIndustryId === opt.value
                    return (
                      <div key={opt.value} className="flex items-center justify-between gap-3">
                        <label data-help="exempt" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isView}
                            onChange={() => onToggleIndustry?.(opt.value)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600"
                          />
                          {opt.label}
                        </label>
                        {checked && (
                          isPrimary ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                              Primary
                            </span>
                          ) : (
                            !isView && (
                              <button
                                type="button"
                                onClick={() => onSetPrimaryIndustry?.(opt.value)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Set as primary
                              </button>
                            )
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <FieldLabelWithHelp helpKey="public.projects.success_criteria" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Success Criteria
              </FieldLabelWithHelp>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                How success will be measured for this project. Add one per line.
              </p>
              <MultiLineListInput
                id="success_criteria_input"
                value={formData.success_criteria}
                onChange={(v) => handleChange({ target: { name: 'success_criteria', value: v } })}
                placeholder="e.g. Core banking platform live with zero critical defects..."
                ariaLabelPrefix="success criterion"
                disabled={isView}
              />
            </div>

            <div>
              <FieldLabelWithHelp helpKey="public.projects.project_classification" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Classification
              </FieldLabelWithHelp>
              <select
                value={formData.project_classification}
                onChange={(e) => handleChange({ target: { name: 'project_classification', value: e.target.value } })}
                disabled={isView}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a classification</option>
                {classificationOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                How central this project is to organisational strategy versus routine delivery.
              </p>
            </div>

            <div>
              <FieldLabelWithHelp helpKey="public.projects.project_objectives" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Objectives
              </FieldLabelWithHelp>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                What the project will achieve. Add one objective per line.
              </p>
              <MultiLineListInput
                id="project_objectives_input"
                value={formData.project_objectives}
                onChange={(v) => handleChange({ target: { name: 'project_objectives', value: v } })}
                placeholder="e.g. Migrate all retail accounts with zero data loss"
                ariaLabelPrefix="objective"
                disabled={isView}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FieldLabelWithHelp helpKey="public.projects.priority" htmlFor="priority" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </FieldLabelWithHelp>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleChange({ target: { name: 'priority', value: e.target.value } })}
                  disabled={isView}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Not set</option>
                  {priorityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.projects.billing_type" htmlFor="billing_type" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Billing Type
                </FieldLabelWithHelp>
                <select
                  id="billing_type"
                  value={formData.billing_type}
                  onChange={(e) => handleChange({ target: { name: 'billing_type', value: e.target.value } })}
                  disabled={isView}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Not set</option>
                  {billingOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Time &amp; Material projects get a Planned vs Actual comparison on the Work Plan tab.
                </p>
              </div>
            </div>

            {mode !== 'create' && (
              <div>
                <FieldLabelWithHelp helpKey="public.projects.project_manager_user_id" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" listOptions={false}>
                  Project Manager
                </FieldLabelWithHelp>
                {projectManager.canChange && !isView ? (
                  <SearchableSelect
                    options={projectManager.options}
                    value={formData.project_manager_user_id}
                    onChange={(v) => handleChange({ target: { name: 'project_manager_user_id', value: v } })}
                    placeholder="Select the Project Manager"
                    searchPlaceholder="Search people..."
                  />
                ) : (
                  <p className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                    {projectManager.currentName || 'Not set'}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The Project Manager has full rights on this project. Only a PMO Admin can change it.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FieldLabelWithHelp helpKey="public.projects.start_date" htmlFor="start_date" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </FieldLabelWithHelp>
                <RegionalDateInput eventStyle
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  disabled={isView}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.projects.end_date" htmlFor="end_date" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </FieldLabelWithHelp>
                <RegionalDateInput eventStyle
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  disabled={isView}
                  className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.end_date ? 'border-red-500' : 'border-gray-300'
                  } focus:border-blue-500 dark:border-gray-600`}
                />
                {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define executive, board, and approval roles.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <GovernanceSection formData={formData} handleChange={handleChange} errors={errors} onAuthorityNameChange={handleAuthorityNameChange} />
          </fieldset>
        </div>
      )}

      {activeTab === 'justificationObjectives' && (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define the business problem and strategic alignment.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <BusinessJustificationSection formData={formData} handleChange={handleChange} errors={errors} mode="objectives" />
          </fieldset>
        </div>
      )}

      {activeTab === 'justificationBenefits' && (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define expected benefits and assign benefit ownership.
              {!isView && (
                <>
                 Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <BusinessJustificationSection formData={formData} handleChange={handleChange} errors={errors} mode="benefits" />
          </fieldset>
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Delivery</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure delivery methodology, lifecycle model, and stage-gate controls.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <LifecycleControlsSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
              lifecycleTemplates={lifecycleTemplates}
              mode="config"
            />
          </fieldset>
        </div>
      )}

      {activeTab === 'tolerances' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Tolerances</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define acceptable variance limits for time, cost, scope, quality, risk, and benefits.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <LifecycleControlsSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
              lifecycleTemplates={lifecycleTemplates}
              mode="tolerances"
            />
          </fieldset>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Financial Controls</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure budget, funding source, and approval status.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <FinancialControlsSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
              fundingSources={fundingSources}
              budgetCategories={budgetCategories}
              onBudgetCategoriesChange={handleBudgetCategoriesChange}
            />
          </fieldset>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Risks</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assess project risk profile and complexity.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <RiskComplexitySection formData={formData} handleChange={handleChange} errors={errors} mode="risk" />
          </fieldset>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Resources</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Capture optional effort, skills, and vendor indicators for planning.</p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <RiskComplexitySection formData={formData} handleChange={handleChange} errors={errors} mode="resources" />
          </fieldset>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Documents</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Capture document governance and compliance metadata.
              {!isView && (
                <>
                  {' '}
                  Fields marked with <span className="text-red-500">*</span> are required for authorisation.
                </>
              )}
            </p>
          </div>
          <fieldset disabled={isView} className="min-w-0 border-0 p-0">
            <DocumentGovernanceSection formData={formData} handleChange={handleChange} errors={errors} />
          </fieldset>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <>
          {isView ? (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Portfolio Assignment</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Project link to a portfolio (read-only). Use Edit to change.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                {portfolioReadOnlySummary?.portfolio_name ? (
                  <div className="flex items-start gap-3">
                    <Briefcase className="mt-0.5 h-8 w-8 shrink-0 text-blue-500 opacity-70" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{portfolioReadOnlySummary.portfolio_name}</p>
                      <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {portfolioReadOnlySummary.portfolio_code || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not assigned to a portfolio.</p>
                )}
              </div>
            </div>
          ) : (
            <PortfolioAssignmentSection portfolioId={selectedPortfolioId} selection={selectedPortfolio} onChange={onPortfolioChange} />
          )}
        </>
      )}

      {activeTab === 'programme' && (
        <>
          {isView ? (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Programme Assignment</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Project link to a programme (read-only). Use Edit to change.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                {programmeReadOnlySummary?.programme_name ? (
                  <div className="flex items-start gap-3">
                    <Network className="mt-0.5 h-8 w-8 shrink-0 text-purple-500 opacity-70" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{programmeReadOnlySummary.programme_name}</p>
                      <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {programmeReadOnlySummary.programme_code || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not part of a programme.</p>
                )}
              </div>
            </div>
          ) : (
            <ProgrammeAssignmentSection programmeId={selectedProgrammeId} selection={selectedProgramme} onChange={onProgrammeChange} />
          )}
        </>
      )}

      {activeTab === 'constraints' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.project_constraints" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Constraints</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Known limitations on how this project can be delivered — schedule, budget, resourcing, technical, or regulatory. Add one per line.
            </p>
          </div>
          <MultiLineListInput
            id="project_constraints_input"
            value={formData.project_constraints}
            onChange={(v) => handleChange({ target: { name: 'project_constraints', value: v } })}
            placeholder="e.g. Fixed go-live date of 30 June 2027..."
            ariaLabelPrefix="constraint"
            disabled={isView}
          />
        </div>
      )}

      {activeTab === 'assumptions' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.project_assumptions" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Assumptions</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Planning assumptions being made about this project — things believed to be true but not yet confirmed. Add one per line.
            </p>
          </div>
          <MultiLineListInput
            id="project_assumptions_input"
            value={formData.project_assumptions}
            onChange={(v) => handleChange({ target: { name: 'project_assumptions', value: v } })}
            placeholder="e.g. Key vendor resources will remain available for the project duration..."
            ariaLabelPrefix="assumption"
            disabled={isView}
          />
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.key_deliverables" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Deliverables</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The key outputs this project will produce. Add one per line.
            </p>
          </div>
          <MultiLineListInput
            id="key_deliverables_input"
            value={formData.key_deliverables}
            onChange={(v) => handleChange({ target: { name: 'key_deliverables', value: v } })}
            placeholder="e.g. Migrated core banking platform..."
            ariaLabelPrefix="deliverable"
            disabled={isView}
          />
        </div>
      )}

      {activeTab === 'stakeholders' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.wizard_stakeholders" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Stakeholders</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Capture the stakeholders identified for this project now, before roles are assigned — kept as audit information. Assigned roles can inherit these or add their own later.
            </p>
          </div>
          <StakeholderQuickCaptureSection
            rows={stakeholderRows}
            onAdd={onAddStakeholder}
            onRemove={onRemoveStakeholder}
            disabled={isView}
            adding={addingStakeholder}
          />
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.wizard_milestones" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Main Milestones</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Capture the main milestones identified for this project now, before roles are assigned — kept as audit information. Assigned roles can inherit these or add their own later.
            </p>
          </div>
          <MilestoneQuickCaptureSection
            rows={milestoneRows}
            onAdd={onAddMilestone}
            onRemove={onRemoveMilestone}
            disabled={isView}
            adding={addingMilestone}
          />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="mb-4">
            <FieldLabelWithHelp as="h2" helpKey="public.projects.required_approvals" className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Approvals</FieldLabelWithHelp>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Required approvals or sign-offs for this project — who or which body needs to approve, and for what. Add one per line.
            </p>
          </div>
          <MultiLineListInput
            id="required_approvals_input"
            value={formData.required_approvals}
            onChange={(v) => handleChange({ target: { name: 'required_approvals', value: v } })}
            placeholder="e.g. Steering committee sign-off on go-live date..."
            ariaLabelPrefix="approval"
            disabled={isView}
          />
        </div>
      )}
    </FieldHelpScope>
  )
}

export default memo(ProjectWizardPanels)
