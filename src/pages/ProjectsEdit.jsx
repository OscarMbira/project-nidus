import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { platformDb } from '../services/supabase/supabaseClient'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId'
import { platformProjectPath, looksLikeProjectUuid } from '../utils/projectRouteParam'
import ProjectFormTabs from '../components/project/ProjectFormTabs'
import ProjectWizardPanels from '../components/project/ProjectWizardPanels'
import { getFundingSources } from '../services/fundingSourceService'
import { getBudgetCategories } from '../services/budgetCategoryService'
import { getByProjectId, saveForProject } from '../services/projectBudgetCategoryService'
import { getLifecycleTemplates } from '../services/lifecycleTemplateService'
import {
  getEmptyWizardFormData,
  mapDbProjectToWizardForm,
  normalizeEmbeddedList,
  wizardFormToProjectUpdatePayload,
  omitOptionalProjectWizardColumns,
  isSchemaCacheColumnError,
} from '../utils/projectWizardFormUtils'
import {
  getProjectPortfolio,
  addProjectToPortfolio,
  removeProjectFromPortfolio,
} from '../services/portfolioService'
import {
  getProjectProgramme,
  addProjectToProgramme,
  removeProjectFromProgramme,
} from '../services/programmeService'
import { useToastContext } from '../context/ToastContext'

/** Prevent hung Supabase / auth calls from leaving the UI stuck on "Saving…" */
const REQUEST_MS = {
  appProfile: 30000,
  projectUpdate: 45000,
  methodology: 30000,
  budgetSave: 95000,
  portfolioOp: 30000,
  /** Hard cap for the whole save pipeline (auth → DB → assignments) */
  saveTotal: 120000,
}

/** Prefer local session (fast); only call getUser() if no session. */
async function resolveAuthenticatedUser(client) {
  const { data: { session }, error: sessionErr } = await client.auth.getSession()
  if (sessionErr) throw sessionErr
  if (session?.user) return session.user

  const { data: { user }, error: userErr } = await client.auth.getUser()
  if (userErr) throw userErr
  return user ?? null
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

export default function ProjectsEdit() {
  const { projectId, routeKey, loading: routeResolving, error: routeError } = usePlatformProjectId()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [formData, setFormData] = useState(() => getEmptyWizardFormData())
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  const saveFailsafeRef = useRef(null)

  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [methodologies, setMethodologies] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [budgetCategoriesLookup, setBudgetCategoriesLookup] = useState([])
  const [lifecycleTemplates, setLifecycleTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
  const [selectedPortfolio, setSelectedPortfolio] = useState(null)
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(null)
  const [selectedProgramme, setSelectedProgramme] = useState(null)
  const [assignmentSnapshot, setAssignmentSnapshot] = useState({
    portfolioId: null,
    programmeId: null,
  })

  const urlProjectSegment = useMemo(() => {
    const code = formData.project_code?.trim()
    if (code) return code
    if (project?.id) return project.id
    return routeKey || ''
  }, [formData.project_code, project, routeKey])

  useEffect(() => {
    fetchLookupData()
  }, [])

  useEffect(() => {
    if (routeError === 'missing') {
      navigate('/platform/projects', { replace: true })
      return
    }
    if (routeResolving) return
    if (routeError === 'not_found') {
      setLoading(false)
      setProject(null)
      return
    }
    if (projectId) {
      fetchProject()
    }
  }, [projectId, routeResolving, routeError, navigate])

  const loadFinancialLookups = useCallback(() => {
    Promise.all([getFundingSources({ activeOnly: true }), getBudgetCategories({ activeOnly: true })])
      .then(([fundingRes, budgetCatRes]) => {
        if (fundingRes?.success && Array.isArray(fundingRes.data)) setFundingSources(fundingRes.data)
        if (budgetCatRes?.success && Array.isArray(budgetCatRes.data)) {
          setBudgetCategoriesLookup(budgetCatRes.data)
        }
      })
      .catch((err) => console.error('Failed to load financial lookups:', err))
  }, [])

  const loadLifecycleTemplates = useCallback(() => {
    getLifecycleTemplates()
      .then((result) => {
        if (result?.success && Array.isArray(result.data)) setLifecycleTemplates(result.data)
      })
      .catch((err) => console.error('Failed to load lifecycle templates:', err))
  }, [])

  const prevDeliveryTabRef = useRef(false)
  useEffect(() => {
    const onDelivery = activeTab === 'delivery' || activeTab === 'tolerances'
    if (onDelivery && !prevDeliveryTabRef.current) loadLifecycleTemplates()
    prevDeliveryTabRef.current = onDelivery
  }, [activeTab, loadLifecycleTemplates])

  const prevFinancialTabRef = useRef(false)
  useEffect(() => {
    const onFinancial = activeTab === 'financial'
    if (onFinancial && !prevFinancialTabRef.current) loadFinancialLookups()
    prevFinancialTabRef.current = onFinancial
  }, [activeTab, loadFinancialLookups])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const { data, error } = await platformDb
        .from('projects')
        .select(`
          *,
          project_methodologies (
            id,
            methodology_id,
            is_deleted
          )
        `)
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error

      const normalized =
        data != null
          ? { ...data, project_methodologies: normalizeEmbeddedList(data.project_methodologies) }
          : data
      setProject(normalized)

      if (normalized) {
        const pmList = normalized.project_methodologies
        const activePm = pmList.find((m) => m.is_deleted === false) || pmList[0]
        const methodologyId = activePm?.methodology_id || ''
        const legacyBudget = normalized.budget_amount ?? normalized.budget

        const catRes = await getByProjectId(projectId)
        const rows = catRes?.success && Array.isArray(catRes.data) ? catRes.data : []

        const mapped = mapDbProjectToWizardForm(normalized, methodologyId, rows, legacyBudget)
        setFormData(mapped)

        const [portRes, progRes] = await Promise.all([
          getProjectPortfolio(projectId).catch(() => null),
          getProjectProgramme(projectId).catch(() => null),
        ])
        const pId = portRes?.portfolio_id ?? null
        const gId = progRes?.programme_id ?? null
        setSelectedPortfolioId(pId)
        setSelectedPortfolio(portRes?.portfolios ?? null)
        setSelectedProgrammeId(gId)
        setSelectedProgramme(progRes?.programmes ?? null)
        setAssignmentSnapshot({ portfolioId: pId, programmeId: gId })

        // Replace UUID URLs with human-readable project_code only after form state is set.
        // Doing this earlier caused a route transition before setFormData, leaving the edit form empty.
        const code = normalized?.project_code?.trim()
        if (code && routeKey && looksLikeProjectUuid(routeKey)) {
          navigate(platformProjectPath(code, 'edit'), { replace: true })
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLookupData = async () => {
    try {
      const [typesRes, statusesRes, methodsRes] = await Promise.all([
        platformDb
          .from('project_types')
          .select('*')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('type_name', { ascending: true }),
        platformDb
          .from('project_statuses')
          .select('*')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('status_name', { ascending: true }),
        platformDb
          .from('methodologies')
          .select('*')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('methodology_name', { ascending: true }),
      ])

      if (typesRes.error) throw typesRes.error
      if (statusesRes.error) throw statusesRes.error
      if (methodsRes.error) throw methodsRes.error

      setProjectTypes(typesRes.data || [])
      setProjectStatuses(statusesRes.data || [])
      setMethodologies(methodsRes.data || [])
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const handleBudgetCategoriesChange = useCallback((categories) => {
    setFormData((prev) => ({ ...prev, budget_categories: categories }))
  }, [])

  const handleProjectTypeChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, project_type_id: value }))
    setErrors((prev) => {
      if (!prev.project_type_id) return prev
      const next = { ...prev }
      delete next.project_type_id
      return next
    })
  }, [])

  const handleProjectStatusChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, project_status_id: value }))
    setErrors((prev) => {
      if (!prev.project_status_id) return prev
      const next = { ...prev }
      delete next.project_status_id
      return next
    })
  }, [])

  const handleAuthorityNameChange = useCallback((nameField, idField) => (value) => {
    setFormData((prev) => ({ ...prev, [nameField]: value || '', [idField]: '' }))
  }, [])

  /** Core fields required to persist an edit. Governance/tolerances can be completed in other tabs. */
  const validateForm = useCallback(() => {
    const data = formDataRef.current
    const newErrors = {}

    if (!data.project_name.trim()) {
      newErrors.project_name = 'Project name is required'
    }
    if (!data.project_type_id) {
      newErrors.project_type_id = 'Please select a project type'
    }
    if (!data.project_status_id) {
      newErrors.project_status_id = 'Please select a project status'
    }
    if (methodologies.length > 0 && !data.methodology_id) {
      newErrors.methodology_id = 'Please select a methodology'
    }

    if (data.start_date && data.end_date) {
      if (new Date(data.start_date) > new Date(data.end_date)) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    const messages = Object.values(newErrors).filter(Boolean)
    return { ok: messages.length === 0, messages }
  }, [methodologies.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validation = validateForm()
    if (!validation.ok) {
      toast.error(validation.messages[0] || 'Please fix the highlighted fields before saving.')
      return
    }

    if (saveFailsafeRef.current) {
      clearTimeout(saveFailsafeRef.current)
      saveFailsafeRef.current = null
    }

    try {
      setSaving(true)
      setErrors((prev) => {
        const next = { ...prev }
        delete next.submit
        return next
      })

      // Last-resort UI reset if anything hangs without rejecting (should be extremely rare)
      saveFailsafeRef.current = window.setTimeout(() => {
        saveFailsafeRef.current = null
        setSaving(false)
        toast.error('Save timed out. Please check your connection and try again.')
      }, REQUEST_MS.saveTotal + 10000)

      await withTimeout(
        (async () => {
      const user = await resolveAuthenticatedUser(platformDb)
      if (!user) throw new Error('User not authenticated')

      const { data: appUserRow, error: profileErr } = await withTimeout(
        platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle(),
        REQUEST_MS.appProfile,
        'Could not load your user profile (timed out). Try again.',
      )
      if (profileErr) throw profileErr
      if (!appUserRow?.id) {
        throw new Error('Your user profile was not found. Complete onboarding or contact support.')
      }

      const fd = formDataRef.current
      // projects.updated_by references public.users(id), not auth.users(id)
      const updatePayload = wizardFormToProjectUpdatePayload(fd, appUserRow.id)

      const runProjectRowUpdate = (payload) =>
        withTimeout(
          platformDb.from('projects').update(payload).eq('id', projectId),
          REQUEST_MS.projectUpdate,
          'Saving project details timed out. Check your connection and try again.',
        )

      let { error: projectErr } = await runProjectRowUpdate(updatePayload)
      // If the DB never got v264/v266/v484 columns, PostgREST rejects optional fields — retry without them
      // (do not depend on error shape; Supabase may nest messages differently in the schema cache).
      if (projectErr) {
        const slimPayload = omitOptionalProjectWizardColumns(updatePayload)
        const { error: errSlim } = await runProjectRowUpdate(slimPayload)
        if (!errSlim) {
          projectErr = null
          toast.warning(
            'Project saved. Named-contact text and extra tolerance descriptions need SQL/v484_projects_wizard_columns_if_missing.sql applied in Supabase to persist fully.',
            { duration: 14000 },
          )
        } else {
          // Prefer the original error when it is more specific (e.g. RLS); slim retry usually repeats RLS too
          projectErr = isSchemaCacheColumnError(projectErr) ? errSlim : projectErr
        }
      }

      if (projectErr) throw projectErr

      if (methodologies.length > 0 && fd.methodology_id) {
        const { data: pmRows, error: pmSelectErr } = await withTimeout(
          platformDb
            .from('project_methodologies')
            .select('id, methodology_id, is_deleted')
            .eq('project_id', projectId)
            .limit(1),
          REQUEST_MS.methodology,
          'Loading methodology settings timed out.',
        )

        if (pmSelectErr) throw pmSelectErr

        const pmRow = pmRows?.[0]
        const methodologyUnchanged =
          pmRow && pmRow.methodology_id === fd.methodology_id && pmRow.is_deleted === false

        if (!methodologyUnchanged) {
          if (pmRow?.id) {
            const { error: pmUpErr } = await withTimeout(
              platformDb
                .from('project_methodologies')
                .update({
                  methodology_id: fd.methodology_id,
                  is_deleted: false,
                  deleted_at: null,
                })
                .eq('id', pmRow.id),
              REQUEST_MS.methodology,
              'Updating methodology timed out.',
            )

            if (pmUpErr) throw pmUpErr
          } else {
            const { error: pmInsErr } = await withTimeout(
              platformDb.from('project_methodologies').insert({
                project_id: projectId,
                methodology_id: fd.methodology_id,
              }),
              REQUEST_MS.methodology,
              'Saving methodology timed out.',
            )

            if (pmInsErr) throw pmInsErr
          }
        }
      }

      const cats = fd.budget_categories || []
      const toSave = cats
        .filter((c) => (c.category_name && String(c.category_name).trim()) || (Number(c.amount) || 0) > 0)
        .map((c) => ({
          category_name: (c.category_name || '').trim() || 'Unnamed',
          budget_amount: Number(c.amount) || 0,
          funding_source_id: c.funding_source_id || null,
        }))

      const saveCatRes = await Promise.race([
        saveForProject(projectId, toSave),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Saving budget lines timed out. Check your network and try again.')),
            REQUEST_MS.budgetSave,
          ),
        ),
      ])
      if (!saveCatRes.success) {
        setErrors({
          submit:
            saveCatRes.error ||
            'Project was saved, but budget lines could not be saved. You can try again from the Financial tab.',
        })
        return
      }

      const oldP = assignmentSnapshot.portfolioId
      const newP = selectedPortfolioId
      try {
        if (oldP && oldP !== newP) {
          await withTimeout(
            removeProjectFromPortfolio(oldP, projectId),
            REQUEST_MS.portfolioOp,
            'Updating portfolio assignment timed out.',
          )
        }
        if (newP && newP !== oldP) {
          await withTimeout(
            addProjectToPortfolio(newP, projectId),
            REQUEST_MS.portfolioOp,
            'Updating portfolio assignment timed out.',
          )
        }
      } catch (portErr) {
        console.error('Portfolio sync error:', portErr)
        setErrors({
          submit:
            (portErr && portErr.message) ||
            'Project was saved, but portfolio assignment could not be updated. Try again from the Portfolio tab.',
        })
        return
      }

      const oldG = assignmentSnapshot.programmeId
      const newG = selectedProgrammeId
      try {
        if (oldG && oldG !== newG) {
          await withTimeout(
            removeProjectFromProgramme(oldG, projectId),
            REQUEST_MS.portfolioOp,
            'Updating programme assignment timed out.',
          )
        }
        if (newG && newG !== oldG) {
          await withTimeout(
            addProjectToProgramme(newG, projectId),
            REQUEST_MS.portfolioOp,
            'Updating programme assignment timed out.',
          )
        }
      } catch (progErr) {
        console.error('Programme sync error:', progErr)
        setErrors({
          submit:
            (progErr && progErr.message) ||
            'Project was saved, but programme assignment could not be updated. Try again from the Programme tab.',
        })
        return
      }

      setAssignmentSnapshot({ portfolioId: newP ?? null, programmeId: newG ?? null })

      toast.success('Project saved successfully.')

      const nextSeg = (fd.project_code || '').trim() || project.id
      navigate(platformProjectPath(nextSeg))
        })(),
        REQUEST_MS.saveTotal,
        'Saving took too long. Check your connection and try again.',
      )
    } catch (error) {
      console.error('Error updating project:', error)
      const msg =
        error?.message ||
        error?.error_description ||
        (Array.isArray(error?.details) ? error.details.map((d) => d?.message).filter(Boolean).join('; ') : '') ||
        'Failed to update project'
      setErrors({ submit: msg })
    } finally {
      if (saveFailsafeRef.current) {
        clearTimeout(saveFailsafeRef.current)
        saveFailsafeRef.current = null
      }
      setSaving(false)
    }
  }

  const projectTypeOptions = useMemo(() => {
    if (!projectTypes.length) return []
    return projectTypes.map((type) => ({
      value: type.id,
      label: type.type_name || 'Unnamed',
    }))
  }, [projectTypes])

  const statusOptions = useMemo(() => {
    if (!projectStatuses.length) return []
    return projectStatuses.map((status) => ({
      value: status.id,
      label: status.status_name || 'Unnamed',
    }))
  }, [projectStatuses])

  const tabCompletionData = useMemo(
    () => ({
      project_name: formData.project_name,
      project_description: formData.project_description,
      executive_user_id: formData.executive_user_id,
      executive_name: formData.executive_name,
      board_required: formData.board_required,
      funding_authority_user_id: formData.funding_authority_user_id,
      funding_authority_name: formData.funding_authority_name,
      approving_authority_user_id: formData.approving_authority_user_id,
      approving_authority_name: formData.approving_authority_name,
      business_objective: formData.business_objective,
      strategic_alignment: formData.strategic_alignment,
      expected_benefits_summary: formData.expected_benefits_summary,
      benefit_owner_user_id: formData.benefit_owner_user_id,
      benefit_owner_name: formData.benefit_owner_name,
      delivery_methodology: formData.delivery_methodology,
      lifecycle_template: formData.lifecycle_template,
      stage_model: formData.stage_model,
      stage_gate_enforcement: formData.stage_gate_enforcement,
      tolerance_time_days: formData.tolerance_time_days,
      tolerance_cost_percentage: formData.tolerance_cost_percentage,
      tolerance_scope_description: formData.tolerance_scope_description,
      tolerance_quality_description: formData.tolerance_quality_description,
      tolerance_risk_description: formData.tolerance_risk_description,
      tolerance_benefits_description: formData.tolerance_benefits_description,
      budget_type: formData.budget_type,
      budget_categories: formData.budget_categories,
      budget_approval_status: formData.budget_approval_status,
      initial_risk_rating: formData.initial_risk_rating,
      complexity_rating: formData.complexity_rating,
      delivery_complexity: formData.delivery_complexity,
      regulatory_impact: formData.regulatory_impact,
      data_sensitivity: formData.data_sensitivity,
      estimated_effort: formData.estimated_effort,
      key_skills_required: formData.key_skills_required,
      external_vendors_required: formData.external_vendors_required,
      mandate_status: formData.mandate_status,
      business_case_status: formData.business_case_status,
      funding_approval_status: formData.funding_approval_status,
      rfp_reference: formData.rfp_reference,
      document_repository_url: formData.document_repository_url,
      portfolio_id: selectedPortfolioId,
      programme_id: selectedProgrammeId,
    }),
    [
      formData.project_name,
      formData.project_description,
      formData.executive_user_id,
      formData.executive_name,
      formData.board_required,
      formData.funding_authority_user_id,
      formData.funding_authority_name,
      formData.approving_authority_user_id,
      formData.approving_authority_name,
      formData.business_objective,
      formData.strategic_alignment,
      formData.expected_benefits_summary,
      formData.benefit_owner_user_id,
      formData.benefit_owner_name,
      formData.delivery_methodology,
      formData.lifecycle_template,
      formData.stage_model,
      formData.stage_gate_enforcement,
      formData.tolerance_time_days,
      formData.tolerance_cost_percentage,
      formData.tolerance_scope_description,
      formData.tolerance_quality_description,
      formData.tolerance_risk_description,
      formData.tolerance_benefits_description,
      formData.budget_type,
      formData.budget_categories,
      formData.budget_approval_status,
      formData.initial_risk_rating,
      formData.complexity_rating,
      formData.delivery_complexity,
      formData.regulatory_impact,
      formData.data_sensitivity,
      formData.estimated_effort,
      formData.key_skills_required,
      formData.external_vendors_required,
      formData.mandate_status,
      formData.business_case_status,
      formData.funding_approval_status,
      formData.rfp_reference,
      formData.document_repository_url,
      selectedPortfolioId,
      selectedProgrammeId,
    ],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-4 text-gray-500 dark:text-gray-400">Project not found</p>
          <button
            type="button"
            onClick={() => navigate('/platform/projects')}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(platformProjectPath(urlProjectSegment))}
        className="mb-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        ← Back to Project
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Project</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Update project details across all sections</p>
      </div>

      <ProjectFormTabs activeTab={activeTab} setActiveTab={setActiveTab} formData={tabCompletionData} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProjectWizardPanels
          mode="edit"
          activeTab={activeTab}
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          projectTypeOptions={projectTypeOptions}
          statusOptions={statusOptions}
          handleProjectTypeChange={handleProjectTypeChange}
          handleProjectStatusChange={handleProjectStatusChange}
          handleAuthorityNameChange={handleAuthorityNameChange}
          lifecycleTemplates={lifecycleTemplates}
          fundingSources={fundingSources}
          budgetCategories={budgetCategoriesLookup}
          handleBudgetCategoriesChange={handleBudgetCategoriesChange}
          selectedPortfolioId={selectedPortfolioId}
          selectedPortfolio={selectedPortfolio}
          onPortfolioChange={(id, p) => {
            setSelectedPortfolioId(id)
            setSelectedPortfolio(p)
          }}
          selectedProgrammeId={selectedProgrammeId}
          selectedProgramme={selectedProgramme}
          onProgrammeChange={(id, p) => {
            setSelectedProgrammeId(id)
            setSelectedProgramme(p)
          }}
          methodologies={methodologies}
        />

        {errors.submit && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate(platformProjectPath(urlProjectSegment))}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
