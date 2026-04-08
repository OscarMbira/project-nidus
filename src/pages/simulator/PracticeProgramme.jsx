/**
 * Practice Programme Page (Simulator)
 * Optimised: slim list query, single load on mount.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getPracticeProgrammesForList } from '../../services/sim/practicePortfolioService'
import { TableHeaderCell } from '../../components/ui/Table'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'

export default function PracticeProgramme() {
  const navigate = useNavigate()
  const [programmeViewMode, setProgrammeViewMode] = useViewMode('simulator-practice-programme', 'grid')
  const [searchParams] = useSearchParams()
  const portfolioId = searchParams.get('portfolioId')
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    getPracticeProgrammesForList(portfolioId || undefined)
      .then((result) => {
        if (!cancelledRef.current && result.success) setProgrammes(result.data || [])
      })
      .catch((err) => console.error('Error loading programmes:', err))
      .finally(() => { if (!cancelledRef.current) setLoading(false) })
    return () => { cancelledRef.current = true }
  }, [portfolioId])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Programmes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle value={programmeViewMode} onChange={setProgrammeViewMode} ariaLabel="Practice programmes layout" />
          <button onClick={() => navigate(`/simulator/practice-programme/create?portfolioId=${portfolioId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create Programme
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : programmes.length === 0 ? <div className="text-center py-12 text-gray-500">No programmes found</div> : programmeViewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <TableHeaderCell sortable={false} className="!normal-case">Name</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Description</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {programmes.map((programme) => (
                  <tr key={programme.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{programme.programme_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xl truncate">{programme.programme_description || '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <button type="button" onClick={() => navigate(`/simulator/practice-programme/${programme.id}`)} className="text-blue-600 hover:underline text-sm">
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programmes.map((programme) => (
            <div key={programme.id} onClick={() => navigate(`/simulator/practice-programme/${programme.id}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{programme.programme_name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{programme.programme_description?.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
