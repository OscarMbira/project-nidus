import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { useOfflineQueue } from '@nidus/shared/hooks/useOfflineQueue'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import {
  Plus,
  AlertCircle,
  FileText,
  AlertTriangle,
  HelpCircle,
  Search,
  BarChart3,
  Settings,
  LayoutDashboard,
  List,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { getOrCreateIssueRegister } from '../services/issueRegisterService'
import { getIssues, getRFCs, getOffSpecifications, getProblemsAndConcerns } from '../services/issueService'
import { getIssueSummary as getAnalyticsSummary } from '../services/issueAnalyticsService'
import { getOverdueActions } from '../services/issueActionService'
import IssueForm from '../components/IssueForm'
import IssueList, { formatIssueAge } from '../components/IssueList'
import IssueExportMenu from '../components/issues/IssueExportMenu'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import { DashboardStatCard } from '@nidus/ui'
import TierFieldCustomisationPanel from '@nidus/ui/TierFieldCustomisationPanel.jsx'
import RecordLifecycleListHeader from '@nidus/ui/RecordLifecycleListHeader'
import useRecordLifecycleFilter from '@nidus/shared/hooks/useRecordLifecycleFilter'
import { ISSUE_REGISTER_CATEGORY } from '../features/local-data-extensions/components/InheritedIssueRegisterFields'
import { platformDb, simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { fetchBatchExportForEntities } from '../features/local-data-extensions/api/customFieldValuesApi'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import IssuesByTypeChart from '../components/issues/IssuesByTypeChart'
import IssuesByStatusChart from '../components/issues/IssuesByStatusChart'
import IssuesByPriorityChart from '../components/issues/IssuesByPriorityChart'
import IssueHeatmap from '../components/issues/IssueHeatmap'
import CriticalIssuesAlert from '../components/issues/CriticalIssuesAlert'
import OpenIssuesWidget from '../components/issues/OpenIssuesWidget'
import { ISSUE_EXPORT_COLUMNS, mapIssueForListExport } from '../constants/issueListColumns'

function statusCount(summary, key) {
  return summary?.issues_by_status?.[key] || 0
}

const ISSUE_EMPTY_FILTERS = { status: '', priority: '', severity: '', owner: '', search: '' }
// Matches get_issue_summary()'s open_issues definition (v174): everything except closed/cancelled/resolved.
const ISSUE_OPEN_STATUSES_EXCLUDED = ['closed', 'cancelled', 'resolved']

const tabBtn = (active) =>
  `px-3 py-1 rounded text-sm font-medium transition-colors ${
    active
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
  }`

export default function IssueRegisterView() {
  useOfflineQueue()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const location = useLocation()
  const isPmControlsRoute = location.pathname.includes('/pm/controls/')

  const [project, setProject] = useState(null)
  const [issueRegister, setIssueRegister] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'rfc', 'off_spec', 'problem'
  // dashboard = summary/alerts; register = filters + list
  const [viewMode, setViewMode] = useState('dashboard') // 'dashboard' | 'register' | 'analytics' | 'settings'
  const [issueListLayout, setIssueListLayout] = useViewMode('pm-issue-register', 'list')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    severity: '',
    owner: '',
    search: '',
  })
  const [summary, setSummary] = useState(null)
  const [issueCfCols, setIssueCfCols] = useState([])
  const [issueCfMatrix, setIssueCfMatrix] = useState({})
  const [issueOrgAccountId, setIssueOrgAccountId] = useState(null)
  const [issueProjectName, setIssueProjectName] = useState(null)

  const { statusFilter, setStatusFilter, counts } = useRecordLifecycleFilter('issues', { projectId })

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setIssueOrgAccountId(null)
      setIssueProjectName(null)
      return
    }
    let cancelled = false
    getCurrentUserAccountId().then((id) => {
      if (!cancelled) setIssueOrgAccountId(id)
    })
    simDb
      .from('practice_projects')
      .select('project_name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIssueProjectName(data?.project_name || null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (issueRegister?.id) {
      fetchIssues()
    }
  }, [issueRegister?.id, activeTab, filters, statusFilter])

  useEffect(() => {
    if (projectId) {
      fetchSummary()
    }
  }, [projectId])

  useEffect(() => {
    const aid = issueOrgAccountId || project?.account_id
    if (!aid || !issues?.length) {
      setIssueCfCols([])
      setIssueCfMatrix({})
      return
    }
    let cancelled = false
    const ids = issues.map((i) => i.id).filter(Boolean)
    ;(async () => {
      try {
        const { columns, matrix } = await fetchBatchExportForEntities(platformDb, {
          accountId: aid,
          entityType: 'issue',
          entityIds: ids,
          screenCode: 'issue_detail',
        })
        if (!cancelled) {
          setIssueCfCols(columns || [])
          setIssueCfMatrix(matrix || {})
        }
      } catch (err) {
        console.warn('Issue custom-field export columns unavailable:', err?.message || err)
        if (!cancelled) {
          setIssueCfCols([])
          setIssueCfMatrix({})
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [issueOrgAccountId, project?.account_id, issues])

  const issueExportColumns = useMemo(() => [...ISSUE_EXPORT_COLUMNS, ...issueCfCols], [issueCfCols])
  const issueExportRows = useMemo(
    () =>
      issues.map((i) => ({
        ...mapIssueForListExport(i, formatIssueAge),
        ...(issueCfMatrix[i.id] || {}),
      })),
    [issues, issueCfMatrix]
  )

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code, account_id')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      const register = await getOrCreateIssueRegister(projectId)
      setIssueRegister(register)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + (error?.message || 'Failed to load Issue Register'))
    } finally {
      setLoading(false)
    }
  }

  const fetchIssues = async () => {
    if (!issueRegister?.id) return
    try {
      setListLoading(true)

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

      if (!Array.isArray(issuesData)) issuesData = []

      if (filters.status) {
        issuesData = issuesData.filter((i) => i.status === filters.status)
      } else if (filters.status_not_in?.length) {
        issuesData = issuesData.filter((i) => !filters.status_not_in.includes(i.status))
      }
      if (filters.critical_only) {
        issuesData = issuesData.filter((i) => i.priority === 'critical' || i.severity === 'critical')
      }
      if (filters.overdue_actions_only) {
        try {
          const overdue = await getOverdueActions(projectId)
          const overdueIdentifiers = new Set((overdue || []).map((a) => a.issue_identifier))
          issuesData = issuesData.filter((i) => overdueIdentifiers.has(i.issue_identifier))
        } catch (e) {
          console.warn('Could not load overdue actions for filtering:', e?.message || e)
          issuesData = []
        }
      }
      if (filters.priority) {
        issuesData = issuesData.filter((i) => i.priority === filters.priority)
      }
      if (filters.severity) {
        issuesData = issuesData.filter((i) => i.severity === filters.severity)
      }
      if (filters.owner) {
        issuesData = issuesData.filter((i) => i.owner_id === filters.owner)
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        issuesData = issuesData.filter(
          (i) =>
            i.issue_title?.toLowerCase().includes(searchLower) ||
            i.issue_description?.toLowerCase().includes(searchLower) ||
            i.issue_identifier?.toLowerCase().includes(searchLower)
        )
      }

      const lifecycleStatuses = statusFilter?.length ? statusFilter : ['live']
      issuesData = issuesData.filter((i) => lifecycleStatuses.includes(i.record_status || 'live'))

      setIssues(issuesData)
    } catch (error) {
      console.error('Error fetching issues:', error)
      setIssues([])
    } finally {
      setListLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const summaryData = await getAnalyticsSummary(projectId)
      setSummary(summaryData)
    } catch (error) {
      console.warn('Issue summary unavailable:', error?.message || error)
      setSummary({
        total_issues: 0,
        open_issues: 0,
        rfcs_count: 0,
        off_specs_count: 0,
        problems_count: 0,
        critical_issues: 0,
        overdue_actions: 0,
        issues_by_status: {},
      })
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

  const handleCancelIssueForm = () => {
    setShowIssueForm(false)
    setSelectedIssue(null)
  }

  if (loading && !issueRegister) {
    return (
      <div className="flex items-center justify-center min-h-[16rem]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Register...</p>
        </div>
      </div>
    )
  }

  if (showIssueForm) {
    return (
      <div className="w-full space-y-4">
        <button
          type="button"
          onClick={handleCancelIssueForm}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to issue list
        </button>
        <IssueForm
          variant="page"
          issue={selectedIssue}
          projectId={projectId}
          issueRegisterId={issueRegister?.id}
          accountId={issueOrgAccountId || project?.account_id}
          onSave={handleIssueSaved}
          onCancel={handleCancelIssueForm}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {!isPmControlsRoute && (
        <button
          type="button"
          onClick={() => navigate(platformProjectPath(routeKey || projectId))}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to Project
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Issue Register
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {project?.project_name}
            {issueRegister?.register_reference ? ` · ${issueRegister.register_reference}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'register' && (
            <ViewToggle value={issueListLayout} onChange={setIssueListLayout} ariaLabel="Issue list layout" />
          )}
          <div className="flex flex-wrap items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button type="button" onClick={() => setViewMode('dashboard')} className={tabBtn(viewMode === 'dashboard')}>
              <LayoutDashboard className="h-4 w-4 inline mr-1" />
              Dashboard
            </button>
            <button type="button" onClick={() => setViewMode('register')} className={tabBtn(viewMode === 'register')}>
              <List className="h-4 w-4 inline mr-1" />
              Register
            </button>
            <button type="button" onClick={() => setViewMode('analytics')} className={tabBtn(viewMode === 'analytics')}>
              <BarChart3 className="h-4 w-4 inline mr-1" />
              Analytics
            </button>
            <button type="button" onClick={() => setViewMode('settings')} className={tabBtn(viewMode === 'settings')}>
              <Settings className="h-4 w-4 inline mr-1" />
              Settings
            </button>
          </div>
          {issueRegister && (
            <IssueExportMenu
              issues={issues}
              register={issueRegister}
              selectedIssue={selectedIssue}
              columns={issueExportColumns}
              data={issueExportRows}
              baseFilename="IssueRegister"
            />
          )}
          <button
            type="button"
            onClick={handleCreateIssue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Log Issue
          </button>
        </div>
      </div>

      {/* Dashboard — summary, alerts, open issues (no table) */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardStatCard
                label="Total Issues"
                value={summary.total_issues || 0}
                icon={AlertCircle}
                iconClassName="text-blue-500"
                onClick={() => { setFilters(ISSUE_EMPTY_FILTERS); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="New"
                value={statusCount(summary, 'new')}
                icon={Clock}
                iconClassName="text-yellow-500"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, status: 'new' }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="In Progress"
                value={statusCount(summary, 'in_progress')}
                icon={Zap}
                iconClassName="text-blue-500"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, status: 'in_progress' }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Resolved"
                value={statusCount(summary, 'resolved')}
                icon={CheckCircle}
                iconClassName="text-green-500"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, status: 'resolved' }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Closed"
                value={statusCount(summary, 'closed')}
                icon={XCircle}
                iconClassName="text-gray-500"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, status: 'closed' }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Critical"
                value={summary.critical_issues || 0}
                icon={AlertTriangle}
                iconClassName="text-red-500"
                accentClassName="text-red-600 dark:text-red-400"
                borderClassName="border-red-200 dark:border-red-800"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, critical_only: true }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Open Issues"
                value={summary.open_issues || 0}
                icon={FileText}
                iconClassName="text-yellow-500"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, status_not_in: ISSUE_OPEN_STATUSES_EXCLUDED }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Overdue Actions"
                value={summary.overdue_actions || 0}
                icon={AlertCircle}
                iconClassName="text-orange-500"
                accentClassName="text-orange-600 dark:text-orange-400"
                borderClassName="border-orange-200 dark:border-orange-800"
                onClick={() => { setFilters({ ...ISSUE_EMPTY_FILTERS, overdue_actions_only: true }); setViewMode('register'); }}
              />
            </div>
          )}
          <CriticalIssuesAlert projectId={projectId} />
          <OpenIssuesWidget projectId={projectId} onViewRegister={() => setViewMode('register')} />
        </div>
      )}

      {/* Register — lifecycle, type tabs, filters, list */}
      {viewMode === 'register' && (
        <div className="space-y-6">
          <RecordLifecycleListHeader
            tableName="issues"
            projectId={projectId}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            counts={counts}
          />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
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
                  type="button"
                  onClick={() => setActiveTab('rfc')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
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
                  type="button"
                  onClick={() => setActiveTab('off_spec')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
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
                  type="button"
                  onClick={() => setActiveTab('problem')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
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

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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

          {listLoading ? (
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
              viewMode={issueListLayout}
            />
          )}
        </div>
      )}

      {/* Analytics */}
      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IssuesByTypeChart projectId={projectId} />
          <IssuesByStatusChart projectId={projectId} />
          <IssuesByPriorityChart projectId={projectId} />
          <IssueHeatmap projectId={projectId} />
        </div>
      )}

      {/* Settings */}
      {viewMode === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Issue Register field templates
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Inherit fields from PMO / portfolio / programme defaults for this register, then disable or add local fields
            for this project. Mandatory lock prevents lower tiers from turning a field off.
          </p>
          {issueOrgAccountId && projectId ? (
            <TierFieldCustomisationPanel
              db={simDb}
              accountId={issueOrgAccountId}
              tier="project"
              entityType="project"
              entityId={projectId}
              entityName={issueProjectName || project?.project_name || 'Project'}
              category={ISSUE_REGISTER_CATEGORY}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          )}
        </div>
      )}
    </div>
  )
}
