/**
 * Project Brief Create Page
 * Create a new project brief
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { createBrief, createBriefFromMandate, getBriefByProject } from '../../services/projectBriefService'
import { validateCompleteness } from '../../services/briefValidationService'
import ProjectBriefForm from '../../components/brief/ProjectBriefForm'
import QualityCriteriaChecklist from '../../components/brief/QualityCriteriaChecklist'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import {
  resolveBriefCharterMode,
  briefCharterLabels,
  briefCharterDocPath,
  resolveProjectWorkspaceBasePath,
} from '@nidus/shared/utils/briefCharterTerminology.js'

const BRIEF_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'brief_reference', label: 'Reference' },
    { key: 'version_number', label: 'Version' },
    { key: 'document_status', label: 'Status' },
  ]},
  { title: 'Background', fields: [{ key: 'background', label: 'Background' }] },
  { title: 'Objectives', fields: [{ key: 'project_objectives', label: 'Project Objectives' }] },
  { title: 'Scope', fields: [
    { key: 'project_scope', label: 'Project Scope' },
    { key: 'scope_exclusions', label: 'Scope Exclusions' },
  ]},
  { title: 'Business Case', fields: [
    { key: 'outline_business_case_summary', label: 'Outline Business Case Summary' },
    { key: 'business_option_selected', label: 'Business Option Selected' },
    { key: 'dis_benefits_description', label: 'Dis-benefits' },
  ]},
]

export default function ProjectBriefCreate() {
  const { projectId, routeKey, loading: projectLoading } = usePlatformProjectId()
  const navigate = useNavigate()
  const location = useLocation()
  const mandateId = location.state?.mandateId
  const mode = resolveBriefCharterMode(location.pathname)
  const labels = briefCharterLabels(mode)
  const basePath = resolveProjectWorkspaceBasePath(location.pathname)
  const docPath = (action) => briefCharterDocPath(routeKey || projectId, action, mode, basePath)

  const [formData, setFormData] = useState({
    project_id: projectId,
    mandate_id: mandateId || null,
    brief_reference: null,
    version_number: '1.0',
    document_status: 'draft',
    created_date: new Date().toISOString().split('T')[0],
    background: '',
    project_objectives: '',
    desired_outcomes: '',
    project_scope: '',
    scope_exclusions: '',
    constraints: '',
    assumptions: '',
    outline_business_case_summary: '',
    business_option_selected: '',
    dis_benefits_included: true,
    dis_benefits_description: '',
    product_description: '',
    customer_quality_expectations: '',
    user_acceptance_criteria: '',
    operations_maintenance_criteria: '',
    project_approach_description: '',
    solution_type: '',
    delivery_approach: '',
    development_approach: '',
    operational_environment: '',
    approach_justification: '',
    team_structure_description: '',
    lessons_learned_reviewed: false,
    lessons_review_summary: '',
    is_consistent_with_csr: null,
    csr_notes: ''
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [existingBrief, setExistingBrief] = useState(null)

  useEffect(() => {
    if (projectId) {
      setFormData((prev) => ({ ...prev, project_id: projectId }))
    }
  }, [projectId])

  useEffect(() => {
    if (projectLoading) return
    if (!projectId) return
    checkExistingBrief()
  }, [projectId, projectLoading])

  const checkExistingBrief = async () => {
    if (!projectId) return
    try {
      const brief = await getBriefByProject(projectId)
      if (brief) {
        setExistingBrief(brief)
      }
    } catch (error) {
      // No existing brief, that's fine
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const hasListItems = (v) => String(v || '').split(/\r?\n/).some((line) => line.trim())
    if (!hasListItems(formData.background)) {
      newErrors.background = 'Add at least one background point'
    }
    if (!hasListItems(formData.project_objectives)) {
      newErrors.project_objectives = 'Add at least one project objective'
    }
    if (!hasListItems(formData.project_scope)) {
      newErrors.project_scope = 'Add at least one in-scope item'
    }
    if (!formData.outline_business_case_summary || formData.outline_business_case_summary.length < 100) {
      newErrors.outline_business_case_summary = 'Business case summary is required (minimum 100 characters)'
    }
    if (!formData.project_approach_description || formData.project_approach_description.length < 100) {
      newErrors.project_approach_description = 'Project approach description is required (minimum 100 characters)'
    }
    if (!hasListItems(formData.team_structure_description)) {
      newErrors.team_structure_description = 'Add at least one team structure point'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const brief = await createBrief(projectId, formData)
      // Update formData with created brief ID for subsequent operations
      setFormData(prev => ({ ...prev, id: brief.id, brief_reference: brief.brief_reference }))
      alert(`${labels.singular} saved as draft!`)
    } catch (error) {
      console.error('Error saving brief:', error)
      alert(`Error saving ${labels.singular.toLowerCase()}: ` + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateFromMandate = async () => {
    if (!mandateId) {
      alert('No mandate ID provided')
      return
    }
    try {
      setSaving(true)
      const brief = await createBriefFromMandate(mandateId, projectId)
      // Update formData with created brief data
      setFormData(prev => ({
        ...prev,
        id: brief.id,
        brief_reference: brief.brief_reference,
        mandate_id: brief.mandate_id,
        background: brief.background,
        project_objectives: brief.project_objectives,
        outline_business_case_summary: brief.outline_business_case_summary,
        project_scope: brief.project_scope,
        constraints: brief.constraints,
        customer_quality_expectations: brief.customer_quality_expectations
      }))
      alert(`${labels.singular} created from mandate! You can now edit and complete it.`)
    } catch (error) {
      console.error('Error creating brief from mandate:', error)
      alert(`Error creating ${labels.singular.toLowerCase()}: ` + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Please fix validation errors before submitting')
      return
    }

    // Check completeness
    try {
      const { validateCompleteness } = await import('../../services/briefValidationService')
      if (formData.id) {
        const completeness = await validateCompleteness(formData.id)
        if (completeness.completion_percentage < 100) {
          if (!confirm(`${labels.singular} is only ${completeness.completion_percentage}% complete. Submit anyway?`)) {
            return
          }
        }
      }
    } catch (error) {
      console.error('Error checking completeness:', error)
    }

    try {
      setSaving(true)
      const brief = await createBrief(projectId, {
        ...formData,
        document_status: 'under_review'
      })
      alert(`${labels.singular} submitted for approval!`)
      navigate(docPath('view'))
    } catch (error) {
      console.error('Error submitting brief:', error)
      alert(`Error submitting ${labels.singular.toLowerCase()}: ` + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (existingBrief) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            {labels.singular} Already Exists
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            A {labels.singular.toLowerCase()} already exists for this project. You can view or edit it.
          </p>
          <button
            onClick={() => navigate(docPath('view'))}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
          >
            View Existing {labels.singular}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{labels.createPageTitle}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {labels.createPageSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <ExportRecordButtons
              sections={BRIEF_EXPORT_SECTIONS}
              record={formData}
              baseFilename={`${labels.singular}_${formData.brief_reference || 'Draft'}`}
            />
          </div>
        </div>
      </div>

      {mandateId && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Create from Mandate
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You can auto-populate this {labels.singular.toLowerCase()} from the mandate
              </p>
            </div>
            <button
              onClick={handleCreateFromMandate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create from Mandate
            </button>
          </div>
        </div>
      )}

      {/* Quality Criteria (shown after brief is created) */}
      {formData.id && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <QualityCriteriaChecklist briefId={formData.id} />
        </div>
      )}

      <ProjectBriefForm
        formData={formData}
        onChange={handleChange}
        errors={errors}
        readOnly={false}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  )
}
