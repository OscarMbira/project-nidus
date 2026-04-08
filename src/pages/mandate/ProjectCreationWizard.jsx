/**
 * ProjectCreationWizard Component
 * Wizard for creating a project from an approved mandate
 * Platform only - creates real projects
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertCircle, Rocket } from 'lucide-react'
import { getMandateByIdOrReference, createProjectFromMandate, getDeliverables, getStakeholders } from '../../services/projectMandateService'

export default function ProjectCreationWizard() {
  const { mandateId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [mandate, setMandate] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [projectData, setProjectData] = useState({
    project_name: '',
    project_description: '',
    project_objectives: '',
    business_justification: ''
  })

  useEffect(() => {
    if (mandateId) {
      fetchMandateData()
    }
  }, [mandateId])

  const fetchMandateData = async () => {
    try {
      setLoading(true)
      const mandateData = await getMandateByIdOrReference(mandateId)
      if (!mandateData) {
        alert('Mandate not found.')
        navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')
        return
      }
      const id = mandateData.id
      const [deliverablesData, stakeholdersData] = await Promise.all([
        getDeliverables(id),
        getStakeholders(id)
      ])

      setMandate(mandateData)
      setDeliverables(deliverablesData)
      setStakeholders(stakeholdersData)

      // Pre-populate project data from mandate
      setProjectData({
        project_name: mandateData.mandate_title || '',
        project_description: mandateData.background || '',
        project_objectives: mandateData.project_objectives || '',
        business_justification: mandateData.outline_business_case || ''
      })
    } catch (error) {
      console.error('Error fetching mandate data:', error)
      alert('Error loading mandate: ' + error.message)
      navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setProjectData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateProject = async () => {
    if (!confirm('Create a new project from this mandate? This will link the mandate to the project.')) return

    try {
      setCreating(true)
      const projectId = await createProjectFromMandate(mandate.id)
      alert('Project created successfully!')
      navigate(`/platform/projects/${projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Error creating project: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mandate data...</p>
        </div>
      </div>
    )
  }

  if (!mandate) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Mandate not found</p>
        </div>
      </div>
    )
  }

  if (mandate.document_status !== 'approved') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                Mandate Not Approved
              </h3>
              <p className="text-red-800 dark:text-red-300">
                Only approved mandates can be used to create projects. Current status: {mandate.document_status}
              </p>
              <button
                onClick={() => navigate(`${basePath}/${mandate.mandate_reference || mandate.id}/view`)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Back to Mandate
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mandate.project_id) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Project Already Created
              </h3>
              <p className="text-yellow-800 dark:text-yellow-300">
                This mandate has already been used to create a project.
              </p>
              <button
                onClick={() => navigate(`/platform/projects/${mandate.project_id}`)}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                View Project
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/${mandate.mandate_reference || mandate.id}/view`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandate
        </button>
        <div className="flex items-center space-x-3">
          <Rocket className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Project from Mandate</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review and confirm project details from mandate: {mandate.mandate_reference}
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {step > stepNum ? <CheckCircle className="w-6 h-6" /> : stepNum}
              </div>
              {stepNum < 3 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step > stepNum ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span>Review</span>
          <span>Confirm</span>
          <span>Create</span>
        </div>
      </div>

      {/* Step 1: Review Mandate Summary */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mandate Summary</h2>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Mandate Details</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Reference</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{mandate.mandate_reference}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Title</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{mandate.mandate_title}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{mandate.document_status}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {mandate.created_date ? new Date(mandate.created_date).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Proposed Roles</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {mandate.proposed_executive_name && (
                <p>Executive: {mandate.proposed_executive_name}</p>
              )}
              {mandate.proposed_pm_name && (
                <p>Project Manager: {mandate.proposed_pm_name}</p>
              )}
            </div>
          </div>

          {deliverables.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Deliverables ({deliverables.length})</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {deliverables.filter(d => d.is_in_scope !== false).map((d) => (
                  <li key={d.id}>{d.deliverable_name}</li>
                ))}
              </ul>
            </div>
          )}

          {stakeholders.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stakeholders ({stakeholders.length})</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {stakeholders.map((s) => (
                  <li key={s.id}>{s.stakeholder_name} ({s.stakeholder_type})</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next: Review Project Details
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review/Edit Project Details */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Project Details</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and edit project details before creation. These values are pre-populated from the mandate.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="project_name"
              value={projectData.project_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              name="project_description"
              value={projectData.project_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Objectives
            </label>
            <textarea
              name="project_objectives"
              value={projectData.project_objectives}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Justification
            </label>
            <textarea
              name="business_justification"
              value={projectData.business_justification}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next: Confirm & Create
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Create */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Project Creation</h2>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Ready to Create:</strong> Review the summary below and click "Create Project" to proceed.
              The mandate will be linked to the new project.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Project Name</h3>
              <p className="text-gray-700 dark:text-gray-300">{projectData.project_name}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {projectData.project_description || 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Objectives</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {projectData.project_objectives || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={creating || !projectData.project_name.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Rocket className="w-4 h-4 mr-2" />
              {creating ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
