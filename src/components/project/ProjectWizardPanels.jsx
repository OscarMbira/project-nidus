import { memo } from 'react'
import SearchableSelect from '../ui/SearchableSelect'
import GovernanceSection from './GovernanceSection'
import BusinessJustificationSection from './BusinessJustificationSection'
import LifecycleControlsSection from './LifecycleControlsSection'
import FinancialControlsSection from './FinancialControlsSection'
import RiskComplexitySection from './RiskComplexitySection'
import DocumentGovernanceSection from './DocumentGovernanceSection'
import PortfolioAssignmentSection from './PortfolioAssignmentSection'
import ProgrammeAssignmentSection from './ProgrammeAssignmentSection'
import { Briefcase, Network } from 'lucide-react'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
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
  methodologies = [],
}) {
  const isView = mode === 'view'
  const showMethodology = (mode === 'edit' || mode === 'view') && Array.isArray(methodologies) && methodologies.length > 0

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

            {showMethodology && (
              <div>
                <label htmlFor="methodology_id" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Methodology <span className="text-red-500">*</span>
                </label>
                {isView ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    {methodologies.find((m) => m.id === formData.methodology_id)?.methodology_name || '—'}
                  </p>
                ) : (
                  <>
                    <select
                      id="methodology_id"
                      name="methodology_id"
                      value={formData.methodology_id}
                      onChange={handleChange}
                      required
                      className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors.methodology_id ? 'border-red-500' : 'border-gray-300'
                      } focus:border-blue-500 dark:border-gray-600`}
                    >
                      <option value="">Select a methodology</option>
                      {methodologies.map((m, index) => (
                        <option key={m.id} value={m.id}>
                          {m.methodology_name}
                        </option>
                      ))}
                    </select>
                    {errors.methodology_id && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.methodology_id}</p>
                    )}
                  </>
                )}
              </div>
            )}

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
    </>
  )
}

export default memo(ProjectWizardPanels)
