import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { Edit2, Trash2, CheckCircle, Clock, AlertCircle, User, Calendar, Bug, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
import RowNumberBadge from './ui/RowNumberBadge'

export default function IssueList({ issues, onEdit, onRefresh, projectId, viewMode = 'grid' }) {
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (issueId) => {
    if (!confirm('Are you sure you want to delete this issue?')) return

    try {
      setDeletingId(issueId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('issues')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', issueId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting issue:', error)
      alert('Error deleting issue: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        status: newStatus,
        updated_by: user.id,
      }

      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by_user_id = user.id
      } else if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString()
        updateData.closed_by_user_id = user.id
      } else if (newStatus === 'assigned' || newStatus === 'in_progress') {
        updateData.assigned_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('issues')
        .update(updateData)
        .eq('id', issueId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error updating issue status:', error)
      alert('Error updating issue status: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'reopened':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4" />
      case 'enhancement':
        return <Zap className="h-4 w-4" />
      case 'blocker':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (issues.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <AlertCircle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Issues yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first issue to start tracking project problems and improvements
        </p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable={false} className="!normal-case">Title</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Type</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Priority</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Assigned</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Created</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700 z-[1] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {issues.map((issue, index) => (
                <tr
                  key={issue.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{issue.issue_title}</div>
                    {issue.issue_description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{issue.issue_description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-sm capitalize">{getTypeIcon(issue.issue_type)} {issue.issue_type || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>{issue.status?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {issue.assigned_to ? (issue.assigned_to.full_name || issue.assigned_to.email) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {issue.created_at ? format(new Date(issue.created_at), 'MMM dd, yyyy') : '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex gap-1 justify-end">
                      <button
                        type="button"
                        aria-label="Edit issue"
                        onClick={() => onEdit(issue)}
                        className="p-2 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete issue"
                        disabled={deletingId === issue.id}
                        onClick={() => handleDelete(issue.id)}
                        className="p-2 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => (
        <div
          key={issue.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                {getTypeIcon(issue.issue_type)}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {issue.issue_title}
                </h3>
                {issue.issue_code && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                    {issue.issue_code}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                  {issue.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                  {issue.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {issue.issue_description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {issue.reported_by && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Reported by: {issue.reported_by.full_name || issue.reported_by.email}</span>
                  </div>
                )}
                {issue.assigned_to && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Assigned to: {issue.assigned_to.full_name || issue.assigned_to.email}</span>
                  </div>
                )}
                {issue.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(issue.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {issue.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Due: {format(new Date(issue.due_date), 'MMM dd')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {issue.status !== 'resolved' && issue.status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange(issue.id, 'resolved')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  Resolve
                </button>
              )}
              <button
                onClick={() => onEdit(issue)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(issue.id)}
                disabled={deletingId === issue.id}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

