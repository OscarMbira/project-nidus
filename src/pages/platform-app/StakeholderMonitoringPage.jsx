/**
 * Stakeholder Monitoring Page – Platform (Monitor).
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import StakeholderMonitoringDashboard from '../../components/stakeholders/StakeholderMonitoringDashboard'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function StakeholderMonitoringPage() {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data } = await platformDb.from('projects').select('id, project_name, project_code').eq('is_deleted', false).order('project_name', { ascending: true })
      setProjects(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/platform/stakeholders/register')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-teal-500" />
            Stakeholder Monitoring
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Monitor engagement and attitude</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>))}
        </select>
      </div>

      <StakeholderMonitoringDashboard projectId={projectId} />
    </div>
  )
}
