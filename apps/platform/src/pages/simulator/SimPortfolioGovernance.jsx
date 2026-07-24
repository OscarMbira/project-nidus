import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, AlertCircle, X, Pencil, Check } from 'lucide-react'
import {
  getAllSimPortfolioGovernance,
  getSimPortfolioList,
  saveSimPortfolioGovernance,
} from '../../services/simPortfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const GOVERNANCE_MODELS = ['Centralised', 'Decentralised', 'Federated', 'Hybrid', 'Matrix']

const REVIEW_FREQUENCIES = [
  'Weekly',
  'Bi-Weekly',
  'Monthly',
  'Quarterly',
  'Semi-Annual',
  'Annual',
]

function modelBadge(m) {
  const map = {
    Centralised: 'bg-blue-700 text-blue-100',
    Decentralised: 'bg-purple-700 text-purple-100',
    Federated: 'bg-teal-700 text-teal-100',
    Hybrid: 'bg-orange-700 text-orange-100',
    Matrix: 'bg-yellow-700 text-yellow-100',
  }
  return m ? (
    <span className={`${map[m] || 'bg-gray-600 text-gray-200'} text-xs px-2 py-0.5 rounded-full`}>
      {m}
    </span>
  ) : (
    <span className="text-gray-500 text-xs">—</span>
  )
}

const EMPTY_EDIT = {
  governance_model: '',
  review_frequency: '',
  last_review_date: '',
  next_review_date: '',
  decision_authority: '',
  governance_notes: '',
}

export default function SimPortfolioGovernance() {
  const [rows, setRows] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPortfolio, setFilterPortfolio] = useState('')
  const [filterModel, setFilterModel] = useState('')

  const [editRow, setEditRow] = useState(null)
  const [editPortfolioId, setEditPortfolioId] = useState(null)
  const [form, setForm] = useState(EMPTY_EDIT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {}
      if (filterPortfolio) filters.portfolio_id = filterPortfolio
      if (filterModel) filters.governance_model = filterModel
      const [data, pf] = await Promise.all([
        getAllSimPortfolioGovernance(filters),
        getSimPortfolioList(),
      ])
      setRows(data)
      setPortfolios(pf)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterPortfolio, filterModel])

  useEffect(() => {
    load()
  }, [load])

  const filtered = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.portfolio?.portfolio_name?.toLowerCase().includes(q) ||
      r.governance_model?.toLowerCase().includes(q) ||
      r.decision_authority?.toLowerCase().includes(q)
    )
  })

  function flash(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  function openEdit(r) {
    setEditRow(r)
    setEditPortfolioId(r.practice_portfolio_id)
    setForm({
      governance_model: r.governance_model || '',
      review_frequency: r.review_frequency || '',
      last_review_date: r.last_review_date || '',
      next_review_date: r.next_review_date || '',
      decision_authority: r.decision_authority || '',
      governance_notes: r.governance_notes || '',
    })
    setFormError(null)
  }

  function openCreate(portfolioId) {
    setEditRow(null)
    setEditPortfolioId(portfolioId)
    setForm(EMPTY_EDIT)
    setFormError(null)
  }

  async function handleSave() {
    if (!editPortfolioId) return
    setSaving(true)
    setFormError(null)
    try {
      await saveSimPortfolioGovernance(editPortfolioId, form)
      setEditRow(null)
      setEditPortfolioId(null)
      flash('Governance record saved.')
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const portfoliosWithGov = new Set(rows.map((r) => r.practice_portfolio_id))
  const portfoliosWithoutGov = portfolios.filter((p) => !portfoliosWithGov.has(p.id))

  const exportColumns = [
    { key: 'portfolio.portfolio_name', header: 'Portfolio' },
    { key: 'governance_model', header: 'Governance Model' },
    { key: 'review_frequency', header: 'Review Frequency' },
    { key: 'last_review_date', header: 'Last Review' },
    { key: 'next_review_date', header: 'Next Review' },
    { key: 'decision_authority', header: 'Decision Authority' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Portfolio Governance</h1>
          <p className="text-gray-400 text-sm mt-1">
            Governance settings for each practice portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            data={filtered}
            columns={exportColumns}
            baseFilename="sim-portfolio-governance"
          />
        </div>
      </div>

      {success && (
        <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-sm underline">
            Retry
          </button>
        </div>
      )}

      {/* Portfolios without governance record */}
      {!loading && portfoliosWithoutGov.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm font-medium mb-2">
            Practice portfolios without a governance record:
          </p>
          <div className="flex flex-wrap gap-2">
            {portfoliosWithoutGov.map((p, index) => (
              <button
                key={p.id}
                onClick={() => openCreate(p.id)}
                className="px-3 py-1 bg-yellow-700/40 hover:bg-yellow-700/70 text-yellow-200 text-xs rounded-lg border border-yellow-700/50 transition-colors"
              >
                + {p.portfolio_code} — {p.portfolio_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search portfolio or model…"
            className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <select
          value={filterPortfolio}
          onChange={(e) => setFilterPortfolio(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Portfolios</option>
          {portfolios.map((p, index) => (
            <option key={p.id} value={p.id}>
              {p.portfolio_code} — {p.portfolio_name}
            </option>
          ))}
        </select>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Models</option>
          {GOVERNANCE_MODELS.map((m, index) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-7 h-7 animate-spin text-teal-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No governance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                <TableRowNumberHeader className="!normal-case" />
                  {[
                    'Portfolio',
                    'Governance Model',
                    'Review Frequency',
                    'Last Review',
                    'Next Review',
                    'Decision Authority',
                    '',
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${
                      i % 2 ? 'bg-gray-700/10' : ''
                    }`}
                  >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-white font-medium">
                      {r.portfolio?.portfolio_name || '—'}
                    </td>
                    <td className="px-4 py-3">{modelBadge(r.governance_model)}</td>
                    <td className="px-4 py-3 text-gray-300">{r.review_frequency || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.last_review_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.next_review_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {r.decision_authority || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-blue-400 hover:text-blue-300 p-1 rounded"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editPortfolioId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">
                {editRow ? 'Edit Governance' : 'Create Governance Record'}
              </h2>
              <button
                onClick={() => {
                  setEditPortfolioId(null)
                  setEditRow(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            {!editRow && (
              <p className="text-gray-400 text-sm">
                Practice portfolio:{' '}
                <strong className="text-white">
                  {portfolios.find((p) => p.id === editPortfolioId)?.portfolio_name ||
                    editPortfolioId}
                </strong>
              </p>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Governance Model</label>
                  <select
                    value={form.governance_model}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, governance_model: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">—</option>
                    {GOVERNANCE_MODELS.map((m, index) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Review Frequency</label>
                  <select
                    value={form.review_frequency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, review_frequency: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
                  >
                    <option value="">—</option>
                    {REVIEW_FREQUENCIES.map((rf, index) => (
                      <option key={rf} value={rf}>
                        {rf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Last Review</label>
                  <input
                    type="date"
                    value={form.last_review_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, last_review_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Next Review</label>
                  <input
                    type="date"
                    value={form.next_review_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, next_review_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Decision Authority</label>
                <input
                  value={form.decision_authority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, decision_authority: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none"
                  placeholder="e.g. Portfolio Board"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <textarea
                  value={form.governance_notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, governance_notes: e.target.value }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Additional governance details…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setEditPortfolioId(null)
                  setEditRow(null)
                }}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

