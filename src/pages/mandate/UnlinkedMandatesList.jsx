import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Eye, FileText, CheckCircle } from 'lucide-react'
import { getUnlinkedMandates, createProjectFromMandate } from '../../services/projectMandateService'
import { platformDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

const UNLINKED_MANDATE_COLUMNS = [
  { key: 'mandate_reference', label: 'Reference' },
  { key: 'mandate_title', label: 'Title' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'proposed_executive_name', label: 'Proposed Executive' },
  { key: 'proposed_pm_name', label: 'Proposed PM' }
]

export default function UnlinkedMandatesList() {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creatingProject, setCreatingProject] = useState(null)
  const [organisationId, setOrganisationId] = useState(null)

  useEffect(() => {
    fetchOrganisationAndMandates()
  }, [])

  const fetchOrganisationAndMandates = async () => {
    try {
      setLoading(true)
      // Get current user's organisation
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await platformDb
        .from('users')
        .select('organisation_id')
        .eq('id', user.id)
        .single()

      if (userData?.organisation_id) {
        setOrganisationId(userData.organisation_id)
        const unlinked = await getUnlinkedMandates(userData.organisation_id)
        setMandates(unlinked || [])
      }
    } catch (error) {
      console.error('Error fetching unlinked mandates:', error)
      alert('Error loading unlinked mandates: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (mandateId) => {
    if (!confirm('Create a new project from this approved mandate?')) return

    try {
      setCreatingProject(mandateId)
      const projectId = await createProjectFromMandate(mandateId)
      alert('Project created successfully!')
      navigate(`/platform/projects/${projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Error creating project: ' + error.message)
    } finally {
      setCreatingProject(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Unlinked Mandates</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Approved mandates ready for project creation
            </p>
          </div>
        </div>
        {!loading && mandates.length > 0 && (
          <ExportListMenu columns={UNLINKED_MANDATE_COLUMNS} data={mandates} baseFilename="UnlinkedMandates" disabled={!mandates?.length} />
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Ready for Project Creation:</strong> These mandates have been approved and are ready to create projects. Click "Create Project" to initiate a new project from the mandate.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading unlinked mandates...</p>
          </div>
        </div>
      ) : mandates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No unlinked mandates found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            All approved mandates have been linked to projects, or there are no approved mandates yet.
          </p>
          <button
            onClick={() => navigate(`${basePath}/create`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Mandate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mandates.map((mandate) => (
            <div
              key={mandate.mandate_id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {mandate.mandate_title}
                    </h3>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Approved
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Reference:</span> {mandate.mandate_reference}
                    {mandate.created_date && (
                      <> | <span className="font-medium">Created:</span> {mandate.created_date}</>
                    )}
                  </p>
                  {(mandate.proposed_executive_name || mandate.proposed_pm_name) && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Proposed:</span>{' '}
                      {mandate.proposed_executive_name && `Executive: ${mandate.proposed_executive_name}`}
                      {mandate.proposed_executive_name && mandate.proposed_pm_name && ' | '}
                      {mandate.proposed_pm_name && `PM: ${mandate.proposed_pm_name}`}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => navigate(`${basePath}/${mandate.mandate_reference || mandate.id}/view`)}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                    title="View Mandate"
                  >
                    <Eye className="w-5 h-5 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleCreateProject(mandate.mandate_id)}
                    disabled={creatingProject === mandate.mandate_id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    title="Create Project from Mandate"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {creatingProject === mandate.mandate_id ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
