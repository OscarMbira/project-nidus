import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { platformProjectPath } from '../utils/projectRouteParam'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, AlertCircle, Bug, Zap, CheckCircle, Clock, XCircle, Filter, Search } from 'lucide-react'
import ExportListMenu from '../components/ui/ExportListMenu'
import { useViewMode } from '../hooks/useViewMode'
import ViewToggle from '../components/ui/ViewToggle'
import IssueForm from '../components/IssueForm'
import IssueList from '../components/IssueList'
import Pagination from '../components/Pagination'
import SortToolbar from '../components/ui/SortToolbar'
import { useSortableTable } from '../hooks/useSortableTable'

import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
const ISSUE_EXPORT_COLUMNS = [
  { key: 'issue_title', label: 'Title' },
  { key: 'issue_type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assigned', label: 'Assigned To' },
  { key: 'created_at', label: 'Created' },
]

export default function Issues() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    issue_type: '',
    assigned_to: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20
  const [issueViewMode, setIssueViewMode] = useViewMode('issues', 'grid')

  const { handleSort, getSortDirectionForColumn, supabaseOrder } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-issues-sort',
    serverColumnMap: {
      priority: 'priority',
      status: 'status',
      issue_type: 'issue_type',
      created_at: 'created_at',
    },
  })

  const sortFetchKey = useMemo(
    () => `${supabaseOrder.column}:${supabaseOrder.ascending ? '1' : '0'}`,
    [supabaseOrder]
  )

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchIssues()
    }
  }, [projectId, filters, currentPage, sortFetchKey])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchIssues = async () => {
    try {
      setLoading(true)
      
      // Build count query
      let countQuery = supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      // Build data query
      let query = supabase
        .from('issues')
        .select(`
          *,
          reported_by:reported_by_user_id (id, email, full_name),
          assigned_to:assigned_to_user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
        countQuery = countQuery.eq('status', filters.status)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
        countQuery = countQuery.eq('priority', filters.priority)
      }
      if (filters.issue_type) {
        query = query.eq('issue_type', filters.issue_type)
        countQuery = countQuery.eq('issue_type', filters.issue_type)
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to_user_id', filters.assigned_to)
        countQuery = countQuery.eq('assigned_to_user_id', filters.assigned_to)
      }
      if (filters.search) {
        query = query.or(`issue_title.ilike.%${filters.search}%,issue_description.ilike.%${filters.search}%`)
        countQuery = countQuery.or(`issue_title.ilike.%${filters.search}%,issue_description.ilike.%${filters.search}%`)
      }

      // Get total count
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data, error } = await query
        .order(supabaseOrder.column, { ascending: supabaseOrder.ascending })
        .range(from, to)

      if (error) throw error
      setIssues(data || [])
    } catch (error) {
      console.error('Error fetching issues:', error)
      alert('Error loading issues: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateIssue = () => {
    setSelectedIssue(null)
    setShowIssueForm(true)
  }

  const handleEditIssue = (issue) => {
    setSelectedIssue(issue)
    setShowIssueForm(true)
  }

  const handleIssueSaved = () => {
    setShowIssueForm(false)
    setSelectedIssue(null)
    fetchIssues()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issues...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: issues.length,
    new: issues.filter(i => i.status === 'new').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    closed: issues.filter(i => i.status === 'closed').length,
    critical: issues.filter(i => i.priority === 'critical' || i.severity === 'critical').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(platformProjectPath(routeKey || projectId))}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Issue Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name} - Track and manage project issues
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.new}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Closed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.closed}</p>
            </div>
            <XCircle className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={filters.issue_type}
            onChange={(e) => setFilters({ ...filters, issue_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="bug">Bug</option>
            <option value="enhancement">Enhancement</option>
            <option value="task">Task</option>
            <option value="question">Question</option>
            <option value="blocker">Blocker</option>
            <option value="risk">Risk</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Issues ({issues.length})
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <ExportListMenu
            columns={ISSUE_EXPORT_COLUMNS}
            data={issues.map((i, index) => ({
              ...i,
              assigned: i.assigned_to?.full_name || i.assigned_to?.email || '',
            }))}
            baseFilename="Issues"
            disabled={!issues.length}
          />
          <ViewToggle value={issueViewMode} onChange={setIssueViewMode} ariaLabel="Issues layout" />
          <button
            onClick={handleCreateIssue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Issue
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading issues...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <SortToolbar
              columns={[
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'issue_type', label: 'Type' },
                { key: 'created_at', label: 'Created' },
              ]}
              getSortDirection={getSortDirectionForColumn}
              onSort={handleSort}
            />
          </div>
          <IssueList
            issues={issues}
            onEdit={handleEditIssue}
            onRefresh={fetchIssues}
            projectId={projectId}
            viewMode={issueViewMode}
          />
          {totalCount > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalCount}
            />
          )}
        </>
      )}

      {/* Issue Form Modal */}
      {showIssueForm && (
        <IssueForm
          issue={selectedIssue}
          projectId={projectId}
          onSave={handleIssueSaved}
          onCancel={() => {
            setShowIssueForm(false)
            setSelectedIssue(null)
          }}
        />
      )}
    </div>
  )
}

