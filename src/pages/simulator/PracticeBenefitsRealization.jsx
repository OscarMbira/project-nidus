/**
 * Practice Benefits Realization (Simulator)
 * Select a practice programme and view benefit realization. Route: /simulator/benefits/realization
 */

import { useState, useEffect, useMemo } from 'react'
import { Target, Search } from 'lucide-react'
import { getPracticeProgrammesForList, getPracticeProgrammeBenefits } from '../../services/sim/practicePortfolioService'
import BenefitsRealizationChart from '../../components/programme/BenefitsRealizationChart'

export default function PracticeBenefitsRealization() {
  const [programmes, setProgrammes] = useState([])
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('')
  const [benefits, setBenefits] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [benefitsLoading, setBenefitsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProgrammes = useMemo(() => {
    if (!searchTerm.trim()) return programmes
    const q = searchTerm.trim().toLowerCase()
    return programmes.filter(
      (p) =>
        (p.programme_name || '').toLowerCase().includes(q) ||
        (p.programme_code || '').toLowerCase().includes(q)
    )
  }, [programmes, searchTerm])

  useEffect(() => {
    loadProgrammes()
  }, [])

  useEffect(() => {
    if (selectedProgrammeId) {
      loadBenefits(selectedProgrammeId)
    } else {
      setBenefits([])
    }
  }, [selectedProgrammeId])

  const loadProgrammes = async () => {
    try {
      setListLoading(true)
      setError(null)
      const res = await getPracticeProgrammesForList()
      if (res.success) setProgrammes(res.data || [])
      else setProgrammes([])
    } catch (err) {
      console.error('Error loading programmes:', err)
      setError(err.message || 'Failed to load programmes')
    } finally {
      setListLoading(false)
    }
  }

  const loadBenefits = async (programmeId) => {
    try {
      setBenefitsLoading(true)
      setError(null)
      const data = await getPracticeProgrammeBenefits(programmeId)
      setBenefits(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading programme benefits:', err)
      setError(err.message || 'Failed to load benefits')
      setBenefits([])
    } finally {
      setBenefitsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-100">Realization</h1>
          </div>
          <p className="text-gray-400">
            View benefit realization by practice programme (from project benefits review plans).
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programmes by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search programmes"
            />
          </div>
          {listLoading ? (
            <div className="py-8 text-center text-gray-400">Loading programmes...</div>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Programme</th>
                    <th className="px-4 py-2 w-24 text-xs font-medium text-gray-300 uppercase">Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProgrammes.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-700/30 cursor-pointer ${selectedProgrammeId === p.id ? 'bg-purple-900/20' : ''}`}
                      onClick={() => setSelectedProgrammeId(p.id)}
                    >
                      <td className="px-4 py-2 text-gray-200 text-sm">{p.programme_code || '—'}</td>
                      <td className="px-4 py-2 text-gray-200">{p.programme_name || '—'}</td>
                      <td className="px-4 py-2">
                        <span className="text-blue-500 text-sm">
                          {selectedProgrammeId === p.id ? 'Selected' : 'Select'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!listLoading && filteredProgrammes.length === 0 && (
            <p className="py-4 text-gray-400 text-sm">No practice programmes found.</p>
          )}
        </div>

        {selectedProgrammeId && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Benefit realization</h2>
            {benefitsLoading ? (
              <div className="py-12 text-center text-gray-400">Loading benefits...</div>
            ) : benefits.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                No benefits data for this programme. Benefits are derived from practice project Benefits Review Plans.
              </div>
            ) : (
              <BenefitsRealizationChart benefits={benefits} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
