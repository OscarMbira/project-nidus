import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function IssueReportIssueSummarySection({
  formData,
  onChange,
  errors = {},
  issueId,
  readOnly = false
}) {
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (issueId) {
      loadIssue()
    }
  }, [issueId])

  const loadIssue = async () => {
    try {
      setLoading(true)
      const { getIssueById } = await import('../../services/issueService')
      const issueData = await getIssueById(issueId)
      setIssue(issueData)
    } catch (error) {
      console.error('Error loading issue:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshFromIssue = async () => {
    if (!issueId) return
    
    try {
      setLoading(true)
      const { getIssueById } = await import('../../services/issueService')
      const issueData = await getIssueById(issueId)
      setIssue(issueData)
      
      onChange('issue_identifier', issueData.issue_identifier || '')
      onChange('issue_type', issueData.issue_type || '')
      onChange('issue_title', issueData.title || issueData.issue_title || '')
      onChange('issue_description', issueData.description || issueData.issue_description || '')
    } catch (error) {
      console.error('Error refreshing from issue:', error)
      alert('Error refreshing from issue: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !issue) {
    return <div className="text-center py-8">Loading issue details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Summary</h3>
        </div>
        {issueId && (
          <div className="flex gap-2">
            {!readOnly && (
              <button
                onClick={refreshFromIssue}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                title="Refresh from Issue"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => navigate(`/projects/${issue?.project_id}/issues/${issueId}`)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              title="View Full Issue"
            >
              <ExternalLink className="w-4 h-4" />
              View Issue
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> This section is auto-populated from the linked issue. You can manually override the values if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Issue Identifier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Issue Identifier
          </label>
          <input
            type="text"
            value={formData.issue_identifier || ''}
            onChange={(e) => onChange('issue_identifier', e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            placeholder="ISS-2026-001"
          />
        </div>

        {/* Issue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Issue Type
          </label>
          <input
            type="text"
            value={formData.issue_type || ''}
            onChange={(e) => onChange('issue_type', e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            placeholder="Request for Change, Off-Specification, Problem/Concern"
          />
        </div>
      </div>

      {/* Issue Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Issue Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.issue_title || ''}
          onChange={(e) => onChange('issue_title', e.target.value)}
          readOnly={readOnly}
          className={`w-full px-3 py-2 border rounded-lg ${
            readOnly
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
          } ${errors.issue_title ? 'border-red-500' : ''}`}
          placeholder="Brief description of the issue"
        />
        {errors.issue_title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue_title}</p>
        )}
      </div>

      {/* Issue Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Issue Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.issue_description || ''}
          onChange={(e) => onChange('issue_description', e.target.value)}
          readOnly={readOnly}
          rows={8}
          className={`w-full px-3 py-2 border rounded-lg ${
            readOnly
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
          } ${errors.issue_description ? 'border-red-500' : ''}`}
          placeholder="Detailed description of the issue..."
        />
        {errors.issue_description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue_description}</p>
        )}
      </div>

      {/* Issue Status Display (if available) */}
      {issue && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Issue Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Priority:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{issue.priority || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Severity:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{issue.severity || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{issue.status || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Date Raised:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {issue.date_raised ? new Date(issue.date_raised).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
