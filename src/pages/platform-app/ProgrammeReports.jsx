import { useState, useEffect } from 'react'
import { FileText, Filter } from 'lucide-react'
import { getProgrammeList, getProgrammeReports } from '../../services/programmeService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function ProgrammeReportsPage() {
  const [programmes, setProgrammes] = useState([])
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ report_type: '', status: '' })

  useEffect(() => {
    loadProgrammes()
  }, [])

  useEffect(() => {
    if (selectedProgrammeId) {
      loadReports(selectedProgrammeId)
    } else {
      setReports([])
    }
  }, [selectedProgrammeId, filters.report_type, filters.status])

  const loadProgrammes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProgrammeList()
      setProgrammes(data || [])
    } catch (err) {
      console.error('Error loading programmes list:', err)
      setError(err.message || 'Failed to load programmes')
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async (programmeId) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProgrammeReports(programmeId, {
        report_type: filters.report_type || undefined,
        status: filters.status || undefined,
      })
      setReports(data || [])
    } catch (err) {
      console.error('Error loading programme reports:', err)
      setError(err.message || 'Failed to load programme reports')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-100">Programme Reports</h1>
          </div>
          <p className="text-gray-400">
            Review formal reports generated for each programme, including status and approval details.
          </p>
        </div>

        {/* Selector & Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-200">
                Select Programme
              </span>
            </div>
            <select
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm min-w-[240px]"
            >
              <option value="">Choose a programme…</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.programme_name} {p.programme_code ? `(${p.programme_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.report_type}
              onChange={(e) => setFilters(f => ({ ...f, report_type: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm min-w-[180px]"
            >
              <option value="">All Report Types</option>
              <option value="highlight">Highlight</option>
              <option value="exception">Exception</option>
              <option value="end_stage">End Stage</option>
              <option value="end_project">End Project</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {loading && selectedProgrammeId ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading programme reports...</p>
          </div>
        ) : !selectedProgrammeId ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center text-gray-400">
            Select a programme to see its reports.
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center text-gray-400">
            No reports found for the selected filters.
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Generated By</th>
                  <th className="py-2 pr-4">Approved By</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, index) => (
                  <tr key={r.id} className="border-b border-gray-800 last:border-0">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="py-2 pr-4 text-gray-300">
                      {r.report_date || '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-100 capitalize">
                      {r.report_type || '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-300 capitalize">
                      {r.report_status || '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-300">
                      {r.generated_by?.full_name || r.generated_by?.email || '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-300">
                      {r.approved_by?.full_name || r.approved_by?.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

