/**
 * Practice Benefits Register (Simulator)
 * Route: /simulator/benefits/register
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Search, Plus, FileText, Edit2 } from 'lucide-react'
import { getAllPracticeBenefitsReviewPlans } from '../../services/sim/practiceBenefitsService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function PracticeBenefitsRegister() {
  const navigate = useNavigate()
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
      console.error('Error loading practice benefits register:', err)
      setError(err.message || 'Failed to load register')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return plans
    const q = searchTerm.trim().toLowerCase()
    return plans.filter(
      (p) =>
        (p.practice_projects?.project_name || '').toLowerCase().includes(q) ||
        (p.id || '').toString().toLowerCase().includes(q)
    )
  }, [plans, searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading benefits register...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-100">Benefits Register</h1>
            </div>
            <p className="text-gray-400">
              Create and manage Practice Benefits Review Plans linked to practice projects.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/simulator/practice-benefits-review-plans')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> View all BRPs
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100"
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No benefits in the register. Create a Benefits Review Plan from a practice project.</p>
              <button
                type="button"
                onClick={() => navigate('/simulator/practice-projects')}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Practice Projects
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filtered.map((plan, index) => (
                    <tr key={plan.id} className="hover:bg-gray-700/30">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-gray-200">
                        {plan.practice_projects?.project_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300">
                          {plan.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/simulator/practice-benefits-review-plans/${plan.id}/edit`)}
                          className="text-blue-500 hover:text-purple-300 inline-flex items-center gap-1 text-sm mr-4"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/simulator/practice-benefits-review-plans/${plan.id}`)}
                          className="text-blue-500 hover:text-purple-300 inline-flex items-center gap-1 text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
