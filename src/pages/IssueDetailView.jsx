import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { ArrowLeft, Edit2, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Package, User, Calendar, MessageSquare, History, Link2, Eye, EyeOff } from 'lucide-react'
import { getIssueById, updateStatus, closeIssue, reopenIssue } from '../services/issueService'
import { getActions } from '../services/issueActionService'
import { getDecisions } from '../services/issueDecisionService'
import { getStatusHistory } from '../services/issueService'
import IssueForm from '../components/IssueForm'
import IssueActionsPanel from '../components/issues/IssueActionsPanel'
import IssueDecisionsPanel from '../components/issues/IssueDecisionsPanel'
import IssueCommentsSection from '../components/issues/IssueCommentsSection'
import IssueAttachments from '../components/issues/IssueAttachments'
import IssueStatusHistory from '../components/issues/IssueStatusHistory'
import IssueTypeBadge from '../components/issues/IssueTypeBadge'
import IssuePriorityBadge from '../components/issues/IssuePriorityBadge'
import IssueSeverityBadge from '../components/issues/IssueSeverityBadge'
import IssueStatusBadge from '../components/issues/IssueStatusBadge'
import TransferToRiskDialog from '../components/issues/TransferToRiskDialog'
import CreateChangeRequestDialog from '../components/issues/CreateChangeRequestDialog'
import IssueLinksPanel from '../components/issues/IssueLinksPanel'
import IssueWatchersPanel from '../components/issues/IssueWatchersPanel'
import IssueExportMenu from '../components/issues/IssueExportMenu'
import CreateIssueReportButton from '../components/issues/CreateIssueReportButton'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const ISSUE_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'issue_identifier', label: 'Identifier' },
    { key: 'issue_title', label: 'Title' },
    { key: 'issue_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'severity', label: 'Severity' }
  ]},
  { title: 'Description', fields: [{ key: 'issue_description', label: 'Description' }] }
]
import IssueReportQuickView from '../components/issues/IssueReportQuickView'

export default function IssueDetailView() {
  const { issueId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [actions, setActions] = useState([])
  const [decisions, setDecisions] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false)

  useEffect(() => {
    if (issueId) {
      fetchData()
    }
  }, [issueId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch issue
      const issueData = await getIssueById(issueId)
      setIssue(issueData)

      // Fetch related data
      const [actionsData, decisionsData, historyData, commentsData] = await Promise.all([
        getActions(issueId),
        getDecisions(issueId),
        getStatusHistory(issueId),
        fetchComments(issueId)
      ])

      setActions(actionsData)
      setDecisions(decisionsData)
      setStatusHistory(historyData)
      setComments(commentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (issueId) => {
    try {
      const { data, error } = await supabase
        .from('issue_comments')
        .select(`
          *,
          user:user_id (id, full_name, email)
        `)
        .eq('issue_id', issueId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'closed') {
        const resolution = prompt('Enter resolution description:')
        if (resolution) {
          await closeIssue(issueId, resolution)
        }
      } else if (newStatus === 'raised' && issue.status === 'closed') {
        const reason = prompt('Enter reason for reopening:')
        if (reason) {
          await reopenIssue(issueId, reason)
        }
      } else {
        await updateStatus(issueId, newStatus)
      }
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this issue?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('issues')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', issueId)

      if (error) throw error
      navigate(`/projects/${projectId}/issues/register`)
    } catch (error) {
      console.error('Error deleting issue:', error)
      alert('Error deleting issue: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Details...</p>
        </div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Issue not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/issues/register`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Issue Register
          </button>
        </div>
      </div>
    )
  }

  const isRFC = issue.issue_type === 'request_for_change'
  const isOffSpec = issue.issue_type === 'off_specification'
  const isProblem = issue.issue_type === 'problem_concern'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/issues/register`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Issue Register
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <IssueTypeBadge type={issue.issue_type} />
              {issue.issue_identifier && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                  {issue.issue_identifier}
                </span>
              )}
              <IssueStatusBadge status={issue.status} />
              <IssuePriorityBadge priority={issue.priority} />
              <IssueSeverityBadge severity={issue.severity} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {issue.issue_title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {issue.date_raised && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Raised: {format(new Date(issue.date_raised), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {issue.raised_by && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Raised by: {issue.raised_by.full_name || issue.raised_by.email}</span>
                </div>
              )}
              {issue.owner && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Owner: {issue.owner.full_name || issue.owner.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportWord={() => exportRecordToWord(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportExcel={() => exportRecordToExcel(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportCSV={() => exportRecordToCSV(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportXML={() => exportRecordToXML(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportJSON={() => exportRecordToJSON(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
              onExportPrint={() => exportRecordToPrint(ISSUE_EXPORT_SECTIONS, issue, `Issue_${issue.issue_identifier || issue.id}`)}
            />
            <IssueExportMenu 
              issues={[issue]} 
              register={null}
              selectedIssue={issue}
            />
            {issue.status !== 'closed' && issue.status !== 'cancelled' && (
              <>
                <CreateIssueReportButton issueId={issueId} projectId={projectId} />
                <button
                  onClick={() => setShowEditForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                {isRFC && (
                  <button
                    onClick={() => setShowChangeRequestDialog(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Create Change Request
                  </button>
                )}
                <button
                  onClick={() => setShowTransferDialog(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Transfer to Risk
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          {issue.status === 'awaiting_decision' && (
            <button
              onClick={() => setActiveTab('decisions')}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
            >
              Record Decision
            </button>
          )}
          {issue.status === 'raised' && (
            <button
              onClick={() => handleStatusChange('under_assessment')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Start Assessment
            </button>
          )}
          {issue.status === 'under_assessment' && (
            <button
              onClick={() => handleStatusChange('awaiting_decision')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Request Decision
            </button>
          )}
          {issue.status === 'approved' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Start Resolution
            </button>
          )}
          {issue.status === 'resolved' && (
            <button
              onClick={() => handleStatusChange('closed')}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Close Issue
            </button>
          )}
          {issue.status === 'closed' && (
            <button
              onClick={() => handleStatusChange('raised')}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
            >
              Reopen Issue
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['overview', 'actions', 'decisions', 'comments', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'actions' && `Actions (${actions.length})`}
                {tab === 'decisions' && `Decisions (${decisions.length})`}
                {tab === 'comments' && `Comments (${comments.length})`}
                {tab === 'history' && 'History'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {issue.issue_description}
                </p>
              </div>

              {/* Cause Description (for Off-spec) */}
              {isOffSpec && issue.cause_description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Root Cause</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {issue.cause_description}
                  </p>
                </div>
              )}

              {/* Issue Report Quick View */}
              <IssueReportQuickView issueId={issueId} projectId={projectId} />

              {/* Impact Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Impact Analysis</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                    {issue.impact_description}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {issue.cost_impact && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cost Impact</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${parseFloat(issue.cost_impact).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {issue.schedule_impact_days && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Impact</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {issue.schedule_impact_days} days
                        </p>
                      </div>
                    )}
                    {issue.quality_impact && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quality Impact</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {issue.quality_impact}
                        </p>
                      </div>
                    )}
                    {issue.scope_impact && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Scope Impact</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {issue.scope_impact}
                        </p>
                      </div>
                    )}
                    {issue.affects_baseline && (
                      <div className="col-span-full">
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-sm">
                          ⚠️ Affects Project Baseline
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ownership */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Ownership</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Raised By</p>
                    <p className="text-gray-900 dark:text-white">
                      {issue.raised_by?.full_name || issue.raised_by?.email || issue.raised_by_name || 'N/A'}
                    </p>
                    {issue.date_raised && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(issue.date_raised), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Author</p>
                    <p className="text-gray-900 dark:text-white">
                      {issue.author?.full_name || issue.author?.email || issue.author_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Owner</p>
                    <p className="text-gray-900 dark:text-white">
                      {issue.owner?.full_name || issue.owner?.email || issue.owner_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Related Items */}
              {(issue.related_product || issue.change_request || issue.transferred_to_risk || issue.escalated_from_risk) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Related Items</h3>
                  <div className="space-y-2">
                    {issue.related_product && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Product: {issue.related_product.product_name || issue.related_product_name}
                        </span>
                      </div>
                    )}
                    {issue.change_request && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Change Request: {issue.change_request.change_title}
                        </span>
                      </div>
                    )}
                    {issue.transferred_to_risk && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Transferred to Risk: {issue.transferred_to_risk.risk_title}
                        </span>
                      </div>
                    )}
                    {issue.escalated_from_risk && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Escalated from Risk: {issue.escalated_from_risk.risk_title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {issue.tags && issue.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {issue.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution */}
              {issue.resolution_description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Resolution</h3>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {issue.resolution_description}
                    </p>
                    {issue.resolution_date && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Resolved: {format(new Date(issue.resolution_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                    {issue.resolved_by && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        By: {issue.resolved_by.full_name || issue.resolved_by.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Related Issues */}
              <IssueLinksPanel issue={issue} projectId={projectId} />

              {/* Watchers */}
              <IssueWatchersPanel issue={issue} projectId={projectId} />
            </div>
          )}

          {activeTab === 'actions' && (
            <IssueActionsPanel
              issueId={issueId}
              actions={actions}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'decisions' && (
            <IssueDecisionsPanel
              issueId={issueId}
              issue={issue}
              decisions={decisions}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'comments' && (
            <IssueCommentsSection
              issueId={issueId}
              comments={comments}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'attachments' && issueId && (
            <IssueAttachments issueId={issueId} />
          )}

          {activeTab === 'history' && (
            <IssueStatusHistory
              history={statusHistory}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditForm && (
        <IssueForm
          issue={issue}
          projectId={projectId}
          issueRegisterId={issue.issue_register_id}
          onSave={() => {
            setShowEditForm(false)
            fetchData()
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showTransferDialog && (
        <TransferToRiskDialog
          issue={issue}
          onClose={() => setShowTransferDialog(false)}
          onSuccess={() => {
            setShowTransferDialog(false)
            navigate(`/projects/${projectId}/risks`)
          }}
        />
      )}

      {showChangeRequestDialog && (
        <CreateChangeRequestDialog
          issue={issue}
          onClose={() => setShowChangeRequestDialog(false)}
          onSuccess={() => {
            setShowChangeRequestDialog(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
