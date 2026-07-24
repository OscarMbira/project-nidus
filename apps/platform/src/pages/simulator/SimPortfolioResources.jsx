import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, AlertCircle, X, Pencil, Check } from 'lucide-react'
import {
  getAllSimPortfolioMembers,
  getSimPortfolioList,
  addSimPortfolioMember,
  updateSimPortfolioMember,
  removeSimPortfolioMember,
} from '../../services/simPortfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const ROLE_OPTS = ['Portfolio Manager', 'Portfolio Owner', 'Analyst', 'Sponsor', 'Stakeholder', 'Contributor']

function statusBadge(s) {
  return (
    <span className={`${s === 'active' ? 'bg-green-700 text-green-100' : 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full capitalize`}>
      {s || '—'}
    </span>
  )
}

export default function SimPortfolioResources() {
  const [rows, setRows]         = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filterPortfolio, setFilterPortfolio] = useState('')
  const [filterStatus, setFilterStatus]       = useState('')

  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ portfolio_id: '', member_name: '', member_email: '', member_role: '', start_date: '', end_date: '' })
  const [adding, setAdding]     = useState(false)
  const [addError, setAddError] = useState(null)

  const [editId, setEditId]     = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const filters = {}
      if (filterPortfolio) filters.portfolio_id = filterPortfolio
      if (filterStatus)    filters.status = filterStatus
      const [data, pf] = await Promise.all([getAllSimPortfolioMembers(filters), getSimPortfolioList()])
      setRows(data); setPortfolios(pf)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [filterPortfolio, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.member_name?.toLowerCase().includes(q) ||
      r.member_email?.toLowerCase().includes(q) ||
      r.portfolio?.portfolio_name?.toLowerCase().includes(q)
    )
  })

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  async function handleAdd() {
    if (!addForm.portfolio_id || (!addForm.member_name && !addForm.member_email)) {
      setAddError('Portfolio and member name or email are required.'); return
    }
    setAdding(true); setAddError(null)
    try {
      await addSimPortfolioMember(addForm.portfolio_id, {
        member_name:  addForm.member_name,
        member_email: addForm.member_email,
        member_role:  addForm.member_role || null,
        start_date:   addForm.start_date  || null,
        end_date:     addForm.end_date    || null,
      })
      setShowAdd(false)
      setAddForm({ portfolio_id: '', member_name: '', member_email: '', member_role: '', start_date: '', end_date: '' })
      flash('Member added.'); load()
    } catch (err) { setAddError(err.message) }
    finally { setAdding(false) }
  }

  function startEdit(r) {
    setEditId(r.id)
    setEditForm({ member_role: r.member_role || '', start_date: r.start_date || '', end_date: r.end_date || '' })
  }

  async function handleSaveEdit(memberId) {
    setSaving(true)
    try {
      await updateSimPortfolioMember(memberId, editForm)
      setEditId(null); flash('Member updated.'); load()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleRemove(r) {
    if (!window.confirm(`Remove ${r.member_name || r.member_email} from this portfolio?`)) return
    try {
      await removeSimPortfolioMember(r.id)
      flash('Member removed.'); load()
    } catch (err) { setError(err.message) }
  }

  const exportColumns = [
    { key: 'member_name', header: 'Member Name' },
    { key: 'member_email', header: 'Email' },
    { key: 'member_role', header: 'Role' },
    { key: 'portfolio.portfolio_name', header: 'Portfolio' },
    { key: 'assignment_status', header: 'Status' },
    { key: 'start_date', header: 'Start Date' },
    { key: 'end_date', header: 'End Date' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Portfolio Resources</h1>
          <p className="text-gray-400 text-sm mt-1">All team members across practice portfolios</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu data={filtered} columns={exportColumns} baseFilename="sim-portfolio-resources" />
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />Add Member
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
            className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        </div>
        <select value={filterPortfolio} onChange={e => setFilterPortfolio(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Portfolios</option>
          {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={load} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><RefreshCw className="w-7 h-7 animate-spin text-teal-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                <TableRowNumberHeader className="!normal-case" />
                  {['Member', 'Email', 'Role', 'Portfolio', 'Status', 'Start', 'End', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isEditing = editId === r.id
                  return (
                    <tr key={r.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${i % 2 ? 'bg-gray-700/10' : ''}`}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-white font-medium">{r.member_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{r.member_email || '—'}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={editForm.member_role} onChange={e => setEditForm(f => ({ ...f, member_role: e.target.value }))}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none">
                            <option value="">—</option>
                            {ROLE_OPTS.map(ro => <option key={ro} value={ro}>{ro}</option>)}
                          </select>
                        ) : <span className="text-gray-300">{r.member_role || '—'}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{r.portfolio?.portfolio_name || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(r.assignment_status)}</td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none" />
                          : <span className="text-gray-300">{r.start_date || '—'}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input type="date" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none" />
                          : <span className="text-gray-300">{r.end_date || '—'}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(r.id)} disabled={saving}
                              className="text-green-400 hover:text-green-300 p-1 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-white p-1 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(r)} className="text-blue-400 hover:text-blue-300 p-1 rounded"><Pencil className="w-4 h-4" /></button>
                            {r.assignment_status === 'active' && (
                              <button onClick={() => handleRemove(r)} className="text-red-400 hover:text-red-300 p-1 rounded"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Add Practice Portfolio Member</h2>
              <button onClick={() => { setShowAdd(false); setAddError(null) }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Portfolio *</label>
                <select value={addForm.portfolio_id} onChange={e => setAddForm(f => ({ ...f, portfolio_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Select portfolio…</option>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Member Name</label>
                <input value={addForm.member_name} onChange={e => setAddForm(f => ({ ...f, member_name: e.target.value }))} placeholder="Full name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Email</label>
                <input value={addForm.member_email} onChange={e => setAddForm(f => ({ ...f, member_email: e.target.value }))} placeholder="email@example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Role</label>
                <select value={addForm.member_role} onChange={e => setAddForm(f => ({ ...f, member_role: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                  <option value="">—</option>
                  {ROLE_OPTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Start Date</label>
                  <input type="date" value={addForm.start_date} onChange={e => setAddForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">End Date</label>
                  <input type="date" value={addForm.end_date} onChange={e => setAddForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowAdd(false); setAddError(null) }} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Cancel</button>
              <button onClick={handleAdd} disabled={adding}
                className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg">
                {adding ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
