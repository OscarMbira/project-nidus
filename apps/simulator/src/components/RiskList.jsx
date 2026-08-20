import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, User, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { platformRiskPath } from '@nidus/shared/utils/projectRouteParam'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import RowNumberBadge from './ui/RowNumberBadge'
import { RowActionButton } from '@nidus/ui'

export default function RiskList({ risks, onEdit, onRefresh, projectId, routeProjectKey, viewMode = 'list', page = 1, pageSize = 20 }) {
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState(null)

  const riskPath = (risk) =>
    platformRiskPath(
      String(routeProjectKey || projectId || '').trim(),
      (risk.risk_identifier && String(risk.risk_identifier).trim()) ||
        (risk.risk_code && String(risk.risk_code).trim()) ||
        risk.id,
    )

  const handleDelete = async (riskId) => {
    if (!confirm('Are you sure you want to delete this risk?')) return

    try {
      setDeletingId(riskId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('risks')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', riskId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting risk:', error)
      alert('Error deleting risk: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (riskId, newStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        status: newStatus,
        updated_by: user.id,
      }

      if (newStatus === 'closed' || newStatus === 'realized') {
        updateData.closed_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('risks')
        .update(updateData)
        .eq('id', riskId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error updating risk status:', error)
      alert('Error updating risk status: ' + error.message)
    }
  }

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
      case 'realized':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'mitigated':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'monitored':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'assessed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (risks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Risks yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first risk to start managing project risks
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
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Reference</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case min-w-[16rem]">Title</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Level</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Score</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Owner</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Identified</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {risks.map((risk, index) => {
                const ownerName = risk.risk_owner?.full_name || risk.risk_owner?.email || '—'
                return (
                  <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize })} />
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                      {risk.risk_identifier || risk.risk_code || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {risk.risk_type === 'opportunity' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{risk.risk_title}</div>
                          {risk.risk_description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xl">
                              {risk.risk_description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(risk.risk_level)}`}>
                        {(risk.risk_level || '—').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {risk.risk_score ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}>
                        {(risk.status || '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[12rem]">
                      <span className="block truncate whitespace-nowrap" title={ownerName !== '—' ? ownerName : undefined}>
                        {ownerName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {risk.identified_date ? format(new Date(risk.identified_date), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-3 justify-end">
                        <RowActionButton
                          variant="view"
                          label="View risk"
                          onClick={() => navigate(riskPath(risk))}
                        />
                        {onEdit && (
                          <RowActionButton
                            variant="edit"
                            label="Edit risk"
                            onClick={() => onEdit(risk)}
                          />
                        )}
                        <RowActionButton
                          variant="delete"
                          label="Delete risk"
                          onClick={() => handleDelete(risk.id)}
                          disabled={deletingId === risk.id}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {risks.map((risk, index) => (
        <div
          key={risk.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize })} />
                {risk.risk_type === 'opportunity' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {risk.risk_title}
                </h3>
                {risk.risk_code && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                    {risk.risk_code}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(risk.risk_level)}`}>
                  {risk.risk_level.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}>
                  {risk.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {risk.risk_description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <div className="flex items-center gap-1">
                  <span>P: {risk.probability}</span>
                  <span>×</span>
                  <span>I: {risk.impact}</span>
                  <span>=</span>
                  <span className="font-semibold">Score: {risk.risk_score}</span>
                </div>
                {risk.risk_owner && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Owner: {risk.risk_owner.full_name || risk.risk_owner.email}</span>
                  </div>
                )}
                {risk.identified_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(risk.identified_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {risk.next_review_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Review: {format(new Date(risk.next_review_date), 'MMM dd')}</span>
                  </div>
                )}
                {risk.response_strategy && (
                  <span className="capitalize">Strategy: {risk.response_strategy}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <RowActionButton
                variant="view"
                label="View risk"
                onClick={() => navigate(riskPath(risk))}
              />
              {risk.status !== 'closed' && risk.status !== 'realized' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(risk.id, 'closed')}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  Close
                </button>
              )}
              <RowActionButton
                variant="edit"
                label="Edit risk"
                onClick={() => onEdit(risk)}
              />
              <RowActionButton
                variant="delete"
                label="Delete risk"
                onClick={() => handleDelete(risk.id)}
                disabled={deletingId === risk.id}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
