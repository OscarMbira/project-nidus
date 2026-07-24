/**
 * Practice Engagement Actions – Simulator page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ListTodo } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import PracticeEngagementActions from '../../components/sim/PracticeEngagementActions'

export default function PracticeEngagementActionsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) return
      const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (u.data?.id) {
        const res = await getMyPracticeProjects(u.data.id)
        if (res.success) setProjects(res.data || [])
      }
      if (projectIdParam && !selectedProjectId) setSelectedProjectId(projectIdParam)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={() =>
            navigate('/simulator/practice-stakeholders/register' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))
          }
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListTodo className="h-8 w-8 text-amber-500" />
            Practice Engagement Actions
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Per-stakeholder engagement action plan (simulator)</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <PracticeEngagementActions practiceProjectId={selectedProjectId || null} />
      )}
    </div>
  )
}
