import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table'
import { useCommsApi } from './useCommsApi'

const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'meeting_type', label: 'Type' },
  { key: 'scheduled_start', label: 'Scheduled' },
  { key: 'project_id', label: 'Project' },
]

export default function MeetingList() {
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting } = useCommsApi()
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('comms-meeting-list', 'list')

  const accessors = useMemo(
    () => ({
      title: (r) => r.title,
      status: (r) => r.status,
      scheduled_start: (r) => r.scheduled_start,
    }),
    []
  )

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'scheduled_start', direction: 'desc' },
    storageKey: 'comms-meeting-sort',
  })

  useEffect(() => {
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      setAccountId(aid)
      if (!aid) {
        setLoading(false)
        return
      }
      const { data, error } = await meeting.listMeetingsForAccount(aid)
      if (!error) setRows(data || [])
      setLoading(false)
    })()
  }, [meeting])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    let r = rows
    if (t) {
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(t))
    }
    return sortedData(r, accessors)
  }, [rows, search, sortedData, accessors])

  const exportRows = useMemo(
    () =>
      filtered.map((m) => ({
        ...m,
        scheduled_start: m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : '',
      })),
    [filtered]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meetings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming and past sessions.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Meetings" disabled={!exportRows.length} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Link
            to={`${basePath}/meetings/new`}
            className="inline-flex px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm min-h-[44px] items-center"
          >
            Schedule
          </Link>
        </div>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="mb-4 w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
      />
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')}>
                  Title
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('scheduled_start')}
                  onSort={() => handleSort('scheduled_start')}
                >
                  Scheduled
                </TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.title}</TableCell>
                  <TableCell>{m.status}</TableCell>
                  <TableCell>{m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <Link to={`${basePath}/meetings/${m.id}`} className="text-cyan-600 dark:text-cyan-400 text-sm">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.id}
              to={`${basePath}/meetings/${m.id}`}
              className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 hover:border-cyan-500"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">{m.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{m.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
