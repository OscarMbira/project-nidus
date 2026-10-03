/**
 * Team allocation / field change history
 * Route: /platform/teams/:id/allocation-history
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, History, Search } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getTeamDetail, getTeamChangeHistory } from '../../services/teamService'

const FIELD_LABELS = {
  team_name: 'Team name',
  team_type: 'Team type',
  max_team_size: 'Max team size',
  is_active: 'Active',
  team_lead_user_id: 'Team lead',
  user_id: 'Member',
  member_role: 'Member role',
  allocation_percentage: 'Allocation %',
  allocation_start_date: 'Start date',
  allocation_end_date: 'End date',
  required_skills: 'Required skills',
  member_comments: 'Comments',
  is_deleted: 'Deleted',
  team_size: 'Team size',
  team_status: 'Team status',
}

function teamPathKey(team) {
  return (team?.team_code && String(team.team_code).trim()) || team?.id
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function formatVal(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function userLabel(u, fallback) {
  if (!u) return fallback || '—'
  if (u.full_name && u.email) return `${u.full_name} (${u.email})`
  return u.full_name || u.email || fallback || '—'
}

function changesSummary(changes) {
  const list = Array.isArray(changes) ? changes : []
  if (!list.length) return '—'
  return list
    .map((c) => {
      const label = FIELD_LABELS[c.field] || c.field
      return `${label}: ${formatVal(c.old_value)} → ${formatVal(c.new_value)}`
    })
    .join('; ')
}

const EXPORT_COLUMNS = [
  { key: '#', label: '#' },
  { key: 'when', label: 'When' },
  { key: 'changed_by', label: 'Changed by' },
  { key: 'member', label: 'Member' },
  { key: 'entity', label: 'Entity' },
  { key: 'event', label: 'Event' },
  { key: 'changes', label: 'Changes' },
  { key: 'reason', label: 'Reason' },
]

export default function TeamAllocationHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState(null)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [sort, setSort] = useState({ key: null, dir: null })
  const [viewMode, setViewMode] = useViewMode('team-allocation-history', 'list')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const detailRes = await getTeamDetail(id)
        if (cancelled) return
        if (!detailRes.success || !detailRes.data) {
          toast.error(detailRes.error || 'Team not found')
          navigate('/platform/teams', { replace: true })
          return
        }
        setTeam(detailRes.data)
        const hist = await getTeamChangeHistory(detailRes.data.id)
        if (cancelled) return
        if (!hist.success) {
          toast.error(hist.error || 'Failed to load history')
          setRows([])
        } else {
          setRows(hist.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load history')
          navigate('/platform/teams', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const memberOptions = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      if (r.user_id) {
        map.set(r.user_id, userLabel(r.member_user, r.user_id))
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  }, [rows])

  const filtered = useMemo(() => {
    let list = [...rows]
    if (memberFilter) {
      list = list.filter((r) => r.user_id === memberFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const blob = [
          r.event_type,
          r.entity_type,
          r.change_reason,
          userLabel(r.changed_by_user, r.changed_by),
          userLabel(r.member_user, r.user_id),
          changesSummary(r.changes),
        ]
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
    }

    const { key, dir } = sort
    if (key && dir) {
      const mul = dir === 'asc' ? 1 : -1
      list.sort((a, b) => {
        const av =
          key === 'when'
            ? a.changed_at || ''
            : key === 'changed_by'
              ? userLabel(a.changed_by_user, a.changed_by)
              : key === 'member'
                ? userLabel(a.member_user, a.user_id)
                : key === 'entity'
                  ? a.entity_type || ''
                  : key === 'event'
                    ? a.event_type || ''
                    : key === 'reason'
                      ? a.change_reason || ''
                      : changesSummary(a.changes)
        const bv =
          key === 'when'
            ? b.changed_at || ''
            : key === 'changed_by'
              ? userLabel(b.changed_by_user, b.changed_by)
              : key === 'member'
                ? userLabel(b.member_user, b.user_id)
                : key === 'entity'
                  ? b.entity_type || ''
                  : key === 'event'
                    ? b.event_type || ''
                    : key === 'reason'
                      ? b.change_reason || ''
                      : changesSummary(b.changes)
        return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * mul
      })
    } else {
      list.sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || '')))
    }
    return list
  }, [rows, search, memberFilter, sort])

  const exportRows = useMemo(
    () =>
      filtered.map((r, index) => ({
        '#': getDisplayRowNumber(index),
        when: formatWhen(r.changed_at),
        changed_by: userLabel(r.changed_by_user, r.changed_by),
        member: r.entity_type === 'team_member' ? userLabel(r.member_user, r.user_id) : '—',
        entity: r.entity_type,
        event: r.event_type,
        changes: changesSummary(r.changes),
        reason: r.change_reason || '',
      })),
    [filtered],
  )

  const cycleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  const sortIndicator = (key) => {
    if (sort.key !== key) return '⇅'
    return sort.dir === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
      </div>
    )
  }

  if (!team) return null

  const routeKey = teamPathKey(team)
  const backToEdit = `/platform/teams/${encodeURIComponent(routeKey)}/edit`
  const backToView = `/platform/teams/${encodeURIComponent(routeKey)}`

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={backToEdit}
            className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to team
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="h-7 w-7 text-sky-500" />
            Team change history
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {team.team_code || team.id} · {team.team_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={backToView}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px] inline-flex items-center"
          >
            View team
          </Link>
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={exportRows}
            baseFilename={`Team-History-${team.team_code || team.id}`}
            disabled={!exportRows.length}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
          />
        </div>
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 min-h-[44px]"
        >
          <option value="">All members</option>
          {memberOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="History list layout"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-sm text-gray-600 dark:text-gray-300">
          No change history yet. Edits to this team and its members will appear here after they are
          saved.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, index) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <span className="text-xs text-gray-700 dark:text-gray-200">{formatWhen(r.changed_at)}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                {r.entity_type?.replace('_', ' ')} · {r.event_type}
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                By {userLabel(r.changed_by_user, r.changed_by)}
              </p>
              {r.entity_type === 'team_member' && (
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                  Member: {userLabel(r.member_user, r.user_id)}
                </p>
              )}
              <p className="text-xs text-gray-700 dark:text-gray-200 mt-2 whitespace-pre-wrap">
                {changesSummary(r.changes)}
              </p>
              {r.change_reason && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">
                  Reason: {r.change_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                {[
                  ['when', 'When'],
                  ['changed_by', 'Changed by'],
                  ['member', 'Member'],
                  ['entity', 'Entity'],
                  ['event', 'Event'],
                  ['changes', 'Changes'],
                  ['reason', 'Reason'],
                ].map(([key, label]) => (
                  <th key={key} className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => cycleSort(key)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-200"
                    >
                      {label} <span aria-hidden>{sortIndicator(key)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {formatWhen(r.changed_at)}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                    {userLabel(r.changed_by_user, r.changed_by)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {r.entity_type === 'team_member'
                      ? userLabel(r.member_user, r.user_id)
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200 capitalize">
                    {r.entity_type?.replace('_', ' ')}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.event_type}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200 max-w-md">
                    {changesSummary(r.changes)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {r.change_reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
