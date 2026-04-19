/**
 * Practice Programme Projects (Simulator)
 * Mirrors Platform Programme Projects: search + table of programmes, select one, show projects.
 * Route: /simulator/practice-programme/projects
 */

import { useState, useEffect, useMemo } from 'react'
import { Layers, Search } from 'lucide-react'
import { getPracticeProgrammesForList, getPracticeProgrammeProjects } from '../../services/sim/practicePortfolioService'

export default function PracticeProgrammeProjectsPage() {
  const [programmes, setProgrammes] = useState([])
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('')
  const [projects, setProjects] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
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
      loadProjects(selectedProgrammeId)
    } else {
      setProjects([])
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
      console.error('Error loading programmes list:', err)
      setError(err.message || 'Failed to load programmes')
    } finally {
      setListLoading(false)
    }
  }

  const loadProjects = async (programmeId) => {
    try {
      setProjectsLoading(true)
      setError(null)
      const data = await getPracticeProgrammeProjects(programmeId)
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading programme projects:', err)
      setError(err.message || 'Failed to load programme projects')
    } finally {
      setProjectsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-100">Programme Projects</h1>
          </div>
          <p className="text-gray-400">
            View projects assigned to each programme and their current status and priority (Simulator).
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {/* Search and programmes table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programmes by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search programmes"
            />
          </div>
          {listLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Loading programmes…
            </div>
          ) : filteredProgrammes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {programmes.length === 0 ? 'No programmes found.' : 'No programmes match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700 bg-gray-900/50">
                    <th className="py-3 px-4">Programme name</th>
                    <th className="py-3 px-4">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProgrammes.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProgrammeId(p.id)}
                      className={`border-b border-gray-700/80 last:border-0 cursor-pointer transition-colors ${
                        selectedProgrammeId === p.id
                          ? 'bg-blue-900/30 text-blue-100'
                          : 'hover:bg-gray-700/50 text-gray-200'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">{p.programme_name || '—'}</td>
                      <td className="py-3 px-4 text-gray-400">{p.programme_code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Click a row to select a programme and view its projects below.
          </p>
        </div>

        {/* Selected programme projects */}
        {selectedProgrammeId && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Projects in selected programme</h2>
            {projectsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
                <p className="text-gray-400">Loading projects…</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center text-gray-400">
                No projects assigned to this programme yet.
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-4">Project</th>
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((row) => (
                      <tr key={row.id} className="border-b border-gray-800 last:border-0">
                        <td className="py-2 pr-4 text-gray-100">
                          {row.practice_project?.project_name || 'Unknown Project'}
                        </td>
                        <td className="py-2 pr-4 text-gray-300">
                          {row.practice_project?.project_code || ''}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-900 text-gray-200">
                            {row.assignment_status || '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-300 capitalize">
                          {row.programme_priority || row.practice_project?.priority || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
