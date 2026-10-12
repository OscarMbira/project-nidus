/**
 * Single source of truth for Issue Register list + export columns (v869).
 * Change here once — IssueList headers and export menus stay aligned.
 */

export const ISSUE_LIST_COLUMNS = [
  { key: 'issue_title', label: 'Title' },
  { key: 'issue_type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'aging', label: 'Aging' },
  { key: 'due_date', label: 'Due date' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Last Update' },
  { key: 'updated_by', label: 'Updated by' },
]

/** Export base = list columns (custom-field cols appended by the page). */
export const ISSUE_EXPORT_COLUMNS = [...ISSUE_LIST_COLUMNS]

/** Display name for the last updater on an issue row. */
export function formatIssueUpdatedBy(issue) {
  if (!issue) return '—'
  const fromJoin = issue.updated_by_user?.full_name || issue.updated_by_user?.email
  if (fromJoin) return fromJoin
  if (issue.updated_by_label) return issue.updated_by_label
  return '—'
}

/**
 * Map a raw issue row into export-friendly flat fields.
 * @param {object} issue
 * @param {(issue: object) => string} [formatAge]
 */
export function mapIssueForListExport(issue, formatAge) {
  return {
    ...issue,
    assigned: issue.assigned_to?.full_name || issue.assigned_to?.email || '',
    aging: typeof formatAge === 'function' ? formatAge(issue) : issue.aging ?? '',
    updated_by: formatIssueUpdatedBy(issue) === '—' ? '' : formatIssueUpdatedBy(issue),
  }
}
