/**
 * Practice Teams Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Plus } from 'lucide-react'
import { getPracticeTeams } from '../../services/sim/practiceTeamService'

export default function PracticeTeams() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadTeams()
    }
  }, [projectId])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const result = await getPracticeTeams(projectId)
      if (result.success) setTeams(result.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Teams</h1>
        <button onClick={() => navigate(`/simulator/practice-teams/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" /> Create Team
        </button>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : teams.length === 0 ? <div className="text-center py-12 text-gray-500">No teams found</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} onClick={() => navigate(`/simulator/practice-teams/${team.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.team_name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Type: {team.team_type}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Size: {team.team_size} members</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
