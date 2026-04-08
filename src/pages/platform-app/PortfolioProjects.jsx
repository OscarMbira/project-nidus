import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, AlertCircle, X, Trash2 } from 'lucide-react'
import {
  getAllPortfolioProjects,
  getPortfolioList,
  addProjectToPortfolio,
  removeProjectFromPortfolio,
  getProjectsList,
} from '../../services/portfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const STATUS_OPTS = ['active', 'removed']

function statusBadge(s) {
  const map = {
    active: 'bg-green-700 text-green-100',
    removed: 'bg-red-700 text-red-100',
    completed: 'bg-blue-700 text-blue-100',
    on_hold: 'bg-yellow-700 text-yellow-100',
  }
  return (
    <span className={`${map[s] || 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full capitalize`}>
      {(s || '—').replace(/_/g, ' ')}
    </span>
  )
}

export default function PortfolioProjects() {
  const [rows, setRows]         = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Filters
  const [search, setSearch]     = useState('')
  const [filterPortfolio, setFilterPortfolio] = useState('')
  const [filterStatus, setFilterStatus]       = useState('')

  // Add modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ portfolio_id: '', project_id: '' })
  const [adding, setAdding]     = useState(false)
  const [addError, setAddError] = useState(null)

  // Confirm remove
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

  // Success message
  const [success, setSuccess]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {}
      if (filterPortfolio) filters.portfolio_id = filterPortfolio
      if (filterStatus)    filters.status = filterStatus
      const [data, pf, prj] = await Promise.all([
        getAllPortfolioProjects(filters),
        getPortfolioList(),
        getProjectsList(),
      ])
      setRows(data)
      setPortfolios(pf)
      setAllProjects(prj || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterPortfolio, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.project?.project_name?.toLowerCase().includes(q) ||
      r.project?.project_code?.toLowerCase().includes(q) ||
      r.portfolio?.portfolio_name?.toLowerCase().includes(q)
    )
  })

  function flash(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleAdd() {
    if (!addForm.portfolio_id || !addForm.project_id) return
    setAdding(true)
    setAddError(null)
    try {
      await addProjectToPortfolio(addForm.portfolio_id, addForm.project_id)
      setShowAdd(false)
      setAddForm({ portfolio_id: '', project_id: '' })
      flash('Project assigned to portfolio successfully.')
      load()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeProjectFromPortfolio(removeTarget.portfolio_id, removeTarget.project_id)
      setRemoveTarget(null)
      flash('Project removed from portfolio.')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(false)
    }
  }

  const exportColumns = [
    { key: 'project.project_name', header: 'Project Name' },
    { key: 'project.project_code', header: 'Project Code' },
    { key: 'portfolio.portfolio_name', header: 'Portfolio' },
    { key: 'project.project_statuses.status_name', header: 'Status' },
    { key: 'project.delivery_methodology', header: 'Methodology' },
    { key: 'project.planned_start_date', header: 'Start Date' },
    { key: 'project.planned_end_date', header: 'End Date' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Projects</h1>
          <p className="text-gray-400 text-sm mt-1">All projects across all portfolios</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu data={filtered} columns={exportColumns} filename="portfolio-projects" />
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Assign Project
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="flex items-center gap-3 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          <span>{success}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects or portfolios…"
            className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterPortfolio}
          onChange={e => setFilterPortfolio(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Portfolios</option>
          {portfolios.map(p => (
            <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No projects found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  {['Project Name', 'Code', 'Portfolio', 'Status', 'Methodology', 'Start', 'End', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${i % 2 ? 'bg-gray-700/10' : ''}`}>
                    <td className="px-4 py-3 text-white font-medium">{r.project?.project_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{r.project?.project_code || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.portfolio?.portfolio_name || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(r.project?.project_statuses?.status_name)}</td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{r.project?.delivery_methodology || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.project?.planned_start_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.project?.planned_end_date || '—'}</td>
                    <td className="px-4 py-3">
                      {r.assignment_status === 'active' && (
                        <button
                          onClick={() => setRemoveTarget({ portfolio_id: r.portfolio_id, project_id: r.project_id, name: r.project?.project_name })}
                          className="text-red-400 hover:text-red-300 p-1 rounded"
                          title="Remove from portfolio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Assign Project to Portfolio</h2>
              <button onClick={() => { setShowAdd(false); setAddError(null) }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Portfolio *</label>
                <select
                  value={addForm.portfolio_id}
                  onChange={e => setAddForm(f => ({ ...f, portfolio_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select portfolio…</option>
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Project *</label>
                <select
                  value={addForm.project_id}
                  onChange={e => setAddForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select project…</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAdd(false); setAddError(null) }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !addForm.portfolio_id || !addForm.project_id}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {adding ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-white font-semibold">Remove Project?</h2>
            <p className="text-gray-400 text-sm">
              Remove <strong className="text-white">{removeTarget.name}</strong> from this portfolio? The project itself will not be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveTarget(null)} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
