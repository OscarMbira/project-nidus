/**
 * Practice Stakeholder Register – Simulator (same as PracticeStakeholders at register route).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Plus, ArrowLeft, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPracticeStakeholders } from '../../services/sim/practiceStakeholderService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

const COLUMNS = [
  { key: 'stakeholder_name', label: 'Name' },
  { key: 'stakeholder_organization', label: 'Organization' },
  { key: 'stakeholder_type', label: 'Type' },
  { key: 'stakeholder_status', label: 'Status' },
]

export default function PracticeStakeholderRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [stakeholders, setStakeholders] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadStakeholders()
    else setStakeholders([])
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

  const loadStakeholders = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const result = await getPracticeStakeholders(selectedProjectId)
      if (result.success) setStakeholders(result.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/simulator/practice-stakeholders' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-500" />
            Practice Stakeholder Register
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Identify practice stakeholders</p>
        </div>
        <ExportListMenu columns={COLUMNS} data={stakeholders} baseFilename="Practice-Stakeholder-Register" disabled={!stakeholders.length} />
        <Link to="/simulator/practice-stakeholders/on-hold" className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Clock className="h-5 w-5" /> Draft queue
        </Link>
        <button onClick={() => navigate(`/simulator/practice-stakeholders/create?projectId=${selectedProjectId}`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50" disabled={!selectedProjectId}>
          <Plus className="h-5 w-5" /> Add Stakeholder
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>))}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div> : !selectedProjectId ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">Select a project.</div> : stakeholders.length === 0 ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">No stakeholders.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stakeholders.map(s => (
                <tr key={s.id} onClick={() => navigate(`/simulator/practice-stakeholders/${s.id}?projectId=${selectedProjectId}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{s.stakeholder_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{s.stakeholder_organization || '—'}</td>
                  <td className="px-6 py-4 text-sm">{s.stakeholder_type || '—'}</td>
                  <td className="px-6 py-4 text-sm">{s.stakeholder_status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
