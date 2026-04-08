import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { FileText, Search, Filter, Eye, CheckCircle, Clock, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import { getPPDByProject, deletePPD } from '../services/projectProductDescriptionService'
import PPDForm from '../components/ppd/PPDForm'
import ExportListMenu from '../components/ui/ExportListMenu'

const PPD_COLUMNS = [
  { key: 'product_title', label: 'Product Title' },
  { key: 'document_ref', label: 'Document Ref' },
  { key: 'status', label: 'Status' },
  { key: 'project_id', label: 'Project' }
]

export default function PPDList() {
  const navigate = useNavigate()
  const [ppds, setPpds] = useState([])
  const [projects, setProjects] = useState([])
  const [availableProjects, setAvailableProjects] = useState([]) // Projects user can create PPDs for
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'draft', 'under_review', 'approved', 'superseded'
  const [showPPDForm, setShowPPDForm] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [selectedPPD, setSelectedPPD] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [deletingPPD, setDeletingPPD] = useState(null)

  useEffect(() => {
    fetchPPDs()
    fetchAvailableProjects()
  }, [statusFilter])

  const fetchAvailableProjects = async () => {
    try {
      // Get projects the user is a member of (for creating PPDs)
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

  const fetchPPDs = async () => {
    try {
      setLoading(true)

      // Fetch all PPDs (PMO Admin has access to all)
      const { data: ppdsData, error: ppdsError } = await supabase
        .from('project_product_descriptions')
        .select(`
          *,
          project:project_id(id, project_name, project_code),
          author:author_id(id, full_name, email),
          owner:owner_id(id, full_name, email)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (ppdsError) throw ppdsError

      // Filter by status if needed
      let filteredPPDs = ppdsData || []
      if (statusFilter !== 'all') {
        filteredPPDs = filteredPPDs.filter(ppd => ppd.status === statusFilter)
      }

      // Fetch projects to get project names
      const projectIds = [...new Set((filteredPPDs || []).map(ppd => ppd.project_id))]
      if (projectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, project_name, project_code')
          .in('id', projectIds)
          .eq('is_deleted', false)

        setProjects(projectsData || [])
      }

      setPpds(filteredPPDs || [])
    } catch (error) {
      console.error('Error fetching PPDs:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'superseded':
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      default:
        return <FileText className="h-4 w-4 text-blue-600" />
    }
  }

  const handleCreatePPD = () => {
    // If user has projects, show selector, otherwise navigate to projects page
    if (availableProjects.length > 0) {
      setShowProjectSelector(true)
    } else {
      alert('You need to be a project owner or admin to create PPDs. Please join a project first.')
      navigate('/app/projects')
    }
  }

  const handleProjectSelected = (projectId) => {
    setSelectedProjectId(projectId)
    setShowProjectSelector(false)
    setSelectedPPD(null)
    setShowPPDForm(true)
  }

  const handleEditPPD = (ppd) => {
    setSelectedPPD(ppd)
    setSelectedProjectId(ppd.project_id)
    setShowPPDForm(true)
  }

  const handleDeletePPD = async (ppd) => {
    if (!confirm(`Are you sure you want to delete PPD "${ppd.product_title || ppd.ppd_reference}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingPPD(ppd.id)
      await deletePPD(ppd.id)
      alert('PPD deleted successfully')
      fetchPPDs() // Refresh list
    } catch (error) {
      console.error('Error deleting PPD:', error)
      alert('Error deleting PPD: ' + error.message)
    } finally {
      setDeletingPPD(null)
    }
  }

  const handlePPDSaved = () => {
    setShowPPDForm(false)
    setSelectedPPD(null)
    setSelectedProjectId(null)
    fetchPPDs() // Refresh list
  }

  // Filter by search term
  const filteredPPDs = ppds.filter(ppd => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      ppd.ppd_reference?.toLowerCase().includes(searchLower) ||
      ppd.product_title?.toLowerCase().includes(searchLower) ||
      ppd.project?.project_name?.toLowerCase().includes(searchLower) ||
      ppd.project?.project_code?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Project Product Descriptions...</p>
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
            Project Product Descriptions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage all project product descriptions across all projects
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={PPD_COLUMNS} data={filteredPPDs} baseFilename="PPD" disabled={!filteredPPDs.length} />
          <button
            onClick={handleCreatePPD}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create New PPD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, title, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

      {/* PPD List */}
      {filteredPPDs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Product Descriptions
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'No PPDs match your filters'
              : 'No project product descriptions have been created yet'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleCreatePPD}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First PPD
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Author
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
                {filteredPPDs.map((ppd) => (
                  <tr key={ppd.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {ppd.ppd_reference || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {ppd.product_title || 'Untitled'}
                      </div>
                      {ppd.purpose && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {ppd.purpose.substring(0, 60)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {ppd.project?.project_name || 'N/A'}
                      </div>
                      {ppd.project?.project_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {ppd.project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ppd.version_number || '1.0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center gap-1 rounded-full text-xs font-medium ${getStatusColor(ppd.status)}`}>
                        {getStatusIcon(ppd.status)}
                        {ppd.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ppd.author?.full_name || ppd.author_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ppd.created_at ? new Date(ppd.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/app/projects/${ppd.project_id}/ppd`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                          title="View PPD"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {ppd.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditPPD(ppd)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
                              title="Edit PPD"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePPD(ppd)}
                              disabled={deletingPPD === ppd.id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Delete PPD"
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

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredPPDs.length} of {ppds.length} Project Product Description{ppds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select Project for PPD
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose a project to create a Project Product Description for
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

      {/* PPD Form Modal */}
      {showPPDForm && selectedProjectId && (
        <PPDForm
          ppd={selectedPPD}
          projectId={selectedProjectId}
          onSave={handlePPDSaved}
          onCancel={() => {
            setShowPPDForm(false)
            setSelectedPPD(null)
            setSelectedProjectId(null)
          }}
        />
      )}
    </div>
  )
}
