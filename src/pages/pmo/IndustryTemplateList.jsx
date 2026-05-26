import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers, Plus, Search, Eye, Pencil, Archive, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import ViewToggle from '../../components/ui/ViewToggle'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import {
  listIndustryTemplates,
  archiveTemplate,
  duplicateTemplate,
} from '../../services/industryTemplateService'
import { downloadText, templatesToCsv } from '../../utils/industryPlanExport'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'industry_code', label: 'Code' },
  { key: 'industry_name', label: 'Industry' },
  { key: 'status', label: 'Status' },
  { key: 'typical_duration', label: 'Duration' },
  { key: 'updated_at', label: 'Updated' },
]

export default function IndustryTemplateList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode('pmo-industry-templates', 'list')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listIndustryTemplates({ status: statusFilter || undefined, pmoView: true, search })
      setRows(data)
    } catch (e) {
      toast.error(e.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => rows, [rows])

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this template?')) return
    try {
      await archiveTemplate(id)
      toast.success('Template archived')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleDuplicate = async (id) => {
    try {
      const copy = await duplicateTemplate(id)
      toast.success('Template duplicated')
      navigate(`/pmo/industry-templates/${copy.id}/edit`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-7 w-7 text-blue-600" />
            Industry Templates
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            PMO-maintained industry plan blueprints for project managers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/pmo/industry-templates/on-hold"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
          >
            Draft queue
          </Link>
          <Link
            to="/pmo/industry-templates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add template
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            placeholder="Search industries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        <ExportListMenu
          rows={filtered}
          columns={EXPORT_COLS}
          filename="industry-templates"
          onExportCsv={() => downloadText('industry-templates.csv', templatesToCsv(filtered), 'text/csv')}
        />
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, index) => (
            <div
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <h2 className="font-semibold text-slate-900 dark:text-white">{r.industry_name}</h2>
              <p className="text-xs text-slate-500 mt-1">{r.industry_code}</p>
              <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                {r.status}
              </span>
              <div className="mt-4 flex gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <Link to={`/pmo/industry-templates/${r.id}`} className="text-xs text-blue-600 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> View
                </Link>
                <Link
                  to={`/pmo/industry-templates/${r.id}/edit`}
                  className="text-xs text-slate-600 flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && viewMode !== 'grid' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-4 py-2 text-left">Industry</th>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Duration</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-2 font-medium">{r.industry_name}</td>
                  <td className="px-4 py-2 text-slate-500">{r.industry_code}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">{r.typical_duration}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/pmo/industry-templates/${r.id}`} title="View">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link to={`/pmo/industry-templates/${r.id}/edit`} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button type="button" onClick={() => handleDuplicate(r.id)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleArchive(r.id)} title="Archive">
                        <Archive className="h-4 w-4" />
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
  )
}
