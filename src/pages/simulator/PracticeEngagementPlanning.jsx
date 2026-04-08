/**
 * Practice Engagement Planning – Simulator
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { getPracticeEngagementPlans } from '../../services/sim/practiceStakeholderService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

export default function PracticeEngagementPlanning() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [plans, setPlans] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadPlans()
    else setPlans([])
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

  const loadPlans = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeEngagementPlans({ practice_project_id: selectedProjectId })
      if (res.success) setPlans(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const exportColumns = [
    { key: 'stakeholder_name', label: 'Stakeholder' },
    { key: 'engagement_priority', label: 'Priority' },
    { key: 'engagement_frequency', label: 'Frequency' },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/simulator/practice-stakeholders/register' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-500" />
            Practice Engagement Planning
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Engagement plans (simulator)</p>
        </div>
        <ExportListMenu columns={exportColumns} data={plans.map(p => ({ stakeholder_name: p.practice_stakeholder?.stakeholder_name || '', engagement_priority: p.engagement_priority, engagement_frequency: p.engagement_frequency }))} baseFilename="Practice-Engagement-Plans" disabled={!plans.length} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name}</option>))}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div> : !selectedProjectId ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">Select a project.</div> : plans.length === 0 ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">No engagement plans yet.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{p.practice_stakeholder?.stakeholder_name || '—'}</td>
                  <td className="px-6 py-4 text-sm">{p.engagement_priority || '—'}</td>
                  <td className="px-6 py-4 text-sm">{p.engagement_frequency || '—'}</td>
                  <td className="px-6 py-4 text-sm">{p.current_engagement_level || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
