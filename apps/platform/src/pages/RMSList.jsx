import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { platformDb } from '@nidus/supabase'
import { AlertTriangle, Search, Filter, CheckCircle, Clock, Plus } from 'lucide-react'
import { getRMSByProject, deleteRMS, createRMSForProject } from '../services/riskManagementStrategyService'
import RMSForm from '../components/rms/RMSForm'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { useCurrentProject } from '../context/CurrentProjectContext'

const RMS_COLUMNS = [
  { key: 'rms_reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'purpose', label: 'Purpose' }
]

/** Shorten seed-style RMS-YYYY-<32hex> to RMS-YYYY-#### (last 4); full ref stays in title. */
function formatRmsReferenceDisplay(ref) {
  if (!ref) return 'N/A'
  const m = String(ref).match(/^(RMS-\d{4}-)([A-Fa-f0-9]{20,})$/)
  if (m) return `${m[1]}${m[2].slice(-4).toUpperCase()}`
  if (ref.length > 18) return `${ref.slice(0, 12)}…${ref.slice(-4)}`
  return ref
}

/** List-friendly purpose: avoid single-line mid-word cut; clarify generic seed boilerplate. */
function formatRmsPurposeDisplay(rms) {
  const purpose = (rms.purpose || '').trim()
  const projectName = rms.project?.project_name
  if (!purpose) {
    return projectName
      ? `Risk management approach for ${projectName}`
      : 'No purpose defined'
  }
  if (/^to define how risk management/i.test(purpose) && projectName) {
    return `Defines how risks are identified, assessed and controlled for ${projectName}.`
  }
  return purpose
}

export default function RMSList() {
  const navigate = useNavigate()
  const location = useLocation()
  // Inside /pm/* (CurrentProjectProvider): scope list to the header project selector.
  // Outside (e.g. PMO): currentProjectId is null → show all accessible strategies.
  const { currentProjectId, currentProject, loading: projectCtxLoading } = useCurrentProject()
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
    if (projectCtxLoading) return
    fetchRMSList()
    fetchAvailableProjects()
  }, [statusFilter, currentProjectId, projectCtxLoading])

  const fetchAvailableProjects = async () => {
    try {
      // Projects the user can create RMS for (live membership = project_memberships)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return

      const { data: userData } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) return

      const projectIdSet = new Set()

      // project_memberships has project_role_id (not "role") — join project_roles
      const { data: memberships, error: memError } = await platformDb
        .from('project_memberships')
        .select(`
          project_id,
          project_roles:project_role_id ( role_name, role_display_name )
        `)
        .eq('user_id', userData.id)
        .eq('is_active', true)

      if (memError) throw memError
      ;(memberships || []).forEach((m) => {
        const role = String(
          m.project_roles?.role_name || m.project_roles?.role_display_name || ''
        ).toLowerCase()
        // Any active membership can open create; prefer manager-like roles when present
        if (!m.project_id) return
        if (
          !role ||
          role.includes('owner') ||
          role.includes('admin') ||
          role.includes('project_manager') ||
          role.includes('manager') ||
          role === 'pm' ||
          role.includes('pmo')
        ) {
          projectIdSet.add(m.project_id)
        }
      })

      // Legacy fallback: user_projects
      const { data: userProjectsData, error: upError } = await platformDb
        .from('user_projects')
        .select('project_id')
        .eq('user_id', userData.id)
        .in('access_level', ['owner', 'admin'])
        .eq('is_deleted', false)

      if (!upError) {
        ;(userProjectsData || []).forEach((up) => {
          if (up.project_id) projectIdSet.add(up.project_id)
        })
      }

      const projectIds = [...projectIdSet]
      if (projectIds.length === 0) {
        setAvailableProjects([])
        return
      }

      const { data: projectsData, error: projectsError } = await platformDb
        .from('projects')
        .select('id, project_name, project_code, is_deleted')
        .in('id', projectIds)
        .eq('is_deleted', false)

      if (projectsError) throw projectsError

      setAvailableProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching available projects:', error?.message || error)
      setAvailableProjects([])
    }
  }

  const fetchRMSList = async () => {
    try {
      setLoading(true)

      // Avoid ambiguous users!* embeds (many FKs to users → PostgREST 400).
      // Load RMS rows, then attach project names in a second query.
      let query = platformDb
        .from('risk_management_strategies')
        .select('*')
        .eq('is_deleted', false)

      if (currentProjectId) {
        query = query.eq('project_id', currentProjectId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const rows = data || []
      const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))]
      let projectById = {}
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .in('id', projectIds)
        if (!projectsError && projectsData) {
          projectById = Object.fromEntries(projectsData.map((p) => [p.id, p]))
        }
      }

      setRmsList(
        rows.map((r) => ({
          ...r,
          project: projectById[r.project_id] || null,
        }))
      )
    } catch (error) {
      console.error('Error fetching RMS list:', error?.message || error)
      alert('Error: ' + (error?.message || 'Failed to load Risk Management Strategies'))
      setRmsList([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRMS = () => {
    // PM header project already selected → create for that project directly
    if (currentProjectId) {
      handleProjectSelected(currentProjectId)
      return
    }
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
            {currentProjectId
              ? `Strategies for ${currentProject?.projectName || 'the selected project'}`
              : 'View and manage all risk management strategies across all projects'}
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
                <TableRowNumberHeader className="!normal-case" />
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
                {filteredRMS.map((rms, index) => (
                  <tr key={rms.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-white font-mono"
                        title={rms.rms_reference || undefined}
                      >
                        {formatRmsReferenceDisplay(rms.rms_reference)}
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
                    <td className="px-6 py-4 max-w-xs sm:max-w-sm lg:max-w-md">
                      <p
                        className="text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug"
                        title={rms.purpose || undefined}
                      >
                        {formatRmsPurposeDisplay(rms)}
                      </p>
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
                        <RowActionButton
                          variant="view"
                          label="View RMS"
                          onClick={() => {
                            const key = rms.project?.project_code || rms.project_id
                            const listReturn =
                              location.pathname.includes('/pm/')
                                ? `${location.pathname}${currentProjectId ? `?projectId=${currentProjectId}` : ''}`
                                : null
                            navigate(platformProjectPath(key, 'rms'), {
                              state: listReturn ? { from: listReturn } : undefined,
                            })
                          }}
                        />
                        {rms.status === 'draft' && (
                          <>
                            <RowActionButton
                              variant="edit"
                              label="Edit RMS"
                              onClick={() => handleEditRMS(rms)}
                            />
                            <RowActionButton
                              variant="delete"
                              label="Delete RMS"
                              onClick={() => handleDeleteRMS(rms)}
                              disabled={deletingRMS === rms.id}
                            />
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
