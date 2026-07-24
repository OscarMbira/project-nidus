import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, GraduationCap, Award, Rocket } from 'lucide-react'
import { getSimMandateById, getSimDeliverables, getSimStakeholders, getSimMandateProgress, canCreatePracticeProject, createPracticeProjectFromMandate, getPracticeProjectsFromMandate } from '../../services/simulatorMandateService'
import { getSimConstraintsByMandate } from '../../services/simMandateConstraintService'
import ConstraintSelector from '../../components/constraints/ConstraintSelector'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const SIM_MANDATE_VIEW_SECTIONS = [
  { title: 'Mandate', fields: [
    { key: 'mandate_reference', label: 'Reference' },
    { key: 'mandate_title', label: 'Title' },
    { key: 'document_status', label: 'Status' }
  ]}
]

export default function SimMandateView() {
  const { mandateId } = useParams()
  const navigate = useNavigate()
  const [mandate, setMandate] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canCreateProject, setCanCreateProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [practiceProjects, setPracticeProjects] = useState([])

  useEffect(() => {
    if (mandateId) {
      fetchMandate()
    }
  }, [mandateId])

  const handleCreatePracticeProject = async () => {
    if (!confirm('Create a practice project from this approved mandate? This is for learning purposes only.')) return

    try {
      setCreatingProject(true)
      const projectId = await createPracticeProjectFromMandate(mandateId)
      alert('Practice project created successfully! This project is for learning purposes.')
      // Navigate to practice project view (if we create that page) or show success message
      // For now, just refresh to show the created project
      fetchMandate()
    } catch (error) {
      console.error('Error creating practice project:', error)
      alert('Error creating practice project: ' + error.message)
    } finally {
      setCreatingProject(false)
    }
  }

  const fetchMandate = async () => {
    try {
      setLoading(true)
      const [mandateData, deliverablesData, stakeholdersData, progressData, canCreate, practiceProjectsData] = await Promise.all([
        getSimMandateById(mandateId),
        getSimDeliverables(mandateId),
        getSimStakeholders(mandateId),
        getSimMandateProgress(mandateId),
        canCreatePracticeProject(mandateId),
        getPracticeProjectsFromMandate(mandateId)
      ])
      
      setMandate(mandateData)
      setDeliverables(deliverablesData)
      setStakeholders(stakeholdersData)
      setProgress(progressData)
      setCanCreateProject(canCreate)
      setPracticeProjects(practiceProjectsData)
      
      // Load structured constraints
      try {
        const constraintsResult = await getSimConstraintsByMandate(mandateId)
        if (constraintsResult.success && constraintsResult.data) {
          setConstraints(constraintsResult.data)
        }
      } catch (constraintError) {
        console.warn('Error loading simulator constraints:', constraintError)
      }
    } catch (error) {
      console.error('Error fetching practice mandate:', error)
      alert('Error loading practice mandate: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading practice mandate...</p>
        </div>
      </div>
    )
  }

  if (!mandate) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Practice mandate not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/simulator/mandates/list')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Practice Mandates
        </button>
        
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{mandate.mandate_title}</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Reference: {mandate.mandate_reference} | Status: {mandate.document_status}
                {mandate.is_practice_mode && (
                  <> | <span className="text-blue-600 dark:text-blue-400">Practice Mode</span></>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2 flex-wrap gap-2">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportWord={() => exportRecordToWord(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportExcel={() => exportRecordToExcel(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportCSV={() => exportRecordToCSV(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportXML={() => exportRecordToXML(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportJSON={() => exportRecordToJSON(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
              onExportPrint={() => exportRecordToPrint(SIM_MANDATE_VIEW_SECTIONS, mandate, `PracticeMandate_${mandate.mandate_reference || mandateId}`)}
            />
            {mandate.document_status === 'draft' && (
              <button
                onClick={() => navigate(`/simulator/mandates/${mandateId}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            {canCreateProject && (
              <button
                onClick={handleCreatePracticeProject}
                disabled={creatingProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Rocket className="w-4 h-4 mr-2" />
                {creatingProject ? 'Creating Practice Project...' : 'Create Practice Project'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Learning Mode Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Learning Mode:</strong> This is a practice exercise. Use it to learn how project mandates work in a risk-free environment.
        </p>
      </div>

      {/* Progress Indicator */}
      {progress && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              Learning Progress
            </h3>
            <span className="text-2xl font-bold text-purple-600">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {progress.completed} of {progress.total} sections completed
          </p>
        </div>
      )}

        {/* Practice Score & Feedback */}
        {mandate.practice_score !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Practice Score: {mandate.practice_score}/100</h3>
            {mandate.feedback && (
              <p className="text-gray-700 dark:text-gray-300">{mandate.feedback}</p>
            )}
          </div>
        )}

        {/* Practice Projects Created */}
        {practiceProjects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
              <Rocket className="w-5 h-5 mr-2 text-green-600" />
              Practice Projects Created ({practiceProjects.length})
            </h3>
            <div className="space-y-2">
              {practiceProjects.map((project, index) => (
                <div key={project.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.project_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Code: {project.project_code} | Status: {project.project_status}
                      </p>
                      {project.practice_score && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Project Creation Score: {project.practice_score}/100
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="space-y-6">
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-lg ${
          mandate.document_status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
          mandate.document_status === 'submitted' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
          mandate.document_status === 'rejected' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
          'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
        }`}>
          <span className="font-semibold">Status: {mandate.document_status.toUpperCase()}</span>
        </div>

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Basic Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.mandate_reference}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.version_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mandate.created_date}</dd>
            </div>
          </dl>
        </div>

        {/* Section 1: Purpose */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">1. Purpose</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.purpose}</p>
        </div>

        {/* Section 3: Background */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">3. Background</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.background}</p>
        </div>

        {/* Section 4: Project Objectives */}
        {mandate.project_objectives && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">4. Project Objectives</h2>
            {(() => {
              try {
                const objectives = JSON.parse(mandate.project_objectives)
                if (Array.isArray(objectives) && objectives.length > 0) {
                  return (
                    <ul className="list-disc list-inside space-y-1">
                      {objectives.map((obj, idx) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">{obj}</li>
                      ))}
                    </ul>
                  )
                }
              } catch {}
              return <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.project_objectives}</p>
            })()}
          </div>
        )}

        {/* Section 6: Constraints */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">6. Constraints</h2>
          {constraints.length > 0 ? (
            <ConstraintSelector
              mandateId={mandateId}
              constraints={constraints}
              onChange={() => {}} // Read-only
              readOnly={true}
              isSimulator={true}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No constraints defined</p>
          )}
        </div>

        {/* Section 9: Outline Business Case */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">9. Outline Business Case</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mandate.outline_business_case}</p>
        </div>

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Deliverables</h2>
            <ul className="space-y-2">
              {deliverables.map((deliverable, index) => (
                <li key={deliverable.id} className="text-gray-700 dark:text-gray-300">
                  • {deliverable.deliverable_name}
                  {deliverable.deliverable_description && (
                    <span className="text-sm text-gray-600 dark:text-gray-400"> - {deliverable.deliverable_description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stakeholders */}
        {stakeholders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Stakeholders</h2>
            <ul className="space-y-2">
              {stakeholders.map((stakeholder, index) => (
                <li key={stakeholder.id} className="text-gray-700 dark:text-gray-300">
                  • {stakeholder.stakeholder_name} ({stakeholder.stakeholder_type})
                  {stakeholder.stakeholder_organisation && (
                    <span className="text-sm text-gray-600 dark:text-gray-400"> - {stakeholder.stakeholder_organisation}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
