import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { Plus, AlertCircle, FileText, AlertTriangle, HelpCircle, Filter, Search, BarChart3, ExternalLink } from 'lucide-react'
import { getOrCreateIssueRegister, getIssueRegisterByProject } from '../services/issueRegisterService'
import { getIssues, getRFCs, getOffSpecifications, getProblemsAndConcerns } from '../services/issueService'
import { getIssueSummary as getAnalyticsSummary } from '../services/issueAnalyticsService'
import IssueForm from '../components/IssueForm'
import IssueList from '../components/IssueList'
import IssueExportMenu from '../components/issues/IssueExportMenu'
import ExportListMenu from '../components/ui/ExportListMenu'
import IssuesByTypeChart from '../components/issues/IssuesByTypeChart'

const ISSUE_COLUMNS = [
  { key: 'issue_identifier', label: 'ID' },
  { key: 'issue_title', label: 'Title' },
  { key: 'issue_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'severity', label: 'Severity' },
  { key: 'issue_description', label: 'Description' }
]
import IssuesByStatusChart from '../components/issues/IssuesByStatusChart'
import IssuesByPriorityChart from '../components/issues/IssuesByPriorityChart'
import IssueHeatmap from '../components/issues/IssueHeatmap'
import CriticalIssuesAlert from '../components/issues/CriticalIssuesAlert'
import OpenIssuesWidget from '../components/issues/OpenIssuesWidget'
import IssuePrintView from '../components/issues/IssuePrintView'

export default function IssueRegisterView() {
  useOfflineQueue()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [issueRegister, setIssueRegister] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'rfc', 'off_spec', 'problem'
  const [viewMode, setViewMode] = useState('list') // 'list', 'analytics'
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    severity: '',
    owner: '',
    search: '',
  })
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  useEffect(() => {
    if (issueRegister) {
      fetchIssues()
      fetchSummary()
    }
  }, [issueRegister, activeTab, filters])

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

      // Get or create issue register
      const register = await getOrCreateIssueRegister(projectId)
      setIssueRegister(register)
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

      let issuesData = []
      
      if (activeTab === 'rfc') {
        issuesData = await getRFCs(issueRegister.id)
      } else if (activeTab === 'off_spec') {
        issuesData = await getOffSpecifications(issueRegister.id)
      } else if (activeTab === 'problem') {
        issuesData = await getProblemsAndConcerns(issueRegister.id)
      } else {
        issuesData = await getIssues(issueRegister.id, filters)
      }

      // Apply additional filters
      if (filters.status) {
        issuesData = issuesData.filter(i => i.status === filters.status)
      }
      if (filters.priority) {
        issuesData = issuesData.filter(i => i.priority === filters.priority)
      }
      if (filters.severity) {
        issuesData = issuesData.filter(i => i.severity === filters.severity)
      }
      if (filters.owner) {
        issuesData = issuesData.filter(i => i.owner_id === filters.owner)
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        issuesData = issuesData.filter(i => 
          i.issue_title?.toLowerCase().includes(searchLower) ||
          i.issue_description?.toLowerCase().includes(searchLower) ||
          i.issue_identifier?.toLowerCase().includes(searchLower)
        )
      }

      setIssues(issuesData)
    } catch (error) {
      console.error('Error fetching issues:', error)
      alert('Error loading issues: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const summaryData = await getAnalyticsSummary(projectId)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching summary:', error)
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
    fetchSummary()
  }

  if (loading && !issueRegister) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Register...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Issue Register
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {issueRegister?.register_reference}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportListMenu columns={ISSUE_COLUMNS} data={issues} baseFilename="IssueRegister" disabled={!issues?.length} />
            <IssueExportMenu 
              issues={issues} 
              register={issueRegister}
              selectedIssue={selectedIssue}
            />
            <button
              onClick={handleCreateIssue}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Issue
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_issues || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.open_issues || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.critical_issues || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue Actions</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.overdue_actions || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Type Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Issues
              {summary && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {summary.total_issues || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rfc')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'rfc'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-1" />
              RFCs
              {summary && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {summary.rfcs_count || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('off_spec')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'off_spec'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Off-Specs
              {summary && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {summary.off_specs_count || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'problem'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <HelpCircle className="h-4 w-4 inline mr-1" />
              Problems
              {summary && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {summary.problems_count || 0}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* View Mode Toggle and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Analytics
          </button>
        </div>
        <div className="flex items-center gap-2">
          {issueRegister && (
            <IssueExportMenu
              register={issueRegister}
              issues={issues}
              onPrint={() => setShowPrintView(true)}
            />
          )}
          <button
            onClick={() => {
              setSelectedIssue(null)
              setShowIssueForm(true)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Issue
          </button>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {viewMode === 'list' && <CriticalIssuesAlert projectId={projectId} />}

      {/* View Mode Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Analytics
          </button>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {viewMode === 'list' && <CriticalIssuesAlert projectId={projectId} />}

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
            <option value="draft">Draft</option>
            <option value="raised">Raised</option>
            <option value="under_assessment">Under Assessment</option>
            <option value="awaiting_decision">Awaiting Decision</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
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
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Severities</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading issues...</p>
          </div>
        </div>
      ) : (
        <IssueList
          issues={issues}
          onEdit={handleEditIssue}
          onRefresh={fetchIssues}
          projectId={projectId}
        />
      )}

      {/* Issue Form Modal */}
      {showIssueForm && (
        <IssueForm
          issue={selectedIssue}
          projectId={projectId}
          issueRegisterId={issueRegister?.id}
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
