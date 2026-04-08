import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'

export default function InitiatingProject() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [businessCase, setBusinessCase] = useState(null)
  const [pid, setPid] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

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

      // Fetch business case
      const { data: businessCaseData, error: businessCaseError } = await supabase
        .from('business_cases')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (businessCaseError && businessCaseError.code !== 'PGRST116') {
        throw businessCaseError
      }

      setBusinessCase(businessCaseData)

      // Fetch PID
      const { data: pidData, error: pidError } = await supabase
        .from('project_initiation_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (pidError && pidError.code !== 'PGRST116') {
        throw pidError
      }

      setPid(pidData)
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Structured Project Management: Initiating process...</p>
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
          Structured PM: Initiating a Project
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'business-case', 'pid'].map((tab) => (
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
              {tab === 'business-case' && 'Business Case'}
              {tab === 'pid' && 'Project Initiation Document (PID)'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} businessCase={businessCase} pid={pid} />
      )}
      {activeTab === 'business-case' && (
        <BusinessCaseTab projectId={projectId} businessCase={businessCase} onSave={fetchData} />
      )}
      {activeTab === 'pid' && (
        <PIDTab projectId={projectId} pid={pid} businessCaseId={businessCase?.id} onSave={fetchData} navigate={navigate} />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ project, businessCase, pid }) {
  const steps = [
    {
      code: 'business-case',
      name: 'Business Case',
      description: 'Create and approve the business case',
      status: businessCase?.is_approved ? 'completed' : businessCase ? 'in_progress' : 'not_started',
      document: businessCase
    },
    {
      code: 'pid',
      name: 'Project Initiation Document (PID)',
      description: 'Create and approve the Project Initiation Document',
      status: pid?.is_approved ? 'completed' : pid ? 'in_progress' : 'not_started',
      document: pid
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
          The Initiating a Project process is used to establish solid foundations for the project, 
          enabling the organization to understand the work that needs to be done to deliver the project's products 
          before committing to a significant spend.
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

// Business Case Tab Component
function BusinessCaseTab({ projectId, businessCase, onSave }) {
  const [formData, setFormData] = useState({
    case_title: businessCase?.case_title || '',
    case_description: businessCase?.case_description || '',
    business_justification: businessCase?.business_justification || '',
    expected_benefits: businessCase?.expected_benefits || [],
    expected_disbenefits: businessCase?.expected_disbenefits || [],
    expected_costs: businessCase?.expected_costs || '',
    expected_timescale: businessCase?.expected_timescale || '',
    recommended_option: businessCase?.recommended_option || '',
    reasons_for_recommendation: businessCase?.reasons_for_recommendation || '',
    major_risks: businessCase?.major_risks || [],
    risk_mitigation: businessCase?.risk_mitigation || '',
    investment_appraisal: businessCase?.investment_appraisal || '',
    return_on_investment: businessCase?.return_on_investment || '',
    payback_period: businessCase?.payback_period || '',
  })
  const [saving, setSaving] = useState(false)
  const [newBenefit, setNewBenefit] = useState('')
  const [newDisbenefit, setNewDisbenefit] = useState('')
  const [newRisk, setNewRisk] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        expected_benefits: [...(prev.expected_benefits || []), newBenefit.trim()]
      }))
      setNewBenefit('')
    }
  }

  const handleRemoveBenefit = (index) => {
    setFormData(prev => ({
      ...prev,
      expected_benefits: prev.expected_benefits.filter((_, i) => i !== index)
    }))
  }

  const handleAddDisbenefit = () => {
    if (newDisbenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        expected_disbenefits: [...(prev.expected_disbenefits || []), newDisbenefit.trim()]
      }))
      setNewDisbenefit('')
    }
  }

  const handleRemoveDisbenefit = (index) => {
    setFormData(prev => ({
      ...prev,
      expected_disbenefits: prev.expected_disbenefits.filter((_, i) => i !== index)
    }))
  }

  const handleAddRisk = () => {
    if (newRisk.trim()) {
      setFormData(prev => ({
        ...prev,
        major_risks: [...(prev.major_risks || []), newRisk.trim()]
      }))
      setNewRisk('')
    }
  }

  const handleRemoveRisk = (index) => {
    setFormData(prev => ({
      ...prev,
      major_risks: prev.major_risks.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const businessCaseData = {
        project_id: projectId,
        ...formData,
        expected_costs: formData.expected_costs ? parseFloat(formData.expected_costs) : null,
        return_on_investment: formData.return_on_investment ? parseFloat(formData.return_on_investment) : null,
        payback_period: formData.payback_period ? parseInt(formData.payback_period) : null,
        created_by: user.id,
        updated_by: user.id
      }

      if (businessCase) {
        const { error } = await supabase
          .from('business_cases')
          .update(businessCaseData)
          .eq('id', businessCase.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('business_cases')
          .insert(businessCaseData)

        if (error) throw error
      }

      alert('Business Case saved successfully!')
      onSave()
    } catch (error) {
      console.error('Error saving business case:', error)
      alert('Error saving business case: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Business Case
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Case Title *
          </label>
          <input
            type="text"
            name="case_title"
            value={formData.case_title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expected Benefits
          </label>
          <div className="space-y-2 mb-2">
            {formData.expected_benefits?.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  {benefit}
                </span>
                <button
                  onClick={() => handleRemoveBenefit(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
              placeholder="Add expected benefit"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleAddBenefit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expected Costs
          </label>
          <input
            type="number"
            name="expected_costs"
            value={formData.expected_costs}
            onChange={handleChange}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Major Risks
          </label>
          <div className="space-y-2 mb-2">
            {formData.major_risks?.map((risk, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  {risk}
                </span>
                <button
                  onClick={() => handleRemoveRisk(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRisk}
              onChange={(e) => setNewRisk(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddRisk()}
              placeholder="Add major risk"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleAddRisk}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !formData.case_title}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Business Case'}
          </button>
        </div>
      </div>
    </div>
  )
}

// PID Tab Component
function PIDTab({ projectId, pid, businessCaseId, onSave, navigate }) {
  const handleCreatePID = () => {
    navigate(`/projects/${projectId}/pid`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Project Initiation Document (PID)
      </h2>
      {!businessCaseId ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please complete the Business Case first before creating the Project Initiation Document.
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          {pid ? (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Project Initiation Document exists: {pid.pid_reference || pid.pid_title}
              </p>
              <button
                onClick={() => navigate(`/projects/${projectId}/pid`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                View/Edit PID
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create the Project Initiation Document to establish solid foundations for the project.
              </p>
              <button
                onClick={handleCreatePID}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create PID
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

