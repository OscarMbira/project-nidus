import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Loader } from 'lucide-react'

// Draft Queue Integration
import { HoldButton } from '../components/ui/HoldButton'
import { AutoSaveIndicator } from '../components/ui/AutoSaveIndicator'
import { useDraftQueue } from '../hooks/useDraftQueue'

import ProjectFormTabs from '../components/project/ProjectFormTabs'
import ProjectWizardPanels from '../components/project/ProjectWizardPanels'

// Phase 3: Import readiness validation component
import ReadinessPanel from '../components/project/ReadinessPanel'

// Phase 4: Import authorisation actions component
import AuthorisationActions from '../components/project/AuthorisationActions'

import { addProjectToPortfolio } from '../services/portfolioService'
import { addProjectToProgramme } from '../services/programmeService'

import ExportRecordMenu from '../components/ui/ExportRecordMenu'

// Mandate linking and loading (used when arriving from an approved mandate)
import { linkMandateToProject, getMandatePrefill } from '../services/projectMandateService'
import { getFundingSources } from '../services/fundingSourceService'
import { getBudgetCategories } from '../services/budgetCategoryService'
import { getLifecycleTemplates } from '../services/lifecycleTemplateService'
import { saveForProject } from '../services/projectBudgetCategoryService'

// Removed skeleton loader for faster initial render

/** Export sections for Create Project form (draft) — used by ExportRecordMenu */
const PROJECT_CREATE_EXPORT_SECTIONS = [
  { title: 'Project Details', fields: [
    { key: 'project_code', label: 'Project Code' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'project_description', label: 'Project Description' },
    { key: 'project_type_id', label: 'Project Type ID' },
    { key: 'project_status_id', label: 'Initial Status ID' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'intake_status', label: 'Intake Status' }
  ]},
  { title: 'Governance & Authority', fields: [
    { key: 'executive_user_id', label: 'Executive User ID' },
    { key: 'board_required', label: 'Board Required' },
    { key: 'funding_authority_user_id', label: 'Funding Authority User ID' },
    { key: 'approving_authority_user_id', label: 'Approving Authority User ID' }
  ]},
  { title: 'Business Justification', fields: [
    { key: 'business_objective', label: 'Business Objective' },
    { key: 'strategic_alignment', label: 'Strategic Alignment' },
    { key: 'expected_benefits_summary', label: 'Expected Benefits Summary' },
    { key: 'benefit_owner_user_id', label: 'Benefit Owner User ID' }
  ]},
  { title: 'Lifecycle & Controls', fields: [
    { key: 'delivery_methodology', label: 'Delivery Methodology' },
    { key: 'lifecycle_template', label: 'Lifecycle Template' },
    { key: 'stage_model', label: 'Stage Model' },
    { key: 'stage_gate_enforcement', label: 'Stage Gate Enforcement' },
    { key: 'tolerance_time_days', label: 'Tolerance Time (Days)' },
    { key: 'tolerance_cost_percentage', label: 'Tolerance Cost %' },
    { key: 'tolerance_scope_description', label: 'Tolerance Scope Description' },
    { key: 'tolerance_quality_description', label: 'Quality Tolerance (Description)' },
    { key: 'tolerance_risk_description', label: 'Risk Tolerance (Description)' },
    { key: 'tolerance_benefits_description', label: 'Benefits Tolerance (Description)' }
  ]},
  { title: 'Financial Controls', fields: [
    { key: 'budget_currency', label: 'Budget Currency' },
    { key: 'budget_type', label: 'Budget Type' },
    { key: 'budget_categories', label: 'Budget Categories' },
    { key: 'budget_approval_status', label: 'Budget Approval Status' }
  ]},
  { title: 'Risk & Documentation', fields: [
    { key: 'initial_risk_rating', label: 'Initial Risk Rating' },
    { key: 'complexity_rating', label: 'Complexity Rating' },
    { key: 'delivery_complexity', label: 'Delivery Complexity' },
    { key: 'regulatory_impact', label: 'Regulatory Impact' },
    { key: 'data_sensitivity', label: 'Data Sensitivity' },
    { key: 'estimated_effort', label: 'Estimated Effort' },
    { key: 'key_skills_required', label: 'Key Skills Required' },
    { key: 'external_vendors_required', label: 'External Vendors Required' },
    { key: 'mandate_status', label: 'Mandate Status' },
    { key: 'business_case_status', label: 'Business Case Status' },
    { key: 'rfp_reference', label: 'RFP Reference' },
    { key: 'funding_approval_status', label: 'Funding Approval Status' },
    { key: 'document_repository_url', label: 'Document Repository URL' }
  ]}
]

export default function ProjectsCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fromMandate = location.state?.fromMandate || null
  // Short URL: only projectCode (when PRJ-{mandateRef}, mandate is derived for prefill/linking)
  const projectCodeFromUrl = searchParams.get('projectCode')
  const fromMandateParam = searchParams.get('fromMandate') || searchParams.get('fromMandateId')
  const mandateIdFromProjectCode =
    projectCodeFromUrl?.startsWith('PRJ-') && projectCodeFromUrl.length > 4
      ? projectCodeFromUrl.slice(4)
      : null
  // Resolve mandate: from projectCode (PRJ-xxx → xxx) or from legacy URL param
  const mandateParamToFetch = mandateIdFromProjectCode || fromMandateParam || null

  // Ref that always holds the latest formData so callbacks don't need it as a dep
  const formDataRef = useRef(null)
  // When mandate is loaded from URL param, store id for linking after project create
  const mandateIdForLinkingRef = useRef(null)

  const [formData, setFormData] = useState({
    // Phase 1: Basic project fields
    project_name: fromMandate?.project_name || '',
    project_description: fromMandate?.project_description || '',
    project_type_id: '',
    project_status_id: '',
    start_date: '',
    end_date: '',
    project_code: projectCodeFromUrl || '',
    intake_status: 'draft',

    // Phase 2: Governance & Authority (Section A)
    executive_user_id: fromMandate?.executive_user_id || '',
    executive_name: (fromMandate?.proposed_executive_name && !fromMandate?.executive_user_id)
      ? fromMandate.proposed_executive_name
      : '',
    board_required: fromMandate ? true : null,   // default Yes when from mandate
    // Default Funding / Approving authority from the same Executive / Sponsor proposed on the mandate
    funding_authority_user_id: fromMandate?.executive_user_id || '',
    funding_authority_name: (!fromMandate?.executive_user_id && fromMandate?.proposed_executive_name)
      ? fromMandate.proposed_executive_name
      : '',
    approving_authority_user_id: fromMandate?.executive_user_id || '',
    approving_authority_name: (!fromMandate?.executive_user_id && fromMandate?.proposed_executive_name)
      ? fromMandate.proposed_executive_name
      : '',

    // Phase 2: Business Justification (Section B)
    // When arriving from mandate, business_objective defaults from Project Objectives (4) as one item per line.
    business_objective: fromMandate?.business_objective || '',
    strategic_alignment: fromMandate?.strategic_alignment || '',
    expected_benefits_summary: fromMandate?.expected_benefits_summary || '',
    benefit_owner_user_id: '',
    benefit_owner_name: '',                      // text fallback for named contacts

    // Phase 2: Lifecycle & Controls (Section C)
    delivery_methodology: 'Waterfall',
    lifecycle_template: '',
    stage_model: '',
    stage_gate_enforcement: 'required',
    tolerance_time_days: '',
    tolerance_cost_percentage: '',
    tolerance_scope_description: '',
    tolerance_quality_description: '',
    tolerance_risk_description: '',
    tolerance_benefits_description: '',

    // Phase 2: Financial Controls (Section D)
    budget_currency: 'USD',
    budget_type: '',
    budget_categories: [], // { category_name, amount, funding_source_id }
    budget_approval_status: '',

    // Phase 2: Risk & Complexity (Section E)
    initial_risk_rating: '',
    complexity_rating: '',
    delivery_complexity: '',
    regulatory_impact: null,
    data_sensitivity: '',
    estimated_effort: '',
    key_skills_required: '',
    external_vendors_required: null,

    // Phase 2: Document Governance (Section F)
    mandate_status: fromMandate?.mandate_status || '',
    business_case_status: '',
    rfp_reference: '',
    funding_approval_status: '',
    document_repository_url: ''
  })

  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [budgetCategories, setBudgetCategories] = useState([])
  const [lifecycleTemplates, setLifecycleTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState({})

  // Phase 2: Tab navigation state
  const [activeTab, setActiveTab] = useState('details')

  // Apply mandate defaults from location.state when present (handles remount / same-route navigation)
  useEffect(() => {
    const fm = location.state?.fromMandate
    if (!fm) return
    setFormData(prev => ({
      ...prev,
      project_name: fm.project_name ?? prev.project_name,
      project_description: fm.project_description ?? prev.project_description,
      executive_user_id: fm.executive_user_id ?? prev.executive_user_id,
      executive_name: (fm.proposed_executive_name && !fm.executive_user_id)
        ? (prev.executive_name || fm.proposed_executive_name)
        : prev.executive_name,
      board_required: prev.board_required != null ? prev.board_required : (fm ? true : null),
      // Only default Funding / Approving authority when fields are still empty so user edits win
      funding_authority_user_id: prev.funding_authority_user_id || fm.executive_user_id || '',
      funding_authority_name: prev.funding_authority_name
        || ((!fm.executive_user_id && fm.proposed_executive_name) ? fm.proposed_executive_name : ''),
      approving_authority_user_id: prev.approving_authority_user_id || fm.executive_user_id || '',
      approving_authority_name: prev.approving_authority_name
        || ((!fm.executive_user_id && fm.proposed_executive_name) ? fm.proposed_executive_name : ''),
      business_objective: fm.business_objective ?? prev.business_objective,
      strategic_alignment: fm.strategic_alignment ?? prev.strategic_alignment,
      expected_benefits_summary: fm.expected_benefits_summary ?? prev.expected_benefits_summary,
      mandate_status: fm.mandate_status ?? prev.mandate_status,
    }))
  }, [location.key])

  // Display label for source mandate – set from state or from mandate fetched via URL
  const [sourceMandateLabel, setSourceMandateLabel] = useState(
    () => fromMandate?.mandateReference || mandateIdFromProjectCode || fromMandateParam || null
  )

  // When URL has projectCode (PRJ-xxx) or legacy param: use fromMandate immediately (no fetch), else fetch minimal prefill.
  useEffect(() => {
    if (!mandateParamToFetch) return

    // We already have prefill from navigation state — no network, apply linking only (milliseconds).
    const fm = location.state?.fromMandate
    if (fm && (fm.project_name || fm.mandateTitle) && (fm.project_description || fm.purpose)) {
      mandateIdForLinkingRef.current = fm.mandateId || fm.id || null
      setSourceMandateLabel(fm.mandateReference || mandateIdFromProjectCode || fromMandateParam || '')
      const codeForUrl = projectCodeFromUrl || (fm.mandateReference ? `PRJ-${fm.mandateReference}` : null)
      if (codeForUrl) setSearchParams({ projectCode: codeForUrl }, { replace: true })
      return
    }

    let cancelled = false
    getMandatePrefill(mandateParamToFetch)
      .then((m) => {
        if (!m || cancelled) return
        mandateIdForLinkingRef.current = m.id
        setSourceMandateLabel(m.mandate_reference || m.id)
        let objectivesText = ''
        try {
          const parsed = JSON.parse(m.project_objectives || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) objectivesText = parsed.join('\n')
          else objectivesText = m.project_objectives || ''
        } catch {
          objectivesText = m.project_objectives || ''
        }
        const defaultCode = m.mandate_reference ? `PRJ-${m.mandate_reference}` : null
        setFormData(prev => ({
          ...prev,
          project_name: m.mandate_title ?? prev.project_name,
          project_description: m.purpose ?? prev.project_description,
          project_code: prev.project_code || defaultCode || prev.project_code,
          executive_user_id: m.proposed_executive_id ?? prev.executive_user_id,
          executive_name: (m.proposed_executive_name && !m.proposed_executive_id)
            ? (prev.executive_name || m.proposed_executive_name)
            : prev.executive_name,
          board_required: true,
          funding_authority_user_id: prev.funding_authority_user_id || m.proposed_executive_id || null,
          funding_authority_name: prev.funding_authority_name
            || ((!m.proposed_executive_id && m.proposed_executive_name) ? m.proposed_executive_name : ''),
          approving_authority_user_id: prev.approving_authority_user_id || m.proposed_executive_id || null,
          approving_authority_name: prev.approving_authority_name
            || ((!m.proposed_executive_id && m.proposed_executive_name) ? m.proposed_executive_name : ''),
          business_objective: objectivesText || m.purpose || prev.business_objective,
          strategic_alignment: m.outline_business_case ?? prev.strategic_alignment,
          expected_benefits_summary: m.outline_business_case ?? prev.expected_benefits_summary,
          mandate_status: 'approved',
        }))
        const codeForUrl = projectCodeFromUrl || (m.mandate_reference ? `PRJ-${m.mandate_reference}` : null)
        if (codeForUrl) setSearchParams({ projectCode: codeForUrl }, { replace: true })
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load mandate for prefill:', err)
      })
    return () => { cancelled = true }
  }, [mandateParamToFetch, location.state?.fromMandate, projectCodeFromUrl, mandateIdFromProjectCode, fromMandateParam])

  // PMO admin flag (used for authorisation actions visibility)
  const [isPmoAdmin, setIsPmoAdmin] = useState(false)

  // Phase 3: Readiness validation state
  const [createdProjectId, setCreatedProjectId] = useState(null)
  const [readinessData, setReadinessData] = useState(null)
  const [isValidatingReadiness, setIsValidatingReadiness] = useState(false)

  // Phase 4: Authorisation state
  const [intakeStatus, setIntakeStatus] = useState('draft')
  const [isProcessingAuthorisation, setIsProcessingAuthorisation] = useState(false)

  // Phase 5: Portfolio & Programme assignment state
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
  const [selectedPortfolio, setSelectedPortfolio] = useState(null)
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(null)
  const [selectedProgramme, setSelectedProgramme] = useState(null)

  // Draft Queue Integration
  const {
    saveStatus,
    draftCount,
    canCreateDraft,
    autoSave,
    existingDraftInfo,
    dismissExistingDraft
  } = useDraftQueue('project', null, {
    formRoute: '/app/projects/create',
    autoSaveEnabled: false // Manual hold only for now
  })

  // 2-phase parallel fetch — collapses 8-10 sequential queries into 2 parallel batches
  useEffect(() => {
    let isMounted = true

    const initializePageData = async () => {
      try {
        // Auth uses cached JWT — no network round-trip
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigate('/login', { replace: true }); return }

        // Show form immediately while data loads in background
        if (isMounted) setDataLoading(false)

        // ── Phase 1: core dropdown lookups fire in parallel ───────────────────
        const [userResult, typesResult, statusesResult] = await Promise.all([
          supabase.from('users').select('id').eq('auth_user_id', user.id).single(),
          supabase.from('project_types').select('id, type_name, type_code').eq('is_active', true).eq('is_deleted', false).order('type_name', { ascending: true }),
          supabase.from('project_statuses').select('id, status_name, status_code').eq('is_active', true).eq('is_deleted', false).order('status_name', { ascending: true }),
        ])

        if (!isMounted) return

        const internalUserId = userResult.data?.id
        if (!internalUserId) {
          navigate('/onboarding/organisation-setup', { replace: true })
          return
        }

        // ── Phase 2: org check + PMO admin check — both parallel ─────────────
        // Old code: sequential isPmoAdmin(users→user_roles) then serial getOrganisationUsers
        // New code: org + user_roles in parallel — just 2 queries total
        const [orgResult, userRolesResult] = await Promise.all([
          supabase.from('accounts').select('id, organisation_verified').eq('owner_user_id', internalUserId).maybeSingle(),
          supabase.from('user_roles').select('is_active, roles:role_id(role_name)').eq('user_id', internalUserId).eq('is_active', true),
        ])

        if (!isMounted) return

        if (!orgResult.data) {
          navigate('/onboarding/organisation-setup', { replace: true })
          return
        }

        const isAdmin = (userRolesResult.data || []).some(ur => ur.roles?.role_name === 'pmo_admin')

        // Set dropdown state (lifecycle templates loaded when user opens Delivery tab)
        const types = typesResult.data || []
        const statuses = statusesResult.data || []
        setProjectTypes(types)
        setProjectStatuses(statuses)
        if (statuses.length > 0 || types.length > 0) {
          setFormData(prev => ({
            ...prev,
            project_status_id: prev.project_status_id || statuses[0]?.id || '',
            project_type_id: prev.project_type_id || types[0]?.id || '',
          }))
        }

        setIsPmoAdmin(isAdmin)

        if (typesResult.error && statusesResult.error) {
          setErrors({ submit: 'Failed to load required dropdown data.' })
        }

      } catch (error) {
        if (!isMounted) return
        console.error('Error initializing page:', error)
        setErrors({ submit: `Failed to load page data: ${error.message || 'Unknown error'}` })
      }
    }

    initializePageData()
    return () => { isMounted = false }
  }, [navigate])

  // Load funding sources and budget categories for Financial tab (PMO-managed lists)
  const loadFinancialLookups = useCallback(() => {
    Promise.all([
      getFundingSources(),
      getBudgetCategories()
    ])
      .then(([fundingResult, categoryResult]) => {
        if (fundingResult?.success && Array.isArray(fundingResult.data)) {
          setFundingSources(fundingResult.data)
        }
        if (categoryResult?.success && Array.isArray(categoryResult.data)) {
          setBudgetCategories(categoryResult.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load financial lookups:', err)
      })
  }, [])

  useEffect(() => { loadFinancialLookups() }, [loadFinancialLookups])

  // Load lifecycle templates when user opens Delivery tab (avoids blocking initial load if table missing)
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

  // Refetch when user switches to Financial tab so lists are fresh (handles late auth or first load)
  const prevFinancialTabRef = useRef(false)
  useEffect(() => {
    const onFinancial = activeTab === 'financial'
    if (onFinancial && !prevFinancialTabRef.current) loadFinancialLookups()
    prevFinancialTabRef.current = onFinancial
  }, [activeTab, loadFinancialLookups])

  // Keep formDataRef in sync so validateForm can read latest values without a dep
  formDataRef.current = formData

  const handleBudgetCategoriesChange = useCallback((categories) => {
    setFormData(prev => ({ ...prev, budget_categories: categories }))
  }, [])

  // Optimized: Memoized handler without errors dependency
  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => {
      if (prev[name]) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return prev
    })
    // Keep URL in sync with project code (user-facing)
    if (name === 'project_code') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value && value.trim()) next.set('projectCode', value.trim())
        else next.delete('projectCode')
        return next
      }, { replace: true })
    }
  }, [setSearchParams])

  // Stable SearchableSelect onChange handlers – no captured state, so they never
  // recreate across renders and won't trigger downstream child re-renders.
  const handleProjectTypeChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, project_type_id: value }))
    setErrors(prev => {
      if (!prev.project_type_id) return prev
      const next = { ...prev }
      delete next.project_type_id
      return next
    })
  }, [])

  // Governance authority fields (Executive, Funding, Approving) are simple text; update name and clear user_id.
  const handleAuthorityNameChange = useCallback((nameField, idField) => (value) => {
    setFormData(prev => ({ ...prev, [nameField]: value || '', [idField]: '' }))
  }, [])

  const handleProjectStatusChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, project_status_id: value }))
    setErrors(prev => {
      if (!prev.project_status_id) return prev
      const next = { ...prev }
      delete next.project_status_id
      return next
    })
  }, [])

  // Stable validateForm – reads formDataRef so it never needs formData as a dep.
  // This prevents handleSubmit from recreating on every keystroke.
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

    if (!(data.executive_user_id || (data.executive_name && data.executive_name.trim()))) {
      newErrors.executive_name = 'Project Executive / Sponsor is required'
    }
    if (!(data.funding_authority_user_id || (data.funding_authority_name && data.funding_authority_name.trim()))) {
      newErrors.funding_authority_name = 'Funding Authority is required'
    }
    if (!(data.approving_authority_user_id || (data.approving_authority_name && data.approving_authority_name.trim()))) {
      newErrors.approving_authority_name = 'Approving Authority is required'
    }

    if (data.start_date && data.end_date) {
      if (new Date(data.start_date) > new Date(data.end_date)) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    // At least one tolerance (time or cost) must have at least one value
    const timeLines = (data.tolerance_time_days || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const costLines = (data.tolerance_cost_percentage || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (timeLines.length === 0 && costLines.length === 0) {
      newErrors.tolerances = 'At least one tolerance (time or cost) must be defined for authorisation'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [])

  const handleSubmit = useCallback(async (e, isDraft = false) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setErrors({}) // Clear previous errors

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Generate project code if not provided
      const projectCode = formData.project_code || `PRJ-${Date.now().toString().slice(-6)}`

      // Phase 3: Check if updating existing draft or creating new project
      const isUpdate = createdProjectId !== null

      // Prepare project data
      const projectData = {
          // Basic project fields
          project_name: formData.project_name,
          project_description: formData.project_description || null,
          project_code: projectCode,
          project_type_id: formData.project_type_id,
          status_id: formData.project_status_id,
          planned_start_date: formData.start_date || null,
          planned_end_date: formData.end_date || null,
          owner_user_id: user.id,
          created_by: user.id,

          // Phase 1: Intake lifecycle
          intake_status: formData.intake_status || 'draft',
          created_by_user_id: user.id,

          // Phase 2: Governance & Authority (Section A)
          executive_user_id: formData.executive_user_id || null,
          executive_name: formData.executive_name || null,
          board_required: formData.board_required,
          funding_authority_user_id: formData.funding_authority_user_id || null,
          funding_authority_name: formData.funding_authority_name || null,
          approving_authority_user_id: formData.approving_authority_user_id || null,
          approving_authority_name: formData.approving_authority_name || null,

          // Phase 2: Business Justification (Section B)
          business_objective: formData.business_objective || null,
          strategic_alignment: formData.strategic_alignment || null,
          expected_benefits_summary: formData.expected_benefits_summary || null,
          benefit_owner_user_id: formData.benefit_owner_user_id || null,
          benefit_owner_name: formData.benefit_owner_name || null,

          // Phase 2: Lifecycle & Controls (Section C)
          delivery_methodology: formData.delivery_methodology || null,
          lifecycle_template: formData.lifecycle_template || null,
          stage_model: formData.stage_model || null,
          stage_gate_enforcement: formData.stage_gate_enforcement || 'required',
          tolerance_time_days: (formData.tolerance_time_days || '').trim() || null,
          tolerance_cost_percentage: (formData.tolerance_cost_percentage || '').trim() || null,
          tolerance_scope_description: formData.tolerance_scope_description || null,
          tolerance_quality_description: formData.tolerance_quality_description || null,
          tolerance_risk_description: formData.tolerance_risk_description || null,
          tolerance_benefits_description: formData.tolerance_benefits_description || null,

          // Phase 2: Financial Controls (Section D)
          budget_currency: formData.budget_currency || 'USD',
          budget_type: formData.budget_type || null,
          budget_amount: (() => {
            const cats = formData.budget_categories || []
            const sum = cats.reduce((s, c) => s + (Number(c.amount) || 0), 0)
            return sum > 0 ? sum : null
          })(),
          funding_source: null,
          budget_approval_status: formData.budget_approval_status || null,

          // Phase 2: Risk & Complexity (Section E)
          initial_risk_rating: formData.initial_risk_rating || null,
          complexity_rating: formData.complexity_rating || null,
          delivery_complexity: formData.delivery_complexity || null,
          regulatory_impact: formData.regulatory_impact,
          data_sensitivity: formData.data_sensitivity || null,
          estimated_effort: formData.estimated_effort || null,
          key_skills_required: formData.key_skills_required || null,
          external_vendors_required: formData.external_vendors_required,

          // Phase 2: Document Governance (Section F)
          mandate_status: formData.mandate_status || null,
          business_case_status: formData.business_case_status || null,
          rfp_reference: formData.rfp_reference || null,
          funding_approval_status: formData.funding_approval_status || null,
          document_repository_url: formData.document_repository_url || null
      }

      // Execute insert or update based on whether project exists
      let project, projectError

      if (isUpdate) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...projectData,
            updated_by: user.id
          })
          .eq('id', createdProjectId)
          .select()
          .single()

        project = data
        projectError = error
      } else {
        // Insert new project
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single()

        project = data
        projectError = error
      }

      if (projectError) {
        console.error('Project operation error:', projectError)
        throw projectError
      }

      if (!project || !project.id) {
        throw new Error('Project operation failed - no ID returned')
      }

      // Save budget categories (if any)
      const categories = formData.budget_categories || []
      const toSave = categories
        .filter(c => (c.category_name && (c.category_name + '').trim()) || (Number(c.amount) || 0) > 0)
        .map(c => ({
          category_name: (c.category_name || '').trim() || 'Unnamed',
          budget_amount: Number(c.amount) || 0,
          funding_source_id: c.funding_source_id || null
        }))
      if (toSave.length > 0) {
        try {
          await saveForProject(project.id, toSave)
        } catch (err) {
          console.error('Failed to save budget categories:', err)
        }
      }

      // Phase 3: Store project ID for readiness validation
      setCreatedProjectId(project.id)

      // Phase 5: Link portfolio if selected (only on new project, not draft update)
      if (!isUpdate && selectedPortfolioId) {
        try {
          await addProjectToPortfolio(selectedPortfolioId, project.id)
        } catch (err) {
          console.error('Failed to link portfolio to project:', err)
        }
      }

      // Phase 5: Link programme if selected (only on new project, not draft update)
      if (!isUpdate && selectedProgrammeId) {
        try {
          await addProjectToProgramme(selectedProgrammeId, project.id)
        } catch (err) {
          console.error('Failed to link programme to project:', err)
        }
      }

      // Link mandate to newly created project (if arriving from mandate view or URL param)
      const mandateIdToLink = fromMandate?.mandateId ?? mandateIdForLinkingRef.current
      if (!isDraft && mandateIdToLink) {
        try {
          await linkMandateToProject(mandateIdToLink, project.id)
        } catch (linkErr) {
          // Non-fatal: project was created; log the linking failure
          console.error('Failed to link mandate to project:', linkErr)
        }
      }

      setLoading(false)

      // Only navigate if not saving as draft
      if (!isDraft) {
        navigate(`/app/projects/${project.id}`)
      }
    } catch (error) {
      const errorMessage = error.message || error.details || 'Failed to create project. Please try again.'
      setErrors({ submit: errorMessage })
      setLoading(false)
    }
  }, [formData, validateForm, isPmoAdmin, navigate, fromMandate])

  // Phase 3: Readiness validation handler
  const handleValidateReadiness = useCallback(async () => {
    if (!createdProjectId) {
      setErrors(prev => ({ ...prev, readiness: 'Please save the project as a draft first' }))
      return
    }

    try {
      setIsValidatingReadiness(true)
      setErrors(prev => {
        const next = { ...prev }
        delete next.readiness
        return next
      })

      const { data, error } = await supabase.rpc('validate_project_readiness', {
        p_project_id: createdProjectId
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Validation failed')
      }

      setReadinessData({
        readiness_status: data.readiness_status,
        issues: data.issues || [],
        issues_count: data.issues_count || 0
      })
    } catch (error) {
      console.error('Readiness validation error:', error)
      setErrors(prev => ({
        ...prev,
        readiness: error.message || 'Failed to validate project readiness'
      }))
    } finally {
      setIsValidatingReadiness(false)
    }
  }, [createdProjectId])

  // Phase 4: Authorisation handlers
  const handleAuthoriseProject = useCallback(async () => {
    if (!createdProjectId) {
      setErrors(prev => ({ ...prev, authorisation: 'No project to authorise' }))
      return
    }

    try {
      setIsProcessingAuthorisation(true)
      setErrors(prev => {
        const next = { ...prev }
        delete next.authorisation
        return next
      })

      const { data, error } = await supabase.rpc('authorise_project', {
        p_project_id: createdProjectId
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Authorisation failed')
      }

      setIntakeStatus('authorised')
      setErrors(prev => ({
        ...prev,
        authorisation: null,
        success: 'Project authorised successfully! The project is now ready for execution.'
      }))

      // Navigate to project detail after short delay
      setTimeout(() => {
        navigate(`/app/projects/${createdProjectId}`)
      }, 2000)
    } catch (error) {
      console.error('Authorisation error:', error)
      setErrors(prev => ({
        ...prev,
        authorisation: error.message || 'Failed to authorise project'
      }))
    } finally {
      setIsProcessingAuthorisation(false)
    }
  }, [createdProjectId, navigate])

  const handleRejectProject = useCallback(async (reason) => {
    if (!createdProjectId) {
      setErrors(prev => ({ ...prev, authorisation: 'No project to reject' }))
      return
    }

    try {
      setIsProcessingAuthorisation(true)
      setErrors(prev => {
        const next = { ...prev }
        delete next.authorisation
        return next
      })

      const { data, error } = await supabase.rpc('reject_project', {
        p_project_id: createdProjectId,
        p_rejection_reason: reason
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Rejection failed')
      }

      setIntakeStatus('rejected')
      setErrors(prev => ({
        ...prev,
        authorisation: null,
        success: 'Project rejected successfully.'
      }))
    } catch (error) {
      console.error('Rejection error:', error)
      setErrors(prev => ({
        ...prev,
        authorisation: error.message || 'Failed to reject project'
      }))
    } finally {
      setIsProcessingAuthorisation(false)
    }
  }, [createdProjectId])

  const handleSuspendProject = useCallback(async (reason) => {
    if (!createdProjectId) {
      setErrors(prev => ({ ...prev, authorisation: 'No project to suspend' }))
      return
    }

    try {
      setIsProcessingAuthorisation(true)
      setErrors(prev => {
        const next = { ...prev }
        delete next.authorisation
        return next
      })

      const { data, error } = await supabase.rpc('suspend_project', {
        p_project_id: createdProjectId,
        p_suspended_reason: reason
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Suspension failed')
      }

      setIntakeStatus('suspended')
      setErrors(prev => ({
        ...prev,
        authorisation: null,
        success: 'Project suspended successfully.'
      }))
    } catch (error) {
      console.error('Suspension error:', error)
      setErrors(prev => ({
        ...prev,
        authorisation: error.message || 'Failed to suspend project'
      }))
    } finally {
      setIsProcessingAuthorisation(false)
    }
  }, [createdProjectId])

  // Optimized: Memoized options with stable references for SearchableSelect
  const projectTypeOptions = useMemo(() => {
    if (!projectTypes.length) return []
    return projectTypes.map((type) => ({
      value: type.id,
      label: type.type_name || 'Unnamed'
    }))
  }, [projectTypes])

  const statusOptions = useMemo(() => {
    if (!projectStatuses.length) return []
    return projectStatuses.map((status) => ({
      value: status.id,
      label: status.status_name || 'Unnamed'
    }))
  }, [projectStatuses])

  // Memoized subset passed to ProjectFormTabs so tab-bar only re-renders when
  // its own indicator fields change (not on every budget/date/code keystroke).
  const tabCompletionData = useMemo(() => ({
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
  }), [
    formData.project_name, formData.project_description,
    formData.executive_user_id, formData.executive_name, formData.board_required,
    formData.funding_authority_user_id, formData.funding_authority_name,
    formData.approving_authority_user_id, formData.approving_authority_name,
    formData.business_objective, formData.strategic_alignment,
    formData.expected_benefits_summary, formData.benefit_owner_user_id, formData.benefit_owner_name,
    formData.delivery_methodology, formData.lifecycle_template,
    formData.stage_model, formData.stage_gate_enforcement,
    formData.tolerance_time_days, formData.tolerance_cost_percentage,
    formData.tolerance_scope_description, formData.tolerance_quality_description,
    formData.tolerance_risk_description, formData.tolerance_benefits_description,
    formData.budget_type, formData.budget_categories, formData.budget_approval_status,
    formData.initial_risk_rating, formData.complexity_rating, formData.delivery_complexity,
    formData.regulatory_impact, formData.data_sensitivity, formData.estimated_effort,
    formData.key_skills_required, formData.external_vendors_required,
    formData.mandate_status, formData.business_case_status, formData.funding_approval_status,
    formData.rfp_reference, formData.document_repository_url,
    selectedPortfolioId, selectedProgrammeId,
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Project
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Fill in the details to create your new project
            </p>
          </div>
          <ExportRecordMenu
            sections={PROJECT_CREATE_EXPORT_SECTIONS}
            record={formData}
            baseFilename={formData.project_code || formData.project_name ? `Project_Draft_${(formData.project_code || formData.project_name || '').replace(/\s+/g, '_').slice(0, 40)}` : 'NewProject_Draft'}
            disabled={false}
          />
        </div>
      </div>

      {/* Mandate pre-fill banner */}
      {fromMandate && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-500 bg-green-900/20 px-4 py-3 text-green-300">
          <span className="mt-0.5 shrink-0 text-green-400">&#10003;</span>
          <p className="text-sm">
            <span className="font-semibold">Creating project from Mandate: {fromMandate.mandateReference}</span>
            {' '}— key fields have been pre-filled from the approved mandate. Review and complete any remaining required fields below.
          </p>
        </div>
      )}

      {/* Read-only: source mandate for this new project (above step navigation) */}
      {sourceMandateLabel && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Source mandate
          </label>
          <div
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-mono text-sm"
            aria-readonly
          >
            {sourceMandateLabel}
          </div>
        </div>
      )}

      {/* Phase 2: Tab Navigation */}
      <ProjectFormTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formData={tabCompletionData}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProjectWizardPanels
          mode="create"
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
          budgetCategories={budgetCategories}
          handleBudgetCategoriesChange={handleBudgetCategoriesChange}
          selectedPortfolioId={selectedPortfolioId}
          selectedPortfolio={selectedPortfolio}
          onPortfolioChange={(id, p) => { setSelectedPortfolioId(id); setSelectedPortfolio(p) }}
          selectedProgrammeId={selectedProgrammeId}
          selectedProgramme={selectedProgramme}
          onProgrammeChange={(id, p) => { setSelectedProgrammeId(id); setSelectedProgramme(p) }}
        />

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Phase 3: Readiness Validation Panel */}
        {createdProjectId && (
          <div className="mt-6">
            <ReadinessPanel
              readinessData={readinessData}
              onValidate={handleValidateReadiness}
              isValidating={isValidatingReadiness}
              projectId={createdProjectId}
            />
          </div>
        )}

        {/* Phase 4: Authorisation Actions */}
        {createdProjectId && isPmoAdmin && (
          <div className="mt-6">
            <AuthorisationActions
              projectId={createdProjectId}
              readinessStatus={readinessData?.readiness_status}
              isPmoAdmin={isPmoAdmin}
              intakeStatus={intakeStatus}
              onAuthorise={handleAuthoriseProject}
              onReject={handleRejectProject}
              onSuspend={handleSuspendProject}
              isProcessing={isProcessingAuthorisation}
            />
          </div>
        )}

        {/* Success Message */}
        {errors.success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">{errors.success}</p>
          </div>
        )}

        {/* Authorisation Error Message */}
        {errors.authorisation && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.authorisation}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <HoldButton
            entityType="project"
            formData={formData}
            formRoute="/app/projects/create"
            onHoldComplete={() => navigate('/app/projects')}
            disabled={loading}
          />
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : createdProjectId ? 'Update Draft' : 'Save Draft'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
