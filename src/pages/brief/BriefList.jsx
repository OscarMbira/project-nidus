/**
 * Brief List Page
 * List all briefs (PMO Admin).
 * In PMO context, "Create Brief" opens a project selector (no projectId in URL).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, Eye, Edit, Filter, Plus } from 'lucide-react'
import { getAllBriefs } from '../../services/projectBriefService'
import { getAllProjects } from '../../services/projectService'
import { platformDb } from '../../services/supabase/supabaseClient'
import BriefStatusBadge from '../../components/brief/BriefStatusBadge'
import ExportListMenu from '../../components/ui/ExportListMenu'

const BRIEF_COLUMNS = [
  { key: 'brief_reference', label: 'Reference' },
  { key: 'project_name', label: 'Project' },
  { key: 'document_status', label: 'Status' },
  { key: 'version_number', label: 'Version' },
  { key: 'created_date', label: 'Created' }
]

export default function BriefList() {
  const navigate = useNavigate()
  const location = useLocation()
  const isPMOContext = location.pathname.startsWith('/pmo')
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [projectsForBrief, setProjectsForBrief] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  useEffect(() => {
    loadBriefs()
  }, [filter])

  const loadBriefs = async () => {
    try {
      setLoading(true)
      const filters = filter !== 'all' ? { status: filter } : {}
      const data = await getAllBriefs(filters)
      setBriefs(data)
    } catch (error) {
      console.error('Error loading briefs:', error)
      alert('Error loading briefs: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectsForSelector = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (!userRecord) return
      let organizationId = null
      const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).single()
      if (account) organizationId = account.id
      else {
        const { data: project } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).limit(1).single()
        if (project?.account_id) organizationId = project.account_id
      }
      if (!organizationId) { setProjectsForBrief([]); return }
      const result = await getAllProjects(organizationId, {})
      if (result?.data) setProjectsForBrief(result.data)
      else setProjectsForBrief([])
    } catch (e) {
      console.error('Error loading projects for brief:', e)
      setProjectsForBrief([])
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const getStatusCounts = () => {
    const counts = {
      all: briefs.length,
      draft: briefs.filter(b => b.document_status === 'draft').length,
      under_review: briefs.filter(b => b.document_status === 'under_review').length,
      approved: briefs.filter(b => b.document_status === 'approved').length,
      rejected: briefs.filter(b => b.document_status === 'rejected').length
    }
    return counts
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading briefs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Briefs</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all project briefs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {briefs.length > 0 && (
            <ExportListMenu
              columns={BRIEF_COLUMNS}
              data={briefs.map(b => ({ ...b, project_name: b.project?.project_name || '' }))}
              baseFilename="Briefs"
            />
          )}
          {isPMOContext && (
            <button
              onClick={() => { setShowProjectSelector(true); loadProjectsForSelector() }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Brief
            </button>
          )}
        </div>
      </div>

      {/* Project selector modal for Create Brief (PMO context) */}
      {showProjectSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowProjectSelector(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select project to create brief</h2>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingProjects ? (
                <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
              ) : projectsForBrief.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No projects found.</p>
              ) : (
                <ul className="space-y-1">
                  {projectsForBrief.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { navigate(`/platform/projects/${p.id}/brief/create`); setShowProjectSelector(false) }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {p.project_name || p.project_code || p.id}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setShowProjectSelector(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div className="flex gap-2">
            {['all', 'draft', 'under_review', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Briefs List */}
      {briefs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No briefs found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {briefs.map((brief) => (
                <tr key={brief.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {brief.brief_reference}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {brief.project?.project_name || 'N/A'}
                    </div>
                    {brief.project?.project_code && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {brief.project.project_code}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <BriefStatusBadge status={brief.document_status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {brief.version_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {brief.created_date ? new Date(brief.created_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/platform/projects/${brief.project_id}/brief/view`)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(brief.document_status === 'draft' || brief.document_status === 'rejected') && (
                        <button
                          onClick={() => navigate(`/platform/projects/${brief.project_id}/brief/edit`)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
