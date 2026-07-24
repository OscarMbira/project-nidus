import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, AlertCircle, X, Pencil, Trash2 } from 'lucide-react'
import {
  getAllSimPortfolioBudgets,
  getSimPortfolioList,
  saveSimPortfolioBudget,
  deleteSimPortfolioBudget,
} from '../../services/simPortfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const BUDGET_TYPES    = ['Capital', 'Operational', 'Programme', 'Contingency', 'Reserve']
const BUDGET_STATUSES = ['draft', 'approved', 'active', 'closed', 'cancelled']
const CURRENCIES      = ['USD', 'EUR', 'GBP', 'ZAR', 'AED', 'AUD', 'CAD']

function statusBadge(s) {
  const map = { approved:'bg-green-700 text-green-100', active:'bg-blue-700 text-blue-100', draft:'bg-yellow-700 text-yellow-100', closed:'bg-gray-600 text-gray-200', cancelled:'bg-red-700 text-red-100' }
  return <span className={`${map[s] || 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full capitalize`}>{s || '—'}</span>
}

function fmt(n, currency = '') {
  if (n == null) return '—'
  const m = Number(n)
  const s = m >= 1_000_000 ? `${(m / 1_000_000).toFixed(1)}M` : m >= 1_000 ? `${(m / 1_000).toFixed(0)}K` : String(m)
  return currency ? `${currency} ${s}` : s
}

function UtilBar({ approved, spent }) {
  if (!approved || approved === 0) return <span className="text-gray-500 text-xs">—</span>
  const pct = Math.min(Math.round(((spent || 0) / approved) * 100), 100)
  const colour = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300">{pct}%</span>
    </div>
  )
}

const EMPTY_FORM = { practice_portfolio_id: '', budget_name: '', budget_type: '', budget_currency: 'USD', approved_amount: '', actual_spent: '', remaining_amount: '', budget_status: 'draft' }

export default function SimPortfolioFinancial() {
  const [rows, setRows]         = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filterPortfolio, setFilterPortfolio] = useState('')
  const [filterType, setFilterType]           = useState('')
  const [filterStatus, setFilterStatus]       = useState('')

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
      if (filterType)      filters.budget_type  = filterType
      if (filterStatus)    filters.status        = filterStatus
      const [data, pf] = await Promise.all([getAllSimPortfolioBudgets(filters), getSimPortfolioList()])
      setRows(data); setPortfolios(pf)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [filterPortfolio, filterType, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.budget_name?.toLowerCase().includes(q) || r.portfolio?.portfolio_name?.toLowerCase().includes(q)
  })

  const totalApproved  = filtered.reduce((s, r) => s + (r.approved_amount || 0), 0)
  const totalSpent     = filtered.reduce((s, r) => s + (r.actual_spent || 0), 0)
  const totalRemaining = filtered.reduce((s, r) => s + (r.remaining_amount || 0), 0)
  const avgUtil        = totalApproved > 0 ? Math.round((totalSpent / totalApproved) * 100) : 0

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  function openAdd() { setEditRow(null); setForm(EMPTY_FORM); setFormError(null); setShowModal(true) }
  function openEdit(r) {
    setEditRow(r)
    setForm({ practice_portfolio_id: r.practice_portfolio_id || '', budget_name: r.budget_name || '', budget_type: r.budget_type || '', budget_currency: r.budget_currency || 'USD', approved_amount: r.approved_amount ?? '', actual_spent: r.actual_spent ?? '', remaining_amount: r.remaining_amount ?? '', budget_status: r.budget_status || 'draft' })
    setFormError(null); setShowModal(true)
  }

  async function handleSave() {
    if (!form.practice_portfolio_id || !form.budget_name) { setFormError('Portfolio and budget name required.'); return }
    setSaving(true); setFormError(null)
    try {
      const payload = { ...form, approved_amount: form.approved_amount !== '' ? Number(form.approved_amount) : null, actual_spent: form.actual_spent !== '' ? Number(form.actual_spent) : null, remaining_amount: form.remaining_amount !== '' ? Number(form.remaining_amount) : null }
      await saveSimPortfolioBudget(payload, editRow?.id || null)
      setShowModal(false); flash(editRow ? 'Budget updated.' : 'Budget added.'); load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSimPortfolioBudget(deleteTarget.id)
      setDeleteTarget(null); flash('Budget deleted.'); load()
    } catch (err) { setError(err.message) }
    finally { setDeleting(false) }
  }

  const exportColumns = [
    { key: 'portfolio.portfolio_name', header: 'Portfolio' },
    { key: 'budget_name', header: 'Budget Name' },
    { key: 'budget_type', header: 'Type' },
    { key: 'approved_amount', header: 'Approved' },
    { key: 'actual_spent', header: 'Spent' },
    { key: 'remaining_amount', header: 'Remaining' },
    { key: 'budget_status', header: 'Status' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Portfolio Financial</h1>
          <p className="text-gray-400 text-sm mt-1">Budget overview across all practice portfolios</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu data={filtered} columns={exportColumns} baseFilename="sim-portfolio-financial" />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />Add Budget
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Approved', value: `$${fmt(totalApproved)}` },
          { label: 'Total Spent',    value: `$${fmt(totalSpent)}` },
          { label: 'Total Remaining',value: `$${fmt(totalRemaining)}` },
          { label: 'Avg Utilisation',value: `${avgUtil}%` },
        ].map(k => (
          <div key={k.label} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">{k.label}</p>
            <p className="text-xl font-bold text-white mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {success && <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">{success}</div>}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
          <button onClick={load} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search budgets…"
            className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={filterPortfolio} onChange={e => setFilterPortfolio(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Portfolios</option>
          {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Types</option>
          {BUDGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><RefreshCw className="w-7 h-7 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No budget records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                <TableRowNumberHeader className="!normal-case" />
                  {['Portfolio', 'Budget Name', 'Type', 'Approved', 'Spent', 'Remaining', 'Utilisation', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${i % 2 ? 'bg-gray-700/10' : ''}`}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-gray-300">{r.portfolio?.portfolio_name || '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{r.budget_name}</td>
                    <td className="px-4 py-3 text-gray-300">{r.budget_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(r.approved_amount, r.budget_currency)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(r.actual_spent, r.budget_currency)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(r.remaining_amount, r.budget_currency)}</td>
                    <td className="px-4 py-3 w-32"><UtilBar approved={r.approved_amount} spent={r.actual_spent} /></td>
                    <td className="px-4 py-3">{statusBadge(r.budget_status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-300 p-1 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(r)} className="text-red-400 hover:text-red-300 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">{editRow ? 'Edit Budget' : 'Add Budget'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Portfolio *</label>
                <select value={form.practice_portfolio_id} onChange={e => setForm(f => ({ ...f, practice_portfolio_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select portfolio…</option>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Budget Name *</label>
                <input value={form.budget_name} onChange={e => setForm(f => ({ ...f, budget_name: e.target.value }))} placeholder="e.g. FY2026 Capital Budget"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Type</label>
                  <select value={form.budget_type} onChange={e => setForm(f => ({ ...f, budget_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                    <option value="">—</option>
                    {BUDGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Currency</label>
                  <select value={form.budget_currency} onChange={e => setForm(f => ({ ...f, budget_currency: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: 'Approved Amount', key: 'approved_amount' }, { label: 'Actual Spent', key: 'actual_spent' }, { label: 'Remaining', key: 'remaining_amount' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-gray-400 text-sm mb-1">{f.label}</label>
                    <input type="number" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Status</label>
                <select value={form.budget_status} onChange={e => setForm(f => ({ ...f, budget_status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                  {BUDGET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg">
                {saving ? 'Saving…' : editRow ? 'Update' : 'Add Budget'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-white font-semibold">Delete Budget?</h2>
            <p className="text-gray-400 text-sm">Delete <strong className="text-white">{deleteTarget.budget_name}</strong>?</p>
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
