import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { checkOrganisationStatusByAuthId } from '../services/postLoginRouter'
import { UserPlus, X, Loader } from 'lucide-react'

// Phase 2: Import governance section components
import GovernanceSection from '../components/project/GovernanceSection'
import BusinessJustificationSection from '../components/project/BusinessJustificationSection'
import LifecycleControlsSection from '../components/project/LifecycleControlsSection'
import FinancialControlsSection from '../components/project/FinancialControlsSection'
import RiskComplexitySection from '../components/project/RiskComplexitySection'
import DocumentGovernanceSection from '../components/project/DocumentGovernanceSection'
import ProjectFormTabs from '../components/project/ProjectFormTabs'

// Phase 3: Import readiness validation component
import ReadinessPanel from '../components/project/ReadinessPanel'

// Phase 4: Import authorisation actions component
import AuthorisationActions from '../components/project/AuthorisationActions'

// Lazy load role assignment services only when needed
const loadRoleServices = () => Promise.all([
  import('../services/organisationRoleService'),
  import('../services/projectRoleAssignmentService')
])

// Removed skeleton loader for faster initial render

export default function ProjectsCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedMethodology = location.state?.selectedMethodology

  const [formData, setFormData] = useState({
    // Phase 1: Basic project fields
    project_name: '',
    project_description: '',
    project_type_id: '',
    project_status_id: '',
    methodology_id: selectedMethodology?.id || '',
    start_date: '',
    end_date: '',
    budget: '',
    project_code: '',
    intake_status: 'draft',

    // Phase 2: Governance & Authority (Section A)
    executive_user_id: '',
    board_required: null,
    funding_authority_user_id: '',
    approving_authority_user_id: '',

    // Phase 2: Business Justification (Section B)
    business_objective: '',
    strategic_alignment: '',
    expected_benefits_summary: '',
    benefit_owner_user_id: '',

    // Phase 2: Lifecycle & Controls (Section C)
    delivery_methodology: '',
    lifecycle_template: '',
    stage_model: '',
    stage_gate_enforcement: 'required',
    tolerance_time_days: '',
    tolerance_cost_percentage: '',
    tolerance_scope_description: '',

    // Phase 2: Financial Controls (Section D)
    budget_currency: 'USD',
    budget_type: '',
    funding_source: '',
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
    mandate_status: '',
    business_case_status: '',
    rfp_reference: '',
    funding_approval_status: '',
    document_repository_url: ''
  })

  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [methodologies, setMethodologies] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState({})

  // Phase 2: Tab navigation state
  const [activeTab, setActiveTab] = useState('details')

  // Role assignment state (lazy loaded)
  const [isPmoAdmin, setIsPmoAdmin] = useState(false)
  const [organisationUsers, setOrganisationUsers] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const [roleAssignments, setRoleAssignments] = useState([])
  const [showRoleAssignment, setShowRoleAssignment] = useState(false)
  const [roleServicesLoaded, setRoleServicesLoaded] = useState(false)

  // Phase 3: Readiness validation state
  const [createdProjectId, setCreatedProjectId] = useState(null)
  const [readinessData, setReadinessData] = useState(null)
  const [isValidatingReadiness, setIsValidatingReadiness] = useState(false)

  // Phase 4: Authorisation state
  const [intakeStatus, setIntakeStatus] = useState('draft')
  const [isProcessingAuthorisation, setIsProcessingAuthorisation] = useState(false)

  // Optimized: Progressive loading - show form immediately, load data in background
  useEffect(() => {
    let isMounted = true
    
    const initializePageData = async () => {
      try {
        // Get current user first (fast check)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          navigate('/login', { replace: true })
          return
        }

        // Show form immediately (set loading false early for better UX)
        if (isMounted) {
          setDataLoading(false)
        }

        // Run all checks and data fetches IN PARALLEL with optimized queries
        // Only select needed columns and filter at database level
        const [orgStatus, typesResult, statusesResult, methodsResult] = await Promise.all([
          checkOrganisationStatusByAuthId(user.id),
          supabase
            .from('project_types')
            .select('id, type_name, type_code')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('type_name', { ascending: true }),
          supabase
            .from('project_statuses')
            .select('id, status_name, status_code')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('status_name', { ascending: true }),
          supabase
            .from('methodologies')
            .select('id, methodology_name, methodology_code')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .order('methodology_name', { ascending: true })
        ])

        if (!isMounted) return

        // Check organisation status (defer to avoid blocking)
        if (!orgStatus.exists) {
          navigate('/onboarding/organisation-setup', { replace: true })
          return
        }

        // Set data (already sorted by database)
        const types = typesResult.data || []
        const statuses = statusesResult.data || []
        const methods = methodsResult.data || []

        setProjectTypes(types)
        setProjectStatuses(statuses)
        setMethodologies(methods)

        // Set defaults in one batch update (use first item as default)
        if (statuses.length > 0 || types.length > 0) {
          setFormData(prev => ({
            ...prev,
            project_status_id: prev.project_status_id || statuses[0]?.id || '',
            project_type_id: prev.project_type_id || types[0]?.id || ''
          }))
        }

        // Handle errors silently for non-critical data
        if (typesResult.error || statusesResult.error || methodsResult.error) {
          const errorDetails = []
          if (typesResult.error) errorDetails.push('project types')
          if (statusesResult.error) errorDetails.push('project statuses')
          if (methodsResult.error) errorDetails.push('methodologies')
          
          // Only show error if critical data is missing
          if (typesResult.error && statusesResult.error) {
            setErrors({
              submit: `Failed to load required data: ${errorDetails.join(', ')}`
            })
          }
        }

      } catch (error) {
        if (!isMounted) return
        console.error('Error initializing page:', error)
        setErrors({
          submit: `Failed to load page data: ${error.message || 'Unknown error'}`
        })
      }
    }

    initializePageData()
    
    return () => {
      isMounted = false
    }
  }, [navigate])

  // Optimized: Lazy load role assignment services only when button is clicked
  useEffect(() => {
    if (showRoleAssignment && !roleServicesLoaded) {
      let isMounted = true
      
      const loadRoleData = async () => {
        try {
          const [orgRoleService, roleAssignmentService] = await loadRoleServices()

          const { data: { user } } = await supabase.auth.getUser()
          if (!user || !isMounted) return

          // Check if user is PMO Admin and fetch data in parallel
          const [isAdmin, usersResult, rolesResult] = await Promise.all([
            orgRoleService.isPmoAdmin(user.id),
            orgRoleService.getOrganisationUsers(user.id),
            roleAssignmentService.getAvailableProjectRoles()
          ])

          if (!isMounted) return

          setIsPmoAdmin(isAdmin)
          setOrganisationUsers(usersResult?.data || usersResult || [])
          setAvailableRoles(rolesResult?.data || rolesResult || [])
          setRoleServicesLoaded(true)
        } catch (error) {
          if (isMounted) {
            // Silent error handling
          }
        }
      }

      loadRoleData()
      
      return () => {
        isMounted = false
      }
    }
  }, [showRoleAssignment, roleServicesLoaded])

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
  }, [])

  const validateForm = useCallback(() => {
    const newErrors = {}

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required'
    }

    if (!formData.methodology_id) {
      newErrors.methodology_id = 'Please select a methodology'
    }

    if (!formData.project_type_id) {
      newErrors.project_type_id = 'Please select a project type'
    }

    if (!formData.project_status_id) {
      newErrors.project_status_id = 'Please select a project status'
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

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
          budget_amount: formData.budget ? parseFloat(formData.budget) : null,
          owner_user_id: user.id,
          created_by: user.id,

          // Phase 1: Intake lifecycle
          intake_status: formData.intake_status || 'draft',
          created_by_user_id: user.id,

          // Phase 2: Governance & Authority (Section A)
          executive_user_id: formData.executive_user_id || null,
          board_required: formData.board_required,
          funding_authority_user_id: formData.funding_authority_user_id || null,
          approving_authority_user_id: formData.approving_authority_user_id || null,

          // Phase 2: Business Justification (Section B)
          business_objective: formData.business_objective || null,
          strategic_alignment: formData.strategic_alignment || null,
          expected_benefits_summary: formData.expected_benefits_summary || null,
          benefit_owner_user_id: formData.benefit_owner_user_id || null,

          // Phase 2: Lifecycle & Controls (Section C)
          delivery_methodology: formData.delivery_methodology || null,
          lifecycle_template: formData.lifecycle_template || null,
          stage_model: formData.stage_model || null,
          stage_gate_enforcement: formData.stage_gate_enforcement || 'required',
          tolerance_time_days: formData.tolerance_time_days ? parseInt(formData.tolerance_time_days) : null,
          tolerance_cost_percentage: formData.tolerance_cost_percentage ? parseFloat(formData.tolerance_cost_percentage) : null,
          tolerance_scope_description: formData.tolerance_scope_description || null,

          // Phase 2: Financial Controls (Section D)
          budget_currency: formData.budget_currency || 'USD',
          budget_type: formData.budget_type || null,
          funding_source: formData.funding_source || null,
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

      // Link methodology and assign roles in parallel (if applicable)
      const postCreationTasks = []
      const postCreationErrors = []

      // Add methodology link (only for new projects)
      if (formData.methodology_id && !isUpdate) {
        postCreationTasks.push(
          supabase
            .from('project_methodologies')
            .insert({
              project_id: project.id,
              methodology_id: formData.methodology_id,
              is_active: true,
              created_by: user.id
            })
            .then(result => {
              if (result.error) {
                postCreationErrors.push(`Failed to link methodology: ${result.error.message}`)
                throw result.error
              }
              return result
            })
            .catch(err => {
              postCreationErrors.push(`Failed to link methodology: ${err.message || 'Unknown error'}`)
              return Promise.reject(err)
            })
        )
      }

      // Add role assignments if applicable
      if (isPmoAdmin && roleAssignments.length > 0 && roleServicesLoaded) {
        try {
          const { assignProjectRolesDuringCreation } = await import('../services/projectRoleAssignmentService')
          postCreationTasks.push(
            assignProjectRolesDuringCreation(
              project.id,
              roleAssignments.map(ra => ({
                userId: ra.userId,
                roleName: ra.roleName
              })),
              user.id
            )
            .then(result => {
              if (!result.success) {
                postCreationErrors.push(`Failed to assign roles: ${result.error || 'Unknown error'}`)
              }
              return result
            })
            .catch(err => {
              postCreationErrors.push(`Failed to assign roles: ${err.message || 'Unknown error'}`)
              return Promise.reject(err)
            })
          )
        } catch (importError) {
          postCreationErrors.push(`Failed to load role assignment service: ${importError.message}`)
        }
      }

      // Execute post-creation tasks in parallel
      if (postCreationTasks.length > 0) {
        try {
          const results = await Promise.allSettled(postCreationTasks)
          results.forEach((result) => {
            if (result.status === 'rejected') {
              postCreationErrors.push(`Task failed: ${result.reason?.message || 'Unknown error'}`)
            }
          })
        } catch (error) {
          // Silent error handling for post-creation tasks
        }
      }

      // Phase 3: Store project ID for readiness validation
      setCreatedProjectId(project.id)
      setLoading(false)

      // Only navigate if not saving as draft
      if (!isDraft) {
        navigate(`/projects/${project.id}`)
      }
    } catch (error) {
      const errorMessage = error.message || error.details || 'Failed to create project. Please try again.'
      setErrors({ submit: errorMessage })
      setLoading(false)
    }
  }, [formData, validateForm, isPmoAdmin, roleAssignments, roleServicesLoaded, navigate])

  const removeRoleAssignment = useCallback((index) => {
    setRoleAssignments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addRoleAssignment = useCallback(() => {
    const userId = document.getElementById('role_user_select').value
    const roleName = document.getElementById('role_role_select').value

    if (userId && roleName) {
      const exists = roleAssignments.some(
        ra => ra.userId === userId && ra.roleName === roleName
      )
      if (!exists) {
        setRoleAssignments(prev => [...prev, { userId, roleName }])
        document.getElementById('role_user_select').value = ''
        document.getElementById('role_role_select').value = ''
      }
    }
  }, [roleAssignments])

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
        navigate(`/projects/${createdProjectId}`)
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

  // Optimized: Memoized options with stable references
  const methodologyOptions = useMemo(() => {
    if (!methodologies.length) return null
    return methodologies.map((methodology) => (
      <option key={methodology.id} value={methodology.id}>
        {methodology.methodology_name || 'Unnamed'}
      </option>
    ))
  }, [methodologies])

  const projectTypeOptions = useMemo(() => {
    if (!projectTypes.length) return null
    return projectTypes.map((type) => (
      <option key={type.id} value={type.id}>
        {type.type_name || 'Unnamed'}
      </option>
    ))
  }, [projectTypes])

  const statusOptions = useMemo(() => {
    if (!projectStatuses.length) return null
    return projectStatuses.map((status) => (
      <option key={status.id} value={status.id}>
        {status.status_name || 'Unnamed'}
      </option>
    ))
  }, [projectStatuses])

  // Show minimal skeleton only if absolutely necessary (optimized for instant render)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create New Project
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fill in the details to create your new project
        </p>
      </div>

      {/* Phase 2: Tab Navigation */}
      <ProjectFormTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formData={formData}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: Project Details */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Project Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Basic project information to identify and describe your project.
              </p>
            </div>

        {/* Project Name */}
        <div>
          <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="project_name"
            name="project_name"
            value={formData.project_name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter project name"
            autoFocus
            required
          />
          {errors.project_name && (
            <p className="mt-1 text-sm text-red-600">{errors.project_name}</p>
          )}
        </div>

        {/* Project Description */}
        <div>
          <label htmlFor="project_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Description
          </label>
          <textarea
            id="project_description"
            name="project_description"
            value={formData.project_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Describe your project..."
          />
        </div>

        {/* Methodology Selection */}
        <div>
          <label htmlFor="methodology_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Methodology <span className="text-red-500">*</span>
          </label>
          <select
            id="methodology_id"
            name="methodology_id"
            value={formData.methodology_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.methodology_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a methodology</option>
            {methodologyOptions || <option disabled>Loading...</option>}
          </select>
          {errors.methodology_id && (
            <p className="mt-1 text-sm text-red-600">{errors.methodology_id}</p>
          )}
          {selectedMethodology && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Pre-selected: {selectedMethodology.methodology_name}
            </p>
          )}
        </div>

        {/* Project Type */}
        <div>
          <label htmlFor="project_type_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Type <span className="text-red-500">*</span>
          </label>
          <select
            id="project_type_id"
            name="project_type_id"
            value={formData.project_type_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_type_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a project type</option>
            {projectTypeOptions || <option disabled>Loading...</option>}
          </select>
          {errors.project_type_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_type_id}</p>
          )}
        </div>

        {/* Project Status */}
        <div>
          <label htmlFor="project_status_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Initial Status <span className="text-red-500">*</span>
          </label>
          <select
            id="project_status_id"
            name="project_status_id"
            value={formData.project_status_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_status_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a status</option>
            {statusOptions || <option disabled>Loading...</option>}
          </select>
          {errors.project_status_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_status_id}</p>
          )}
        </div>

        {/* Dates and Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Budget
          </label>
          <input
            type="number"
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
        </div>

        {/* Project Code */}
        <div>
          <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Code (Optional)
          </label>
          <input
            type="text"
            id="project_code"
            name="project_code"
            value={formData.project_code}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="e.g., PRJ-2025-001"
          />
        </div>
          </div>
        )}

        {/* Tab 2: Governance & Justification */}
        {activeTab === 'governance' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Governance & Justification
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Define project authority, accountability, and business justification.
                Fields marked with <span className="text-red-500">*</span> are required for authorisation.
              </p>
            </div>

            {/* Section A: Governance & Authority */}
            <GovernanceSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
              organisationUsers={organisationUsers}
            />

            {/* Section B: Business Justification */}
            <BusinessJustificationSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
              organisationUsers={organisationUsers}
            />
          </div>
        )}

        {/* Tab 3: Delivery & Financial */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Delivery & Financial Controls
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure delivery methodology, lifecycle controls, and financial management.
                Fields marked with <span className="text-red-500">*</span> are required for authorisation.
              </p>
            </div>

            {/* Section C: Lifecycle & Controls */}
            <LifecycleControlsSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
            />

            {/* Section D: Financial Controls */}
            <FinancialControlsSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
            />
          </div>
        )}

        {/* Tab 4: Risk & Documentation */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Risk Assessment & Documentation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Assess project risk, complexity, and capture document governance metadata.
                Fields marked with <span className="text-red-500">*</span> are required for authorisation.
              </p>
            </div>

            {/* Section E: Risk & Complexity */}
            <RiskComplexitySection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
            />

            {/* Section F: Document Governance */}
            <DocumentGovernanceSection
              formData={formData}
              handleChange={handleChange}
              errors={errors}
            />
          </div>
        )}

        {/* Role Assignment Section (lazy loaded) */}
        {isPmoAdmin && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assign Project Roles
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assign key roles to team members for this project
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleAssignment(!showRoleAssignment)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                {showRoleAssignment ? 'Hide' : 'Assign Roles'}
              </button>
            </div>

            {showRoleAssignment && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {!roleServicesLoaded ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">Loading role assignment options...</div>
                ) : (
                  <>
                    {roleAssignments.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {roleAssignments.map((assignment, index) => {
                          const user = organisationUsers.find(u => u.id === assignment.userId)
                          const role = availableRoles.find(r => r.role_name === assignment.roleName)
                          return (
                            <div key={`${assignment.userId}-${assignment.roleName}-${index}`} className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg">
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {user?.full_name || user?.email || 'Unknown User'}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 mx-2">→</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {role?.role_display_name || assignment.roleName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRoleAssignment(index)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select User
                        </label>
                        <select
                          id="role_user_select"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          disabled={!roleServicesLoaded}
                        >
                          <option value="">Choose a user...</option>
                          {organisationUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Role
                        </label>
                        <select
                          id="role_role_select"
                          onChange={addRoleAssignment}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          disabled={!roleServicesLoaded}
                        >
                          <option value="">Choose a role...</option>
                          {availableRoles.map(role => (
                            <option key={role.id} value={role.role_name}>
                              {role.role_display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
