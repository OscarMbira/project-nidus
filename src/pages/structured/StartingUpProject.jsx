import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'

export default function StartingUpProject() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [mandate, setMandate] = useState(null)
  const [projectBrief, setProjectBrief] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          project_methodologies!inner (
            methodologies:methodology_id (methodology_name, methodology_code)
          )
        `)
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError

      // Check if project uses structured/traditional methodology
      // Note: 'prince2' is checked for database backward compatibility only
      const methodology = projectData.project_methodologies?.[0]?.methodologies
      if (methodology?.methodology_code !== 'prince2' && methodology?.methodology_code !== 'structured_pm') {
        throw new Error('This project does not use structured/traditional methodology')
      }

      setProject(projectData)

      // Fetch mandate
      const { data: mandateData, error: mandateError } = await supabase
        .from('project_mandates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (mandateError && mandateError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is OK
        throw mandateError
      }

      setMandate(mandateData)

      // Fetch project brief
      const { data: briefData, error: briefError } = await supabase
        .from('project_briefs')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (briefError && briefError.code !== 'PGRST116') {
        throw briefError
      }

      setProjectBrief(briefData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Structured Project Management: Starting Up process...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Structured PM: Starting Up a Project
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'mandate', 'project-brief'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'mandate' && 'Project Mandate'}
              {tab === 'project-brief' && 'Project Brief'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} mandate={mandate} projectBrief={projectBrief} />
      )}
      {activeTab === 'mandate' && (
        <MandateTab projectId={projectId} mandate={mandate} onSave={fetchData} />
      )}
      {activeTab === 'project-brief' && (
        <ProjectBriefTab projectId={projectId} projectBrief={projectBrief} mandateId={mandate?.id} onSave={fetchData} />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ project, mandate, projectBrief }) {
  const steps = [
    {
      code: 'mandate',
      name: 'Project Mandate',
      description: 'Create and approve the project mandate',
      status: mandate?.is_approved ? 'completed' : mandate ? 'in_progress' : 'not_started',
      document: mandate
    },
    {
      code: 'project-brief',
      name: 'Project Brief',
      description: 'Create and approve the project brief',
      status: projectBrief?.is_approved ? 'completed' : projectBrief ? 'in_progress' : 'not_started',
      document: projectBrief
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Process Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The Starting Up a Project process is used to ensure that the prerequisites for initiating a project are in place. 
          It answers the question: "Do we have a viable and worthwhile project?"
        </p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.code}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{step.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(step.status)}`}>
                    {step.status === 'completed' ? 'Completed' : step.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{step.description}</p>
                {step.document && (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Created: {new Date(step.document.created_at).toLocaleDateString()}
                    {step.document.is_approved && (
                      <span className="ml-2">• Approved: {new Date(step.document.approved_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Mandate Tab Component
function MandateTab({ projectId, mandate, onSave }) {
  const [formData, setFormData] = useState({
    mandate_title: mandate?.mandate_title || '',
    mandate_description: mandate?.mandate_description || '',
    mandate_reason: mandate?.mandate_reason || '',
    mandate_authority: mandate?.mandate_authority || '',
    mandate_date: mandate?.mandate_date || '',
    business_justification: mandate?.business_justification || '',
    expected_benefits: mandate?.expected_benefits || '',
    expected_costs: mandate?.expected_costs || '',
    constraints: mandate?.constraints || '',
    assumptions: mandate?.assumptions || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const mandateData = {
        project_id: projectId,
        ...formData,
        mandate_date: formData.mandate_date || null,
        created_by: user.id,
        updated_by: user.id
      }

      if (mandate) {
        // Update existing
        const { error } = await supabase
          .from('project_mandates')
          .update(mandateData)
          .eq('id', mandate.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('project_mandates')
          .insert(mandateData)

        if (error) throw error
      }

      alert('Mandate saved successfully!')
      onSave()
    } catch (error) {
      console.error('Error saving mandate:', error)
      alert('Error saving mandate: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Project Mandate
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mandate Title *
          </label>
          <input
            type="text"
            name="mandate_title"
            value={formData.mandate_title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mandate Description
          </label>
          <textarea
            name="mandate_description"
            value={formData.mandate_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Project
          </label>
          <textarea
            name="mandate_reason"
            value={formData.mandate_reason}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Authority
            </label>
            <input
              type="text"
              name="mandate_authority"
              value={formData.mandate_authority}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mandate Date
            </label>
            <input
              type="date"
              name="mandate_date"
              value={formData.mandate_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Justification
          </label>
          <textarea
            name="business_justification"
            value={formData.business_justification}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected Benefits
            </label>
            <textarea
              name="expected_benefits"
              value={formData.expected_benefits}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected Costs
            </label>
            <textarea
              name="expected_costs"
              value={formData.expected_costs}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Constraints
            </label>
            <textarea
              name="constraints"
              value={formData.constraints}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assumptions
            </label>
            <textarea
              name="assumptions"
              value={formData.assumptions}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !formData.mandate_title}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Mandate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Project Brief Tab Component (simplified for now)
function ProjectBriefTab({ projectId, projectBrief, mandateId, onSave }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Project Brief
      </h2>
      {!mandateId ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please complete the Project Mandate first before creating the Project Brief.
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Project Brief form will be implemented here. This requires the Project Mandate to be completed first.
          </p>
        </div>
      )}
    </div>
  )
}

