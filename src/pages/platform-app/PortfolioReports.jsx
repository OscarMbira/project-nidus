import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, AlertCircle, X, Pencil, Trash2 } from 'lucide-react'
import {
  getAllPortfolioReports,
  getPortfolioList,
  createPortfolioReport,
  updatePortfolioReport,
  deletePortfolioReport,
} from '../../services/portfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const REPORT_TYPES = [
  'Portfolio Status Report', 'Portfolio Health Report', 'Executive Summary',
  'Budget Report', 'Risk Report', 'Performance Report', 'KPI Report',
]
const STATUSES = ['pending', 'in_progress', 'completed', 'distributed', 'cancelled']

function statusBadge(s) {
  const map = {
    completed:   'bg-green-700 text-green-100',
    distributed: 'bg-blue-700 text-blue-100',
    in_progress: 'bg-yellow-700 text-yellow-100',
    pending:     'bg-gray-600 text-gray-200',
    cancelled:   'bg-red-700 text-red-100',
  }
  return (
    <span className={`${map[s] || 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full`}>
      {(s || '—').replace(/_/g, ' ')}
    </span>
  )
}

const EMPTY_FORM = {
  portfolio_id: '', report_name: '', report_type: '', report_period: '',
  generation_status: 'pending', report_summary: '',
}

export default function PortfolioReports() {
  const [rows, setRows]         = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filterPortfolio, setFilterPortfolio] = useState('')
  const [filterType, setFilterType]           = useState('')
  const [filterStatus, setFilterStatus]       = useState('')
  const [filterFrom, setFilterFrom]           = useState('')
  const [filterTo, setFilterTo]               = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [success, setSuccess]           = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const filters = {}
      if (filterPortfolio) filters.portfolio_id = filterPortfolio
      if (filterType)      filters.report_type   = filterType
      if (filterStatus)    filters.status         = filterStatus
      if (filterFrom)      filters.date_from      = filterFrom
      if (filterTo)        filters.date_to        = filterTo
      const [data, pf] = await Promise.all([getAllPortfolioReports(filters), getPortfolioList()])
      setRows(data); setPortfolios(pf)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [filterPortfolio, filterType, filterStatus, filterFrom, filterTo])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.report_name?.toLowerCase().includes(q) ||
      r.portfolio?.portfolio_name?.toLowerCase().includes(q) ||
      r.report_type?.toLowerCase().includes(q)
    )
  })

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  function openAdd() { setEditRow(null); setForm(EMPTY_FORM); setFormError(null); setShowModal(true) }

  function openEdit(r) {
    setEditRow(r)
    setForm({
      portfolio_id:     r.portfolio_id     || '',
      report_name:      r.report_name      || '',
      report_type:      r.report_type      || '',
      report_period:    r.report_period    || '',
      generation_status:r.generation_status|| 'pending',
      report_summary:   r.report_summary   || '',
    })
    setFormError(null); setShowModal(true)
  }

  async function handleSave() {
    if (!form.portfolio_id || !form.report_name) { setFormError('Portfolio and report name are required.'); return }
    setSaving(true); setFormError(null)
    try {
      if (editRow) {
        await updatePortfolioReport(editRow.id, form)
      } else {
        await createPortfolioReport(form.portfolio_id, form)
      }
      setShowModal(false)
      flash(editRow ? 'Report updated.' : 'Report created.')
      load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePortfolioReport(deleteTarget.id)
      setDeleteTarget(null)
      flash('Report deleted.')
      load()
    } catch (err) { setError(err.message) }
    finally { setDeleting(false) }
  }

  const exportColumns = [
    { key: 'report_name', header: 'Report Name' },
    { key: 'report_type', header: 'Type' },
    { key: 'portfolio.portfolio_name', header: 'Portfolio' },
    { key: 'report_period', header: 'Period' },
    { key: 'generation_status', header: 'Status' },
    { key: 'report_date', header: 'Report Date' },
    { key: 'generated_by.full_name', header: 'Generated By' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Reports</h1>
          <p className="text-gray-400 text-sm mt-1">All reports across all portfolios</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu data={filtered} columns={exportColumns} baseFilename="portfolio-reports" />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />Create Report
          </button>
        </div>
      </div>

      {success && <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">{success}</div>}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
          <button onClick={load} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…"
            className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <select value={filterPortfolio} onChange={e => setFilterPortfolio(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Portfolios</option>
          {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Types</option>
          {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          title="From date"
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
          title="To date"
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
        <button onClick={load} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><RefreshCw className="w-7 h-7 animate-spin text-orange-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                <TableRowNumberHeader className="!normal-case" />
                  {['Report Name', 'Type', 'Portfolio', 'Period', 'Status', 'Date', 'Generated By', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${i % 2 ? 'bg-gray-700/10' : ''}`}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-white font-medium">{r.report_name}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.report_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.portfolio?.portfolio_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.report_period || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(r.generation_status)}</td>
                    <td className="px-4 py-3 text-gray-300">{r.report_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.generated_by?.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-300 p-1 rounded" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(r)} className="text-red-400 hover:text-red-300 p-1 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">{editRow ? 'Edit Report' : 'Create Report'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Portfolio *</label>
                <select value={form.portfolio_id} onChange={e => setForm(f => ({ ...f, portfolio_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select portfolio…</option>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Report Name *</label>
                <input value={form.report_name} onChange={e => setForm(f => ({ ...f, report_name: e.target.value }))}
                  placeholder="e.g. Q1 2026 Portfolio Status Report"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Report Type</label>
                  <select value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                    <option value="">—</option>
                    {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Period</label>
                  <input value={form.report_period} onChange={e => setForm(f => ({ ...f, report_period: e.target.value }))}
                    placeholder="e.g. Q1 2026"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Status</label>
                <select value={form.generation_status} onChange={e => setForm(f => ({ ...f, generation_status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Summary / Content</label>
                <textarea value={form.report_summary} onChange={e => setForm(f => ({ ...f, report_summary: e.target.value }))}
                  rows={4} placeholder="Report summary or key findings…"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none resize-y" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg">
                {saving ? 'Saving…' : editRow ? 'Update' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-white font-semibold">Delete Report?</h2>
            <p className="text-gray-400 text-sm">
              Delete <strong className="text-white">{deleteTarget.report_name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
