import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Shield, Search, Filter, Eye, CheckCircle, Clock, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import { getQMSByProject, deleteQMS, getOrCreateQMS } from '../services/qualityManagementStrategyService'
import QMSForm from '../components/qms/QMSForm'
import ExportListMenu from '../components/ui/ExportListMenu'

const QMS_COLUMNS = [
  { key: 'qms_reference', label: 'Reference' },
  { key: 'strategy_title', label: 'Title' },
  { key: 'status', label: 'Status' }
]

export default function QMSList() {
  const navigate = useNavigate()
  const [qmsList, setQmsList] = useState([])
  const [projects, setProjects] = useState([])
  const [availableProjects, setAvailableProjects] = useState([]) // Projects user can create QMS for
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'draft', 'under_review', 'approved', 'superseded'
  const [showQMSForm, setShowQMSForm] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [selectedQMS, setSelectedQMS] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [deletingQMS, setDeletingQMS] = useState(null)

  useEffect(() => {
    fetchQMSList()
    fetchAvailableProjects()
  }, [statusFilter])

  const fetchAvailableProjects = async () => {
    try {
      // Get projects the user is a member of (for creating QMS)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) return

      // Get projects where user has owner/admin access via user_projects
      const { data: userProjectsData, error: upError } = await supabase
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
      const { data: projectsData, error: projectsError } = await supabase
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

  const fetchQMSList = async () => {
    try {
      setLoading(true)

      // Get all QMS (PMO Admin can see all)
      let query = supabase
        .from('quality_management_strategies')
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

      setQmsList(data || [])
    } catch (error) {
      console.error('Error fetching QMS list:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQMS = () => {
    // If user has projects, show selector, otherwise navigate to projects page
    if (availableProjects.length > 0) {
      setShowProjectSelector(true)
    } else {
      alert('You need to be a project owner or admin to create QMS. Please join a project first.')
      navigate('/app/projects')
    }
  }

  const handleProjectSelected = (projectId) => {
    setSelectedProjectId(projectId)
    setShowProjectSelector(false)
    setSelectedQMS(null)
    setShowQMSForm(true)
  }

  const handleEditQMS = (qms) => {
    setSelectedQMS(qms)
    setSelectedProjectId(qms.project_id)
    setShowQMSForm(true)
  }

  const handleDeleteQMS = async (qms) => {
    if (!confirm(`Are you sure you want to delete QMS "${qms.qms_reference || qms.id}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingQMS(qms.id)
      await deleteQMS(qms.id)
      alert('QMS deleted successfully')
      fetchQMSList() // Refresh list
    } catch (error) {
      console.error('Error deleting QMS:', error)
      alert('Error deleting QMS: ' + error.message)
    } finally {
      setDeletingQMS(null)
    }
  }

  const handleQMSSaved = () => {
    setShowQMSForm(false)
    setSelectedQMS(null)
    setSelectedProjectId(null)
    fetchQMSList() // Refresh list
  }

  // Filter by search term
  const filteredQMS = qmsList.filter(qms => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        (qms.qms_reference && qms.qms_reference.toLowerCase().includes(search)) ||
        (qms.project?.project_name && qms.project.project_name.toLowerCase().includes(search)) ||
        (qms.project?.project_code && qms.project.project_code.toLowerCase().includes(search)) ||
        (qms.purpose && qms.purpose.toLowerCase().includes(search))
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Quality Management Strategies...</p>
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
            Quality Management Strategies
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage all quality management strategies across all projects
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={QMS_COLUMNS} data={filteredQMS} baseFilename="QMS" disabled={!filteredQMS.length} />
          <button
            onClick={handleCreateQMS}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create New QMS
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

      {/* QMS List */}
      {filteredQMS.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Shield className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Management Strategies
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'No QMS match your filters'
              : 'No quality management strategies have been created yet'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleCreateQMS}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First QMS
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
                {filteredQMS.map((qms) => (
                  <tr key={qms.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {qms.qms_reference || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        v{qms.version_number || '1.0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {qms.project?.project_name || 'N/A'}
                      </div>
                      {qms.project?.project_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {qms.project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                        {qms.purpose || 'No purpose defined'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(qms.status)}`}>
                        {qms.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {qms.created_at ? new Date(qms.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/app/projects/${qms.project_id}/qms`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                          title="View QMS"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {qms.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditQMS(qms)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
                              title="Edit QMS"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQMS(qms)}
                              disabled={deletingQMS === qms.id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Delete QMS"
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
                Select Project for QMS
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose a project to create a Quality Management Strategy for
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
                      className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QMS Form Modal */}
      {showQMSForm && selectedProjectId && (
        <QMSForm
          qms={selectedQMS}
          projectId={selectedProjectId}
          onSave={handleQMSSaved}
          onCancel={() => {
            setShowQMSForm(false)
            setSelectedQMS(null)
            setSelectedProjectId(null)
          }}
        />
      )}
    </div>
  )
}
