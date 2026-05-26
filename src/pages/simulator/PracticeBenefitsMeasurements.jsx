/**
 * Practice Benefits Measurements (Simulator)
 * Measurements are tracked within Practice Benefits Review Plans. Route: /simulator/benefits/measurements
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Search, BarChart3, FileText } from 'lucide-react'
import { getAllPracticeBenefitsReviewPlans } from '../../services/sim/practiceBenefitsService'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

import RowNumberBadge from '../../components/ui/RowNumberBadge'
export default function PracticeBenefitsMeasurements() {
  const navigate = useNavigate()
  const [brpViewMode, setBrpViewMode] = useViewMode('simulator-practice-benefits-measurements', 'grid')
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAllPracticeBenefitsReviewPlans({})
      if (res.success) setPlans(res.data || [])
      else setPlans([])
    } catch (err) {
      console.error('Error loading practice benefits measurements:', err)
      setError(err.message || 'Failed to load data')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return plans
    const q = searchTerm.trim().toLowerCase()
    return plans.filter(
      (p) => (p.practice_projects?.project_name || '').toLowerCase().includes(q)
    )
  }, [plans, searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading measurements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-100">Measurements</h1>
          </div>
          <p className="text-gray-400">
            Benefit measurements and review schedules are tracked within each Practice Benefits Review Plan.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ViewToggle
            value={brpViewMode}
            onChange={setBrpViewMode}
            ariaLabel="Practice benefits measurements layout"
            className="!bg-gray-800 !border-gray-700"
          />
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No practice benefits review plans. Create a BRP to track benefit measurements.</p>
              <button
                type="button"
                onClick={() => navigate('/simulator/benefits/register')}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Benefits Register
              </button>
            </div>
          ) : brpViewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Last updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">View plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filtered.map((plan, index) => (
                    <tr key={plan.id} className="hover:bg-gray-700/30">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-gray-200">
                        {plan.practice_projects?.project_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300">
                          {plan.status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/simulator/practice-benefits-review-plans/${plan.id}`)}
                          className="text-blue-500 hover:text-purple-300 text-sm"
                        >
                          View BRP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((plan, index) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => navigate(`/simulator/practice-benefits-review-plans/${plan.id}`)}
                  className="text-left rounded-lg border border-gray-700 bg-gray-900/40 p-4 hover:border-blue-500/50 min-h-[140px]"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                    <div className="font-medium text-gray-100">{plan.practice_projects?.project_name || 'Project'}</div>
                  </div>
                  <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300">{plan.status || '—'}</span>
                  <p className="mt-3 text-sm text-gray-400">
                    Updated {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : '—'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
