/**
 * Practice Stakeholder Monitoring – Simulator
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { getPracticeStakeholderStats } from '../../services/sim/practiceStakeholderService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'

export default function PracticeStakeholderMonitoring() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadStats()
    else setStats(null)
  }, [selectedProjectId])

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

  const loadStats = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeStakeholderStats(selectedProjectId)
      if (res.success) setStats(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/simulator/practice-stakeholders/register' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-teal-500" />
            Practice Stakeholder Monitoring
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Monitor practice engagement (simulator)</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name}</option>))}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div> : !selectedProjectId ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">Select a project.</div> : !stats ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">No stats.</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total stakeholders</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalStakeholders}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.activeStakeholders}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Analysed</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAnalysis}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Engagement plans</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalEngagement}</div>
          </div>
          {stats.byAttitude && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By attitude</h3>
              <div className="flex flex-wrap gap-4">
                <span>Champion: {stats.byAttitude.champion ?? 0}</span>
                <span>Supporter: {stats.byAttitude.supporter ?? 0}</span>
                <span>Neutral: {stats.byAttitude.neutral ?? 0}</span>
                <span>Critic: {stats.byAttitude.critic ?? 0}</span>
                <span>Blocker: {stats.byAttitude.blocker ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
