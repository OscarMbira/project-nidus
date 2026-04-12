import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { platformDb } from '../services/supabase/supabaseClient'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId'
import { platformProjectPath, looksLikeProjectUuid } from '../utils/projectRouteParam'
import { GanttChart } from '../components/gantt'
import { Edit2, Trash2, Archive, AlertTriangle, Shield, MessageSquare } from 'lucide-react'
import { getQMSByProject } from '../services/qualityManagementStrategyService'
import { getRMSByProject } from '../services/riskManagementStrategyService'
import ProjectRiskSummary from '../components/risks/ProjectRiskSummary'
import OpenIssuesWidget from '../components/issues/OpenIssuesWidget'
import LessonsSummaryWidget from '../components/lessonsLog/LessonsSummaryWidget'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'
import { getProjectPortfolio } from '../services/portfolioService'
import { getProjectProgramme } from '../services/programmeService'
import ProjectFormTabs from '../components/project/ProjectFormTabs'
import ProjectWizardPanels from '../components/project/ProjectWizardPanels'
import ProjectPlanningOverview from '../components/planning/ProjectPlanningOverview'
import { mapDbProjectToWizardForm } from '../utils/projectWizardFormUtils'
import { getByProjectId } from '../services/projectBudgetCategoryService'
import { getLifecycleTemplates } from '../services/lifecycleTemplateService'
import { getFundingSources } from '../services/fundingSourceService'
import { getBudgetCategories } from '../services/budgetCategoryService'

const PROJECT_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'project_code', label: 'Code' },
    { key: 'project_description', label: 'Description' },
    { key: 'status_name', label: 'Status' }
  ]},
  { title: 'Dates & Progress', fields: [
    { key: 'planned_start_date', label: 'Planned Start' },
    { key: 'planned_end_date', label: 'Planned End' },
    { key: 'percentage_complete', label: '% Complete' }
  ]}
]

export default function ProjectsDetail() {
  const { projectId, routeKey, loading: routeResolving, error: routeError } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'gantt'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [qms, setQms] = useState(null)
  const [rms, setRms] = useState(null)

  const [portfolioAssignment, setPortfolioAssignment] = useState(null)
  const [programmeAssignment, setProgrammeAssignment] = useState(null)

  const [wizardActiveTab, setWizardActiveTab] = useState('details')
  const [wizardFormData, setWizardFormData] = useState(null)
  const [methodologies, setMethodologies] = useState([])
  const [wizardFundingSources, setWizardFundingSources] = useState([])
  const [wizardBudgetCategories, setWizardBudgetCategories] = useState([])
  const [wizardLifecycleTemplates, setWizardLifecycleTemplates] = useState([])

  /** Decoded segment for links: prefer code once project is loaded */
  const urlProjectSegment = useMemo(() => {
    if (project?.project_code?.trim()) return project.project_code.trim()
    if (project?.id) return project.id
    return routeKey || ''
  }, [project, routeKey])

  useEffect(() => {
    if (routeError === 'missing') {
      navigate('/platform/projects', { replace: true })
      return
    }
    if (routeResolving) return
    if (routeError === 'not_found') {
      setLoading(false)
      setProject(null)
      setLoadError({ code: 'PGRST116', message: 'Project not found' })
      return
    }
    if (projectId) {
      fetchProject()
    }
  }, [projectId, routeResolving, routeError, navigate])

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await platformDb
        .from('projects')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', projectId)

      if (error) throw error

      setShowDeleteConfirm(false)
      navigate('/platform/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleArchive = async () => {
    try {
      setArchiving(true)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Find archived status
      const { data: archivedStatus, error: statusError } = await platformDb
        .from('project_statuses')
        .select('id')
        .eq('status_code', 'archived')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single()

      if (statusError && statusError.code !== 'PGRST116') throw statusError

      const updateData = {
        updated_by: user.id
      }

      if (archivedStatus) {
        updateData.status_id = archivedStatus.id
      }

      const { error } = await platformDb
        .from('projects')
        .update(updateData)
        .eq('id', projectId)

      if (error) throw error

      setShowArchiveConfirm(false)
      await fetchProject() // Refresh project data
    } catch (error) {
      console.error('Error archiving project:', error)
      alert('Error archiving project: ' + error.message)
    } finally {
      setArchiving(false)
    }
  }

  const fetchProject = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const { data, error } = await platformDb
        .from('projects')
        .select(`
          *,
          project_types:project_type_id (*),
          project_statuses:status_id (*),
          project_methodologies (
            methodologies:methodology_id (*)
          )
        `)
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setProject(data)

      const code = data?.project_code?.trim()
      if (code && routeKey && looksLikeProjectUuid(routeKey)) {
        navigate(platformProjectPath(code), { replace: true })
      }

      // Fetch QMS and RMS status
      if (data) {
        const [qmsResult, rmsResult, portfolioResult, programmeResult] = await Promise.all([
          getQMSByProject(projectId),
          getRMSByProject(projectId),
          getProjectPortfolio(projectId).catch(() => null),
          getProjectProgramme(projectId).catch(() => null),
        ])
        if (qmsResult?.success) setQms(qmsResult.data ?? null)
        if (rmsResult?.success) setRms(rmsResult.data ?? null)
        setPortfolioAssignment(portfolioResult || null)
        setProgrammeAssignment(programmeResult || null)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setProject(null)
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!project || !projectId) {
      setWizardFormData(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const pmRow = project.project_methodologies?.[0]
        const methodologyId = pmRow?.methodology_id || ''
        const legacyBudget = project.budget_amount ?? project.budget
        const catRes = await getByProjectId(projectId)
        const rows = catRes?.success && Array.isArray(catRes.data) ? catRes.data : []
        const mapped = mapDbProjectToWizardForm(project, methodologyId, rows, legacyBudget)
        const { data: methData, error: methErr } = await platformDb
          .from('methodologies')
          .select('*')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('methodology_name', { ascending: true })
        if (methErr) throw methErr
        if (!cancelled) {
          setWizardFormData(mapped)
          setMethodologies(methData || [])
        }
      } catch (e) {
        console.error('Failed to build project wizard view:', e)
        if (!cancelled) setWizardFormData(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project, projectId])

  const loadWizardFinancial = useCallback(() => {
    Promise.all([getFundingSources({ activeOnly: true }), getBudgetCategories({ activeOnly: true })])
      .then(([fundingRes, budgetCatRes]) => {
        if (fundingRes?.success && Array.isArray(fundingRes.data)) setWizardFundingSources(fundingRes.data)
        if (budgetCatRes?.success && Array.isArray(budgetCatRes.data)) {
          setWizardBudgetCategories(budgetCatRes.data)
        }
      })
      .catch((err) => console.error('Wizard financial lookups:', err))
  }, [])

  const loadWizardLifecycle = useCallback(() => {
    getLifecycleTemplates()
      .then((result) => {
        if (result?.success && Array.isArray(result.data)) setWizardLifecycleTemplates(result.data)
      })
      .catch((err) => console.error('Wizard lifecycle templates:', err))
  }, [])

  const prevWizardFinancialRef = useRef(false)
  useEffect(() => {
    const onFinancial = wizardActiveTab === 'financial'
    if (onFinancial && !prevWizardFinancialRef.current) loadWizardFinancial()
    prevWizardFinancialRef.current = onFinancial
  }, [wizardActiveTab, loadWizardFinancial])

  const prevWizardDeliveryRef = useRef(false)
  useEffect(() => {
    const onDelivery = wizardActiveTab === 'delivery' || wizardActiveTab === 'tolerances'
    if (onDelivery && !prevWizardDeliveryRef.current) loadWizardLifecycle()
    prevWizardDeliveryRef.current = onDelivery
  }, [wizardActiveTab, loadWizardLifecycle])

  const noop = useCallback(() => {})
  const noopAuthority = useCallback(() => noop, [noop])

  const wizardTabCompletionData = useMemo(() => {
    if (!wizardFormData) return {}
    return {
      ...wizardFormData,
      portfolio_id: portfolioAssignment?.portfolio_id ?? null,
      programme_id: programmeAssignment?.programme_id ?? null,
    }
  }, [wizardFormData, portfolioAssignment, programmeAssignment])

  const projectTypeOptions = useMemo(() => {
    if (!project?.project_type_id) return []
    return [{ value: project.project_type_id, label: project.project_types?.type_name || '—' }]
  }, [project])

  const statusOptions = useMemo(() => {
    if (!project?.status_id) return []
    return [{ value: project.status_id, label: project.project_statuses?.status_name || '—' }]
  }, [project])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    const code = loadError?.code
    const isNotFound = code === 'PGRST116'
    const title = isNotFound
      ? 'This project could not be opened'
      : 'Unable to load this project'
    const detail = isNotFound
      ? 'The ID in your link may be out of date (for example after seed data was refreshed), the project was removed, or you do not have access. Open Projects and select a current project from your list.'
      : (loadError?.message || 'Something went wrong while loading. You can return to the project list and try again.')

    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center rounded-xl border border-gray-700 bg-gray-800/80 p-8">
            <h1 className="text-xl font-semibold text-gray-100 mb-3">{title}</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{detail}</p>
            <button
              type="button"
              onClick={() => navigate('/platform/projects')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/platform/projects')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Projects
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.project_name}
            </h1>
            {project.project_code && (
              <p className="text-gray-500 dark:text-gray-400">Code: {project.project_code}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportWord={() => exportRecordToWord(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportExcel={() => exportRecordToExcel(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportCSV={() => exportRecordToCSV(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportXML={() => exportRecordToXML(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportJSON={() => exportRecordToJSON(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
              onExportPrint={() => exportRecordToPrint(PROJECT_EXPORT_SECTIONS, { ...project, status_name: project.project_statuses?.status_name }, `Project_${project.project_code || project.id}`)}
            />
            {project.project_statuses && (
              <span
                className="px-3 py-1 text-sm rounded text-white"
                style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
              >
                {project.project_statuses.status_name}
              </span>
            )}
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'edit'))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {project.project_description && (
          <p className="text-gray-600 dark:text-gray-300 mb-6">{project.project_description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Methodology</h3>
            {project.project_methodologies && project.project_methodologies[0]?.methodologies ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: project.project_methodologies[0].methodologies.methodology_color || '#3B82F6' }}
                ></div>
                <p className="text-gray-900 dark:text-white">{project.project_methodologies[0].methodologies.methodology_name}</p>
              </div>
            ) : (
              <p className="text-gray-900 dark:text-white">Not assigned</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project Type</h3>
            <p className="text-gray-900 dark:text-white">
              {project.project_types?.type_name || 'Not specified'}
            </p>
          </div>

          {project.budget_amount && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Budget</h3>
              <p className="text-gray-900 dark:text-white">${project.budget_amount.toLocaleString()}</p>
            </div>
          )}
        </div>

        {(project.planned_start_date || project.planned_end_date) && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</h3>
            <div className="flex gap-4">
              {project.planned_start_date && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Start: </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(project.planned_start_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project.planned_end_date && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">End: </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(project.planned_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            {project.planned_end_date &&
              new Date(project.planned_end_date) < new Date(new Date().toDateString()) && (
                <p className="mt-3 text-sm">
                  <span className="text-amber-600 dark:text-amber-400">Planned end date has passed.</span>{' '}
                  <Link
                    to={`/pm/planning/recovery?projectId=${encodeURIComponent(projectId)}&trigger=milestone`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Review recovery options
                  </Link>
                </p>
              )}
          </div>
        )}
      </div>

      <ProjectPlanningOverview projectId={projectId} />

      {wizardFormData && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-white">Project record</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Read-only view using the same steps as create and edit. Use Edit to make changes.
          </p>
          <ProjectFormTabs
            activeTab={wizardActiveTab}
            setActiveTab={setWizardActiveTab}
            formData={wizardTabCompletionData}
          />
          <div className="mt-4">
            <ProjectWizardPanels
              mode="view"
              activeTab={wizardActiveTab}
              formData={wizardFormData}
              errors={{}}
              handleChange={noop}
              projectTypeOptions={projectTypeOptions}
              statusOptions={statusOptions}
              handleProjectTypeChange={noop}
              handleProjectStatusChange={noop}
              handleAuthorityNameChange={noopAuthority}
              lifecycleTemplates={wizardLifecycleTemplates}
              fundingSources={wizardFundingSources}
              budgetCategories={wizardBudgetCategories}
              handleBudgetCategoriesChange={noop}
              selectedPortfolioId={portfolioAssignment?.portfolio_id ?? null}
              selectedPortfolio={portfolioAssignment?.portfolios ?? null}
              onPortfolioChange={noop}
              selectedProgrammeId={programmeAssignment?.programme_id ?? null}
              selectedProgramme={programmeAssignment?.programmes ?? null}
              onProgrammeChange={noop}
              portfolioReadOnlySummary={
                portfolioAssignment?.portfolios
                  ? {
                      portfolio_name: portfolioAssignment.portfolios.portfolio_name,
                      portfolio_code: portfolioAssignment.portfolios.portfolio_code,
                    }
                  : null
              }
              programmeReadOnlySummary={
                programmeAssignment?.programmes
                  ? {
                      programme_name: programmeAssignment.programmes.programme_name,
                      programme_code: programmeAssignment.programmes.programme_code,
                    }
                  : null
              }
              methodologies={methodologies}
            />
          </div>
        </div>
      )}

      {/* Risk Summary Widget */}
      <div className="mb-6">
        <ProjectRiskSummary projectId={projectId} />
      </div>

      {/* Issue Summary Widget */}
      <div className="mb-6">
        <OpenIssuesWidget projectId={projectId} />
      </div>

      {/* Lessons Summary Widget */}
      <div className="mb-6">
        <LessonsSummaryWidget projectId={projectId} />
      </div>

      {/* Structured PM Modules */}
      {/* Note: 'prince2' methodology_code checked for database backward compatibility only */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       (project.project_methodologies[0].methodologies.methodology_code === 'prince2' ||
        project.project_methodologies[0].methodologies.methodology_code === 'structured_pm') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Structured Project Management Processes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'starting-up'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Starting Up a Project
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Project Mandate and Project Brief
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'initiating'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Initiating a Project
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Business Case and Project Initiation Document
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'pid'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Project Initiation Document (PID)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Establish solid foundations for the project
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'controlling'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Work Packages
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage work packages for stage execution
              </p>
            </button>
                <button
                  onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'stage-gates'))}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Stage Gates
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage stage boundaries and approvals
                  </p>
                </button>
                <button
                  onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'controlling'))}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Controlling a Stage
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage work packages and stage execution
                  </p>
                </button>
                <button
                  onClick={() => navigate(platformProjectPath(urlProjectSegment, 'structured', 'managing-delivery'))}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Managing Product Delivery
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage product deliverables and quality
                  </p>
                </button>
              </div>
            </div>
          )}

      {/* Universal Modules - Available to all projects */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Universal Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'issues'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Issue Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track and manage project issues across all methodologies
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'issues', 'register'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Issue Register
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Formal Issue Register with RFC, Off-spec, and Problem tracking
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'ppd'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Project Product Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define what the project will deliver - overall project product
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'qms'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left relative"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Quality Management Strategy
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Define how quality will be achieved - quality planning, control, and assurance
                </p>
              </div>
              {qms && (
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                  qms.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  qms.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  <Shield className="h-3 w-3" />
                  {qms.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'rms'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left relative"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Risk Management Strategy
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Define how risks will be managed - identification, assessment, response, and monitoring
                </p>
              </div>
              {rms && (
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                  rms.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  rms.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  {rms.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'cms'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Communication Management Strategy
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define how communication will be managed - channels, methods, audiences, and procedures
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'configuration-ms'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Configuration Management Strategy
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define how configuration will be managed - identification, version control, baselines, and audits
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'configuration-items'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Configuration Item Register
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track all configuration items, versions, status changes, and baselines
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'risks'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Risk Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage project risks, assumptions, and dependencies
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'plans'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Plan Documentation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Project Plan and Stage Plans - comprehensive planning documentation
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'product-descriptions'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Product Descriptions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Individual Product Descriptions - detailed specifications for products/deliverables
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'product-status-accounts'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Product Status Accounts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Product Status Register - track status, progress, and history of products/deliverables
            </p>
          </button>
          <button
            onClick={() => navigate(platformProjectPath(urlProjectSegment, 'raid-log'))}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              RAID Log
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Combined view of Risks, Assumptions, Issues, and Dependencies
            </p>
          </button>
        </div>
      </div>

      {/* Scrum Modules */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       project.project_methodologies[0].methodologies.methodology_code === 'scrum' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Scrum Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'scrum', 'product-backlog'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Product Backlog
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage user stories, epics, and backlog prioritization
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'scrum', 'sprint-planning'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Sprint Planning
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create sprints, plan capacity, and assign stories
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'scrum', 'metrics'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Sprint metrics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Velocity, forecast, burndown and burnup
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'scrum', 'story-map'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Story map
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Journeys, activities, and story nodes
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'agile', 'metrics'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Agile metrics hub
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cross-methodology snapshot and forecasts
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Kanban Modules */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       project.project_methodologies[0].methodologies.methodology_code === 'kanban' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Kanban Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'kanban'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Kanban Boards
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and manage Kanban boards with WIP limits
              </p>
            </button>
            <button
              onClick={() => navigate(platformProjectPath(urlProjectSegment, 'kanban', 'metrics'))}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Kanban metrics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CFD, lead and cycle time, throughput, flow efficiency
              </p>
            </button>
          </div>
        </div>
      )}

      {project.project_methodologies &&
        project.project_methodologies[0]?.methodologies &&
        (project.project_methodologies[0].methodologies.methodology_code === 'scrum' ||
          project.project_methodologies[0].methodologies.methodology_code === 'kanban') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Agile extensions (XP / Lean)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate(platformProjectPath(urlProjectSegment, 'xp', 'dashboard'))}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">XP dashboard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pairing, code reviews, CI, TDD tracking</p>
              </button>
              <button
                onClick={() => navigate(platformProjectPath(urlProjectSegment, 'lean', 'value-stream-map'))}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lean value stream</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Value stream maps and flow metrics</p>
              </button>
              <button
                onClick={() => navigate(platformProjectPath(urlProjectSegment, 'lean', 'kaizen'))}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Kaizen board</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Waste identification and improvements</p>
              </button>
              <button
                onClick={() => navigate(platformProjectPath(urlProjectSegment, 'scrum', 'scrum-of-scrums'))}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Scrum of Scrums</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Multi-team coordination</p>
              </button>
            </div>
          </div>
        )}

      {/* Tasks Section with Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Tasks
            </h2>
            <button
              onClick={() => navigate(`/platform/tasks/create`, { state: { projectId } })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              + Add Task
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6 mt-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gantt'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📊 Gantt Chart
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'list' ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Task list will be displayed here
            </p>
          ) : (
            <div className="min-h-[500px]">
              <GanttChart projectId={projectId} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${project.project_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive Project"
          message={`Are you sure you want to archive "${project.project_name}"? You can restore it later if needed.`}
          confirmText="Archive"
          cancelText="Cancel"
          confirmColor="yellow"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
          loading={archiving}
        />
      )}
    </div>
  )
}

// Confirm Dialog Component
function ConfirmDialog({ title, message, confirmText, cancelText, confirmColor, onConfirm, onCancel, loading }) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${colorClasses[confirmColor] || colorClasses.blue}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

