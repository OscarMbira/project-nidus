import { memo } from 'react'
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
}) {
  const isView = mode === 'view'

  return (
    <>
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
                <label htmlFor="project_code" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Code (Optional)
                </label>
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
                <label htmlFor="project_name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name <span className="text-red-500">*</span>
                </label>
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
              <label htmlFor="project_description" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Description
              </label>
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
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Type <span className="text-red-500">*</span>
                </label>
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
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {mode === 'create' ? 'Initial Status' : 'Status'} <span className="text-red-500">*</span>
                </label>
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Industry / Sector
              </label>
              <SearchableSelect
                options={industryOptions}
                value={formData.industry_category_id}
                onChange={(v) => handleChange({ target: { name: 'industry_category_id', value: v } })}
                placeholder={industryOptions.length > 0 ? 'Select an industry' : 'No industries configured for this organisation'}
                searchPlaceholder="Search industries..."
                disabled={isView || industryOptions.length === 0}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Which of your organisation's industries this project belongs to. Configure available industries in PMO Admin → Organisation Industries.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Success Criteria
              </label>
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Classification
              </label>
              <select
                value={formData.project_classification}
                onChange={(e) => handleChange({ target: { name: 'project_classification', value: e.target.value } })}
                disabled={isView}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a classification</option>
                <option value="strategic">Strategic</option>
                <option value="tactical">Tactical</option>
                <option value="operational">Operational</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                How central this project is to organisational strategy versus routine delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="start_date" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  disabled={isView}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Constraints</h2>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Assumptions</h2>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Deliverables</h2>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Stakeholders</h2>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Main Milestones</h2>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Approvals</h2>
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
    </>
  )
}

export default memo(ProjectWizardPanels)
