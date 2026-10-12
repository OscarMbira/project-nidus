/**
 * Meeting Calendar — governance meetings for this project (taxonomy §3, Project Setup >
 * Governance > Meeting Calendar). Reuses the existing Comms Hub meetings feature
 * (comm_meetings / meetingService.js) rather than duplicating a scheduling system.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Calendar, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { RowActionButton } from '@nidus/ui'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { deleteMeeting, listMeetingsForAccount } from '../../services/communications/meetingService'

const STATUS_COLORS = {
  scheduled:   'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  in_progress: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  ended:       'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  cancelled:   'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

function formatStart(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return date.toLocaleString()
}

function statusLabel(status) {
  return String(status || 'scheduled').replace('_', ' ')
}

const EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'start_label', label: 'Start' },
  { key: 'status_label', label: 'Status' },
]

export default function GovernanceMeetingCalendarPage() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [viewMode, setViewMode] = useViewMode('governance-meeting-calendar', 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'title', direction: 'asc' },
    storageKey: 'governance-meeting-calendar-sort',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data: projectRow } = await platformDb
        .from('projects')
        .select('account_id')
        .eq('id', projectId)
        .maybeSingle()
      const accountId = projectRow?.account_id || await getCurrentUserAccountId()
      if (!accountId) {
        setMeetings([])
        return
      }
      const { data, error } = await listMeetingsForAccount(accountId, { projectId })
      if (error) throw error
      setMeetings(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const openMeeting = (meeting, mode) => {
    const path = mode === 'edit'
      ? `/platform/comms/meetings/${meeting.id}/edit`
      : `/platform/comms/meetings/${meeting.id}`
    navigate(path)
  }

  const removeMeeting = async (meeting) => {
    const label = meeting.meeting_code || meeting.title || 'this meeting'
    if (!window.confirm(`Delete ${label}?`)) return
    const { error } = await deleteMeeting(meeting.id)
    if (error) {
      toast.error(error.message || 'Failed to delete meeting')
      return
    }
    setMeetings((rows) => rows.filter((row) => row.id !== meeting.id))
    showSuccess({
      recordId: meeting.meeting_code || meeting.title,
      operation: 'deleted',
      message: 'The meeting was deleted.',
    })
  }

  const rowActions = (meeting) => (
    <div className="flex items-center justify-end gap-1">
      <RowActionButton variant="view" label="View" onClick={() => openMeeting(meeting, 'view')} />
      <RowActionButton variant="edit" label="Edit" onClick={() => openMeeting(meeting, 'edit')} />
      <RowActionButton variant="delete" label="Delete" onClick={() => removeMeeting(meeting)} />
    </div>
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dated = [...meetings].sort((a, b) => String(a.created_at || a.scheduled_start || '').localeCompare(String(b.created_at || b.scheduled_start || '')))
    if (!q) return dated
    return dated.filter((m) =>
      [m.title, statusLabel(m.status)].some((value) => String(value || '').toLowerCase().includes(q))
    )
  }, [meetings, search])

  const sortAccessors = useMemo(() => ({
    title: (m) => m.title || '',
    scheduled_start: (m) => m.scheduled_start || '',
    status: (m) => statusLabel(m.status),
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const exportRows = sorted.map((m) => ({
    ...m,
    start_label: formatStart(m.scheduled_start),
    status_label: statusLabel(m.status),
  }))

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Meeting Calendar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled meetings for this project</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu columns={EXPORT_COLUMNS} data={exportRows} baseFilename="MeetingCalendar" />
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <Link to={`/platform/comms/meetings/new?projectId=${projectId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="h-4 w-4" /> Schedule meeting
            </Link>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search meetings..."
          className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{search.trim() ? 'No meetings match this search.' : 'No meetings scheduled for this project yet.'}</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')} className="!normal-case whitespace-nowrap">Title</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('scheduled_start')} onSort={() => handleSort('scheduled_start')} className="!normal-case whitespace-nowrap">Start</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                  <TableHeaderCell className="!normal-case whitespace-nowrap text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m, index) => (
                  <TableRow key={m.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <TableCell>
                      <button type="button" onClick={() => openMeeting(m, 'view')} className="font-medium text-gray-900 dark:text-white hover:underline text-left">
                        {m.title}
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-200 whitespace-nowrap">{formatStart(m.scheduled_start)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[m.status] || STATUS_COLORS.scheduled}`}>
                        {statusLabel(m.status)}
                      </span>
                    </TableCell>
                    <TableCell>{rowActions(m)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((m, index) => (
              <div key={m.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium flex items-center gap-1.5">
                      <RowNumberBadge number={getDisplayRowNumber(index)} />
                      <Video className="h-4 w-4 text-gray-400" />
                      <button type="button" onClick={() => openMeeting(m, 'view')} className="hover:underline text-left">
                        {m.title}
                      </button>
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-200 mt-0.5">
                      {formatStart(m.scheduled_start)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[m.status] || STATUS_COLORS.scheduled}`}>
                      {statusLabel(m.status)}
                    </span>
                    {rowActions(m)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {successModal}
      </div>
    </div>
  )
}
