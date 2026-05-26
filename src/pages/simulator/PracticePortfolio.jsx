/**
 * Practice Portfolio Page
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus } from 'lucide-react'
import { getPracticePortfolios } from '../../services/sim/practicePortfolioService'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

import RowNumberBadge from '../../components/ui/RowNumberBadge'
export default function PracticePortfolio() {
  const navigate = useNavigate()
  const [portfolioViewMode, setPortfolioViewMode] = useViewMode('simulator-practice-portfolio', 'grid')
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPortfolios()
  }, [])

  const loadPortfolios = async () => {
    try {
      setLoading(true)
      const result = await getPracticePortfolios()
      if (result.success) setPortfolios(result.data || [])
    } catch (error) {
      console.error('Error loading portfolios:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Portfolios</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle value={portfolioViewMode} onChange={setPortfolioViewMode} ariaLabel="Practice portfolios layout" />
          <button onClick={() => navigate('/simulator/practice-portfolio/create')} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create Portfolio
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : portfolios.length === 0 ? <div className="text-center py-12 text-gray-500">No portfolios found</div> : portfolioViewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable={false} className="!normal-case">Name</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Description</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {portfolios.map((portfolio, index) => (
                  <tr key={portfolio.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{portfolio.portfolio_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xl truncate">{portfolio.portfolio_description || '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <button type="button" onClick={() => navigate(`/simulator/practice-portfolio/${portfolio.id}`)} className="text-blue-600 hover:underline text-sm">
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
          {portfolios.map((portfolio, index) => (
            <div key={portfolio.id} onClick={() => navigate(`/simulator/practice-portfolio/${portfolio.id}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <div className="flex items-start gap-2 mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{portfolio.portfolio_name}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{portfolio.portfolio_description?.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
