import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Bell, Ban, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import ViewToggle from '../ui/ViewToggle'
import ExportListMenu from '../ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import AppointmentTermsCard from '../invitations/AppointmentTermsCard'

const TABS = [
  { key: 'pending_acceptance', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'declined', label: 'Declined' },
  { key: 'ended', label: 'Ended' },
]

function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

/**
 * Shared appointment dashboard (manager or team).
 */
export default function AppointmentLedgerView({
  title,
  description,
  pageId,
  loadByStatus,
  onRemind,
  onWithdraw,
  acceptPathBuilder,
  exportBaseName,
  rowLabel,
}) {
  const [tab, setTab] = useState('pending_acceptance')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useViewMode(pageId, 'list')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id))

  const sortedData = useMemo(() => {
    const list = [...rows]
    const mult = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortCol === 'appointee') {
        const la = (a.appointee?.full_name || a.appointee?.email || '').toLowerCase()
        const lb = (b.appointee?.full_name || b.appointee?.email || '').toLowerCase()
        return mult * la.localeCompare(lb)
      }
      if (sortCol === 'start') {
        return mult * String(a.assignment_start_date || '').localeCompare(String(b.assignment_start_date || ''))
      }
      return mult * String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
    return list
  }, [rows, sortCol, sortDir])

  const cycleSort = (col) => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') setSortDir('desc')
    else {
      setSortCol('created_at')
      setSortDir('desc')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await loadByStatus(tab)
      if (!res.success) throw new Error(res.error)
      setRows(res.data || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load appointments')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tab, loadByStatus])

  useEffect(() => {
    load()
  }, [load])

  const exportColumns = useMemo(
    () => [
      { key: 'appointee_label', label: rowLabel || 'Appointee' },
      { key: 'role_label', label: 'Role' },
      { key: 'terms_summary', label: 'Terms' },
      { key: 'appointment_status', label: 'Status' },
      { key: 'assignment_start_date', label: 'Start' },
    ],
    [rowLabel]
  )

  const exportData = useMemo(
    () =>
      sortedData.map((r) => ({
        ...r,
        appointee_label: r.appointee?.full_name || r.appointee?.email || '—',
        role_label: r.manager_role_name || r.member_role_name || r.role_title || '—',
        terms_summary: [
          r.time_commitment_pct != null ? `${r.time_commitment_pct}%` : null,
          r.assignment_start_date ? fmtDate(r.assignment_start_date) : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [sortedData]
  )

  const handleRemind = async (id) => {
    const res = await onRemind(id)
    if (res?.success) toast.success('Reminder sent')
    else toast.error(res?.error || 'Reminder failed')
  }

  const handleWithdraw = async (id) => {
    if (!confirm('Withdraw this appointment invitation?')) return
    const res = await onWithdraw(id)
    if (res?.success) {
      toast.success('Appointment withdrawn')
      load()
    } else toast.error(res?.error || 'Withdraw failed')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportListMenu columns={exportColumns} data={exportData} baseFilename={exportBaseName} />
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</p>
        ) : sortedData.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No records in this tab.</p>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedData.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {r.appointee?.full_name || r.appointee?.email}
                </div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{r.appointment_status?.replace(/_/g, ' ')}</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {r.time_commitment_pct != null ? `${r.time_commitment_pct}%` : '—'} · {fmtDate(r.assignment_start_date)}
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.id)}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {expandedId === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {expandedId === r.id ? 'Hide details' : 'View details'}
                  </button>
                  {tab === 'pending_acceptance' && acceptPathBuilder?.(r) ? (
                    <Link to={acceptPathBuilder(r)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      Open
                    </Link>
                  ) : null}
                  {tab === 'pending_acceptance' && onRemind ? (
                    <button type="button" onClick={() => handleRemind(r.id)} className="text-sm text-gray-600 dark:text-gray-400">
                      <Bell className="inline h-3.5 w-3.5" /> Remind
                    </button>
                  ) : null}
                  {tab === 'pending_acceptance' && onWithdraw ? (
                    <button type="button" onClick={() => handleWithdraw(r.id)} className="text-sm text-red-600 dark:text-red-400">
                      <Ban className="inline h-3.5 w-3.5" /> Withdraw
                    </button>
                  ) : null}
                </div>
                {expandedId === r.id ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <AppointmentTermsCard record={r} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  {[
                    ['appointee', rowLabel || 'Appointee'],
                    ['role', 'Role'],
                    ['start', 'Start'],
                    ['status', 'Status'],
                    ['actions', ''],
                  ].map(([k, label]) => (
                    <th key={k} className="px-4 py-3 text-left">
                      {k !== 'actions' ? (
                        <button type="button" onClick={() => cycleSort(k)} className="font-medium hover:text-blue-600">
                          {label} {sortCol === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedData.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2">{r.appointee?.full_name || r.appointee?.email}</td>
                      <td className="px-4 py-2 capitalize">
                        {(r.manager_role_name || r.member_role_name || r.role_title || '').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2">{fmtDate(r.assignment_start_date)}</td>
                      <td className="px-4 py-2 capitalize">{r.appointment_status?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.id)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expandedId === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expandedId === r.id ? 'Hide' : 'Details'}
                          </button>
                          {tab === 'pending_acceptance' && onRemind ? (
                            <button type="button" onClick={() => handleRemind(r.id)} className="text-gray-600 dark:text-gray-400 text-xs hover:underline">
                              Remind
                            </button>
                          ) : null}
                          {tab === 'pending_acceptance' && onWithdraw ? (
                            <button type="button" onClick={() => handleWithdraw(r.id)} className="text-red-600 dark:text-red-400 text-xs hover:underline">
                              Withdraw
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id ? (
                      <tr key={`${r.id}-detail`} className="bg-gray-50 dark:bg-gray-900/60">
                        <td colSpan={5} className="px-4 py-4">
                          <AppointmentTermsCard record={r} />
                        </td>
                      </tr>
                    ) : null}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
