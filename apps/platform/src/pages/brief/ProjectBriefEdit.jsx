/**
 * Project Brief Edit Page
 * Edit an existing project brief
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { getBriefByProject, updateBrief, canEdit } from '../../services/projectBriefService'
import { submitForApproval } from '../../services/briefApprovalService'
import ProjectBriefForm from '../../components/brief/ProjectBriefForm'
import BriefCompletionProgress from '../../components/brief/BriefCompletionProgress'
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

export default function ProjectBriefEdit() {
  const { projectId, routeKey, loading: projectLoading } = usePlatformProjectId()
  const navigate = useNavigate()
  const location = useLocation()
  const mode = resolveBriefCharterMode(location.pathname)
  const labels = briefCharterLabels(mode)
  const basePath = resolveProjectWorkspaceBasePath(location.pathname)
  const docPath = (action) => briefCharterDocPath(routeKey || projectId, action, mode, basePath)
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)

  useEffect(() => {
    if (projectLoading) return
    if (!projectId) {
      setLoading(false)
      return
    }
    loadBrief()
  }, [projectId, projectLoading])

  const loadBrief = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const data = await getBriefByProject(projectId)
      if (!data) {
        navigate(docPath('create'))
        return
      }
      
      const editable = await canEdit(data.id)
      if (!editable) {
        alert(`This ${labels.singular.toLowerCase()} cannot be edited. It may be approved or under review.`)
        navigate(docPath('view'))
        return
      }
      
      setBrief(data)
    } catch (error) {
      console.error('Error loading brief:', error)
      alert('Error loading brief: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setBrief(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Auto-save after 3 seconds of inactivity
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }
    const timer = setTimeout(() => {
      handleAutoSave()
    }, 3000)
    setAutoSaveTimer(timer)
  }

  const handleAutoSave = async () => {
    if (!brief || !brief.id) return
    try {
      await updateBrief(brief.id, brief)
      // Silent save - no alert
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Don't show error for auto-save failures
    }
  }

  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSaveTimer])

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      await updateBrief(brief.id, brief)
      alert('Brief saved!')
    } catch (error) {
      console.error('Error saving brief:', error)
      alert('Error saving brief: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      // Update brief first
      await updateBrief(brief.id, {
        ...brief,
        document_status: 'under_review'
      })
      
      // TODO: Get approver IDs from user selection
      // For now, just update status
      alert('Brief submitted for approval!')
      navigate(docPath('view'))
    } catch (error) {
      console.error('Error submitting brief:', error)
      alert(`Error submitting ${labels.singular.toLowerCase()}: ` + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{labels.loading}</p>
        </div>
      </div>
    )
  }

  if (!brief) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(docPath('view'))}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to View
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{labels.editPageTitle}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {labels.singular} Reference: {brief.brief_reference}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <ExportRecordButtons
              sections={BRIEF_EXPORT_SECTIONS}
              record={brief}
              baseFilename={`${labels.singular}_${brief.brief_reference || 'Draft'}`}
            />
          </div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="mb-6">
        <BriefCompletionProgress briefId={brief.id} />
      </div>

      {/* Quality Criteria */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <QualityCriteriaChecklist briefId={brief.id} />
      </div>

      <ProjectBriefForm
        formData={brief}
        onChange={handleChange}
        errors={errors}
        readOnly={false}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        saving={saving}
      />

      {/* Auto-save indicator */}
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <Save className="w-4 h-4 inline mr-1" />
        Auto-saving changes...
      </div>
    </div>
  )
}
