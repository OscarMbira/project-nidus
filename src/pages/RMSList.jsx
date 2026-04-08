import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { platformDb } from '../services/supabase/supabaseClient'
import { AlertTriangle, Search, Filter, Eye, CheckCircle, Clock, Plus, Edit2, Trash2 } from 'lucide-react'
import { getRMSByProject, deleteRMS, createRMSForProject } from '../services/riskManagementStrategyService'
import RMSForm from '../components/rms/RMSForm'
import ExportListMenu from '../components/ui/ExportListMenu'

const RMS_COLUMNS = [
  { key: 'rms_reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'purpose', label: 'Purpose' }
]

export default function RMSList() {
  const navigate = useNavigate()
  const [rmsList, setRmsList] = useState([])
  const [projects, setProjects] = useState([])
  const [availableProjects, setAvailableProjects] = useState([]) // Projects user can create RMS for
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'draft', 'under_review', 'approved', 'superseded'
  const [showRMSForm, setShowRMSForm] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [selectedRMS, setSelectedRMS] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [deletingRMS, setDeletingRMS] = useState(null)

  useEffect(() => {
    fetchRMSList()
    fetchAvailableProjects()
  }, [statusFilter])

  const fetchAvailableProjects = async () => {
    try {
      // Get projects the user is a member of (for creating RMS)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return

      const { data: userData } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) return

      // Get projects where user has owner/admin access via user_projects
      const { data: userProjectsData, error: upError } = await platformDb
        .from('user_projects')
        .select('project_id')
        .eq('user_id', userData.id)
        .in('access_level', ['owner', 'admin'])
        .eq('is_deleted', false)

      if (upError) throw upError

      if (!userProjectsData || userProjectsData.length === 0) {
        setAvailableProjects([])
        return
      }

      const projectIds = userProjectsData.map(up => up.project_id).filter(Boolean)

      // Fetch project details
      const { data: projectsData, error: projectsError } = await platformDb
        .from('projects')
        .select('id, project_name, project_code, is_deleted')
        .in('id', projectIds)
        .eq('is_deleted', false)

      if (projectsError) throw projectsError

      setAvailableProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching available projects:', error)
      setAvailableProjects([])
    }
  }

  const fetchRMSList = async () => {
    try {
      setLoading(true)

      // Get all RMS (PMO Admin can see all)
      let query = platformDb
        .from('risk_management_strategies')
        .select(`
          *,
          project:projects(id, project_name, project_code),
          author:author_id(id, full_name, email),
          owner:owner_id(id, full_name, email)
        `)
        .eq('is_deleted', false)

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setRmsList(data || [])
    } catch (error) {
      console.error('Error fetching RMS list:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRMS = () => {
    // If user has projects, show selector, otherwise navigate to projects page
    if (availableProjects.length > 0) {
      setShowProjectSelector(true)
    } else {
      alert('You need to be a project owner or admin to create RMS. Please join a project first.')
      navigate('/app/projects')
    }
  }

  const handleProjectSelected = (projectId) => {
    setSelectedProjectId(projectId)
    setShowProjectSelector(false)
    setSelectedRMS(null)
    setShowRMSForm(true)
  }

  const handleEditRMS = (rms) => {
    setSelectedRMS(rms)
    setSelectedProjectId(rms.project_id)
    setShowRMSForm(true)
  }

  const handleDeleteRMS = async (rms) => {
    if (!confirm(`Are you sure you want to delete RMS "${rms.rms_reference || rms.id}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingRMS(rms.id)
      const result = await deleteRMS(rms.id)
      if (result.success) {
        alert('RMS deleted successfully')
        fetchRMSList() // Refresh list
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting RMS:', error)
      alert('Error deleting RMS: ' + error.message)
    } finally {
      setDeletingRMS(null)
    }
  }

  const handleRMSSaved = () => {
    setShowRMSForm(false)
    setSelectedRMS(null)
    setSelectedProjectId(null)
    fetchRMSList() // Refresh list
  }

  // Filter by search term
  const filteredRMS = rmsList.filter(rms => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        (rms.rms_reference && rms.rms_reference.toLowerCase().includes(search)) ||
        (rms.project?.project_name && rms.project.project_name.toLowerCase().includes(search)) ||
        (rms.project?.project_code && rms.project.project_code.toLowerCase().includes(search)) ||
        (rms.purpose && rms.purpose.toLowerCase().includes(search))
      )
    }
    return true
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'superseded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Risk Management Strategies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Risk Management Strategies
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage all risk management strategies across all projects
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={RMS_COLUMNS} data={filteredRMS} baseFilename="RMS" disabled={!filteredRMS.length} />
          <button
            onClick={handleCreateRMS}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create New RMS
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, project name, or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RMS List */}
      {filteredRMS.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Risk Management Strategies
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'No RMS match your filters'
              : 'No risk management strategies have been created yet'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleCreateRMS}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First RMS
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRMS.map((rms) => (
                  <tr key={rms.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {rms.rms_reference || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        v{rms.version_number || '1.0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {rms.project?.project_name || 'N/A'}
                      </div>
                      {rms.project?.project_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {rms.project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                        {rms.purpose || 'No purpose defined'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rms.status)}`}>
                        {rms.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {rms.created_at ? new Date(rms.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/app/projects/${rms.project_id}/rms`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                          title="View RMS"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {rms.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditRMS(rms)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
                              title="Edit RMS"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRMS(rms)}
                              disabled={deletingRMS === rms.id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Delete RMS"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select Project for RMS
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose a project to create a Risk Management Strategy for
              </p>
            </div>
            <div className="p-6">
              {availableProjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    You don't have access to any projects as an owner or admin.
                  </p>
                  <button
                    onClick={() => {
                      setShowProjectSelector(false)
                      navigate('/app/projects')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Go to Projects
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelected(project.id)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {project.project_name}
                      </div>
                      {project.project_code && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {project.project_code}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowProjectSelector(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RMS Form Modal */}
      {showRMSForm && (
        <RMSForm
          rms={selectedRMS}
          projectId={selectedProjectId}
          onSave={handleRMSSaved}
          onCancel={() => {
            setShowRMSForm(false)
            setSelectedRMS(null)
            setSelectedProjectId(null)
          }}
        />
      )}
    </div>
  )
}
