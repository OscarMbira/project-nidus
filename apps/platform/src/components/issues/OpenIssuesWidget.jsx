/**
 * Open Issues Widget — filterable table of open issues (priority + aging).
 */

import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, Clock, Search } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { formatIssueAge, getIssueAgeDays } from '../IssueList'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const OPEN_STATUSES = [
  'open', 'pending', 'in_progress', 'escalated',
  'draft', 'raised', 'under_assessment', 'awaiting_decision',
  'approved', 'reopened',
]

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }

function matchesAgeFilter(days, ageFilter) {
  if (!ageFilter) return true
  if (days === null || days === undefined) return ageFilter === 'unknown'
  if (ageFilter === '0-6') return days < 7
  if (ageFilter === '7-13') return days >= 7 && days < 14
  if (ageFilter === '14-29') return days >= 14 && days < 30
  if (ageFilter === '30+') return days >= 30
  return true
}

export default function OpenIssuesWidget({ projectId, onViewRegister }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')

  useEffect(() => {
    if (projectId) {
      fetchOpenIssues()
    }
  }, [projectId])

  const fetchOpenIssues = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('issues')
        .select('id, issue_identifier, issue_title, priority, status, date_raised, created_at, issue_type')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .in('status', OPEN_STATUSES)
        .order('date_raised', { ascending: false })

      if (error) throw error

      const rows = (data || []).map((issue) => ({
        ...issue,
        age_days: getIssueAgeDays(issue),
        priority_rank: PRIORITY_RANK[issue.priority] ?? 99,
      }))
      setIssues(rows)
    } catch (error) {
      console.warn('Open issues widget unavailable:', error?.message || error)
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase()
    return issues.filter((issue) => {
      if (priorityFilter && (issue.priority || '') !== priorityFilter) return false
      if (!matchesAgeFilter(issue.age_days, ageFilter)) return false
      if (q) {
        const hay = `${issue.issue_title || ''} ${issue.issue_identifier || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [issues, search, priorityFilter, ageFilter])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: 'open-issues-widget-sort',
    defaultSort: { column: 'age_days', direction: 'desc' },
  })

  const accessors = useMemo(
    () => ({
      issue_title: (r) => r.issue_title ?? '',
      priority_rank: (r) => r.priority_rank ?? 99,
      age_days: (r) => (r.age_days == null ? -1 : r.age_days),
      date_raised: (r) => r.date_raised || r.created_at || '',
    }),
    []
  )

  const displayRows = useMemo(
    () => sortedData(filteredIssues, accessors),
    [filteredIssues, sortedData, accessors]
  )

  const stats = useMemo(() => ({
    total: issues.length,
    critical: issues.filter((i) => i.priority === 'critical').length,
    high: issues.filter((i) => i.priority === 'high').length,
    medium: issues.filter((i) => i.priority === 'medium').length,
    low: issues.filter((i) => i.priority === 'low').length,
  }), [issues])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getAgingColor = (days) => {
    if (days === null || days === undefined) return 'text-gray-500 dark:text-gray-400'
    if (days >= 30) return 'text-red-600 dark:text-red-400 font-medium'
    if (days >= 14) return 'text-orange-600 dark:text-orange-400 font-medium'
    if (days >= 7) return 'text-amber-600 dark:text-amber-400'
    return 'text-gray-600 dark:text-gray-300'
  }

  const inputClass =
    'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Open Issues
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {displayRows.length} of {stats.total}
        </span>
      </div>

      {stats.total > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {stats.critical > 0 && (
            <button
              type="button"
              onClick={() => setPriorityFilter(priorityFilter === 'critical' ? '' : 'critical')}
              className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor('critical')} ${
                priorityFilter === 'critical' ? 'ring-2 ring-red-400' : ''
              }`}
            >
              {stats.critical} Critical
            </button>
          )}
          {stats.high > 0 && (
            <button
              type="button"
              onClick={() => setPriorityFilter(priorityFilter === 'high' ? '' : 'high')}
              className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor('high')} ${
                priorityFilter === 'high' ? 'ring-2 ring-orange-400' : ''
              }`}
            >
              {stats.high} High
            </button>
          )}
          {stats.medium > 0 && (
            <button
              type="button"
              onClick={() => setPriorityFilter(priorityFilter === 'medium' ? '' : 'medium')}
              className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor('medium')} ${
                priorityFilter === 'medium' ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {stats.medium} Medium
            </button>
          )}
          {stats.low > 0 && (
            <button
              type="button"
              onClick={() => setPriorityFilter(priorityFilter === 'low' ? '' : 'low')}
              className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor('low')} ${
                priorityFilter === 'low' ? 'ring-2 ring-green-400' : ''
              }`}
            >
              {stats.low} Low
            </button>
          )}
        </div>
      )}

      {stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="search"
              placeholder="Search open issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={inputClass}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className={inputClass}
            aria-label="Filter by age"
          >
            <option value="">All ages</option>
            <option value="0-6">Under 7 days</option>
            <option value="7-13">7–13 days</option>
            <option value="14-29">14–29 days</option>
            <option value="30+">30+ days</option>
          </select>
          {(search || priorityFilter || ageFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPriorityFilter('')
                setAgeFilter('')
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {stats.total === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No open issues</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All issues are resolved</p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No issues match the current filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/80">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('issue_title')}
                  onSort={() => handleSort('issue_title')}
                  className="!normal-case"
                >
                  Title
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('priority_rank')}
                  onSort={() => handleSort('priority_rank')}
                  className="!normal-case"
                >
                  Priority
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('age_days')}
                  onSort={() => handleSort('age_days')}
                  className="!normal-case whitespace-nowrap"
                >
                  Aging
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('date_raised')}
                  onSort={() => handleSort('date_raised')}
                  className="!normal-case whitespace-nowrap"
                >
                  Raised
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayRows.map((issue, index) => (
                <tr
                  key={issue.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-3 min-w-[12rem]">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {issue.issue_title || '—'}
                    </div>
                    {issue.issue_identifier && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {issue.issue_identifier}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(issue.priority)}`}>
                      {issue.priority || 'unset'}
                    </span>
                  </td>
                  <td className={`px-6 py-3 whitespace-nowrap text-sm ${getAgingColor(issue.age_days)}`}>
                    <span className="inline-flex items-center gap-1" title="Days since raised">
                      <Clock className="h-3.5 w-3.5" />
                      {formatIssueAge(issue)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {(issue.date_raised || issue.created_at)
                      ? new Date(issue.date_raised || issue.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {typeof onViewRegister === 'function' && stats.total > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onViewRegister}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open full Issue Register
          </button>
        </div>
      )}
    </div>
  )
}
