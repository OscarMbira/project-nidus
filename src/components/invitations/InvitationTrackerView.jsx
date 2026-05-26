import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MailCheck,
  Search,
  RefreshCw,
  RotateCcw,
  X,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ViewToggle from '../ui/ViewToggle'
import ExportListMenu from '../ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { resolveInviteeNamesForInvitation } from '../../utils/invitationInviteeFormat'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import RowNumberBadge from '../ui/RowNumberBadge'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'project', label: 'Project' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'programme', label: 'Programme' },
]

const EXPORT_COLS = [
  { key: 'entity_type', label: 'Entity Type' },
  { key: 'entity_name', label: 'Entity Name' },
  { key: 'invitee_label', label: 'Invitee' },
  { key: 'role_display_name', label: 'Role' },
  { key: 'invitation_status', label: 'Status' },
  { key: 'invitation_sent_at', label: 'Sent' },
  { key: 'invitation_expires_at', label: 'Expires' },
]

function formatEntityType(type) {
  if (!type) return '—'
  return String(type).charAt(0).toUpperCase() + String(type).slice(1)
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  const styles = {
    pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    accepted: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
    declined: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
    expired: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[s] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {s || 'unknown'}
    </span>
  )
}

function sortIndicator(direction) {
  if (direction === 'asc') return '↑'
  if (direction === 'desc') return '↓'
  return '⇅'
}

/**
 * @param {Object} props
 * @param {'pmo'|'pm'} props.scope
 * @param {string} props.pageId — localStorage key prefix
 * @param {string} [props.title]
 * @param {Object} props.service — { getSentInvitations, cancelInvitation, resendInvitationReminder }
 */
export default function InvitationTrackerView({
  scope,
  pageId,
  title = 'Invitation Tracker',
  service,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState(null)
  const [viewMode, setViewMode] = useViewMode(pageId, 'list')
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(STATUS_TABS.filter((t) => t.key).map((t) => [t.key, true])),
  )

  const showEntityFilter = scope === 'pmo'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await service.getSentInvitations({
      scope,
      status: statusTab || null,
      entityType: showEntityFilter && entityFilter ? entityFilter : null,
    })
    if (!res.success) {
      toast.error(res.error || 'Failed to load invitations')
      setRows([])
    } else {
      setRows(res.data || [])
    }
    setLoading(false)
  }, [service, scope, statusTab, entityFilter, showEntityFilter])

  useEffect(() => {
    load()
  }, [load])

  const accessors = useMemo(
    () => ({
      entity_type: (r) => formatEntityType(r.entity_type),
      entity_name: (r) => r.entity_name ?? '',
      invitee_label: (r) => {
        const { full } = resolveInviteeNamesForInvitation(r)
        return full || r.invited_email || ''
      },
      role_display_name: (r) => r.role_display_name || r.role_name || '',
      invitation_status: (r) => r.invitation_status ?? '',
      invitation_sent_at: (r) => r.invitation_sent_at ?? r.sent_at ?? '',
      invitation_expires_at: (r) => r.invitation_expires_at ?? '',
    }),
    [],
  )

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: `nidus-${pageId}-sort`,
  })

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const { full } = resolveInviteeNamesForInvitation(r)
      const hay = [
        r.entity_name,
        r.invited_email,
        full,
        r.role_display_name,
        r.role_name,
        r.entity_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  const displayRows = useMemo(
    () => sortedData(searched, accessors),
    [searched, sortedData, accessors],
  )

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => {
        const { full } = resolveInviteeNamesForInvitation(r)
        return {
          ...r,
          entity_type: formatEntityType(r.entity_type),
          invitee_label: full || r.invited_email,
          invitation_sent_at: formatDateTime(r.invitation_sent_at || r.sent_at),
          invitation_expires_at: formatDateTime(r.invitation_expires_at),
        }
      }),
    [displayRows],
  )

  const stats = useMemo(() => {
    const base = rows
    return {
      total: base.length,
      pending: base.filter((r) => r.invitation_status === 'pending').length,
      accepted: base.filter((r) => r.invitation_status === 'accepted').length,
      declined: base.filter((r) => r.invitation_status === 'declined').length,
      expired: base.filter((r) => r.invitation_status === 'expired').length,
    }
  }, [rows])

  const handleResend = async (row) => {
    setActionId(row.id)
    const res = await service.resendInvitationReminder(row.id)
    setActionId(null)
    if (!res.success) {
      toast.error(res.error || 'Resend failed')
      return
    }
    toast.success(`Reminder queued for ${row.invited_email}`)
    load()
  }

  const handleCancel = async (row) => {
    if (!window.confirm(`Cancel invitation to ${row.invited_email}?`)) return
    setActionId(row.id)
    const res = await service.cancelInvitation(row.id)
    setActionId(null)
    if (!res.success) {
      toast.error(res.error || 'Cancel failed')
      return
    }
    toast.success('Invitation cancelled')
    load()
  }

  const openDetails = (row) => {
    const { full } = resolveInviteeNamesForInvitation(row)
    const invitation = {
      ...row,
      project_name: row.entity_name || '—',
      role_display_name: row.role_display_name || row.role_name,
      expires_at: row.invitation_expires_at,
      invitee_display: full || row.invited_email,
    }
    navigate(`${location.pathname}/view`, { state: { invitation } })
  }

  const groupedByStatus = useMemo(() => {
    const map = {}
    for (const tab of STATUS_TABS) {
      if (!tab.key) continue
      map[tab.key] = displayRows.filter((r) => r.invitation_status === tab.key)
    }
    return map
  }, [displayRows])

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderActions = (row) => {
    const busy = actionId === row.id
    const pending = row.invitation_status === 'pending'
    return (
      <div className="flex items-center justify-end gap-1">
        {pending && (
          <>
            <button
              type="button"
              title="Resend reminder"
              disabled={busy}
              onClick={() => handleResend(row)}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Cancel invitation"
              disabled={busy}
              onClick={() => handleCancel(row)}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          type="button"
          title="View details"
          onClick={() => openDetails(row)}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const thClass =
    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap'

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MailCheck className="h-7 w-7 text-blue-600 shrink-0" aria-hidden />
            {title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {scope === 'pmo'
              ? 'Track invitations sent across portfolio, programme, and project entities.'
              : 'Track project invitations you have sent.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Invitation tracker layout" />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          { label: 'Sent', value: stats.total },
          { label: 'Pending', value: stats.pending },
          { label: 'Accepted', value: stats.accepted },
          { label: 'Declined', value: stats.declined },
          { label: 'Expired', value: stats.expired },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-center"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab, index) => (
          <button
            key={tab.key || 'all'}
            type="button"
            onClick={() => setStatusTab(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium min-h-[44px] sm:min-h-0 transition-colors ${
              statusTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-3">
        {showEntityFilter && (
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-h-[44px]"
            aria-label="Filter by entity type"
          >
            {ENTITY_OPTIONS.map((o, index) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invitee or entity…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm min-h-[44px]"
          />
        </div>
        <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename={`invitation-tracker-${scope}`} />
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading invitations…</p>}

      {!loading && displayRows.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          No invitations match your filters.
        </p>
      )}

      {!loading && viewMode === 'grid' && displayRows.length > 0 && (
        <div className="space-y-4">
          {STATUS_TABS.filter((t) => t.key).map((tab) => {
            const group = groupedByStatus[tab.key] || []
            if (!group.length && statusTab && statusTab !== tab.key) return null
            if (!group.length) return null
            const open = expandedGroups[tab.key] !== false
            return (
              <section
                key={tab.key}
                className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(tab.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 text-left min-h-[44px]"
                >
                  <span className="font-medium text-slate-900 dark:text-white capitalize">
                    {tab.label} ({group.length})
                  </span>
                  {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
                {open && (
                  <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((row, index) => {
                      const { full } = resolveInviteeNamesForInvitation(row)
                      const rowNumber = getDisplayRowNumber(displayRows.findIndex((r) => r.id === row.id))
                      return (
                        <article
                          key={row.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
                        >
                          <div className="flex justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <RowNumberBadge number={rowNumber >= 0 ? rowNumber : getDisplayRowNumber(index)} className="shrink-0" />
                              <StatusBadge status={row.invitation_status} />
                            </div>
                            <span className="text-xs text-slate-500">{formatEntityType(row.entity_type)}</span>
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {row.entity_name || '—'}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                            {full || row.invited_email}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{row.role_display_name || row.role_name}</p>
                          <p className="text-xs text-slate-500 mt-2">Sent {formatDateTime(row.invitation_sent_at)}</p>
                          <div className="mt-3 flex justify-end">{renderActions(row)}</div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {!loading && viewMode === 'list' && displayRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {[
                  ['entity_type', 'Entity'],
                  ['entity_name', 'Name'],
                  ['invitee_label', 'Invitee'],
                  ['role_display_name', 'Role'],
                  ['invitation_status', 'Status'],
                  ['invitation_sent_at', 'Sent'],
                  ['invitation_expires_at', 'Expires'],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className={thClass}
                    onClick={() => handleSort(key)}
                    scope="col"
                  >
                    {label} {sortIndicator(getSortDirectionForColumn(key))}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => {
                const { full } = resolveInviteeNamesForInvitation(row)
                return (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-2 capitalize">{formatEntityType(row.entity_type)}</td>
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{row.entity_name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className="block truncate max-w-[200px]">{full || row.invited_email}</span>
                    </td>
                    <td className="px-4 py-2">{row.role_display_name || row.role_name || '—'}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={row.invitation_status} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.invitation_sent_at)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.invitation_expires_at)}</td>
                    <td className="px-4 py-2">{renderActions(row)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
