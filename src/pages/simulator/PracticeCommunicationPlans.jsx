/**
 * Practice Communication Plans – Simulator
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { getPracticeCommunicationPlans, getPracticeCommunicationLog } from '../../services/sim/practiceStakeholderService'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'

export default function PracticeCommunicationPlans() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const [plans, setPlans] = useState([])
  const [log, setLog] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('plans')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      if (tab === 'plans') loadPlans()
      else loadLog()
    } else {
      setPlans([])
      setLog([])
    }
  }, [selectedProjectId, tab])

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
      const res = await getPracticeCommunicationPlans({ practice_project_id: selectedProjectId })
      if (res.success) setPlans(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadLog = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await getPracticeCommunicationLog({ practice_project_id: selectedProjectId })
      if (res.success) setLog(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const exportColumns = [
    { key: 'plan_title', label: 'Plan' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/simulator/practice-stakeholders/register' + (selectedProjectId ? `?projectId=${selectedProjectId}` : ''))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-500" />
            Practice Communication Plans
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Plans and log (simulator)</p>
        </div>
        <button onClick={() => setTab('plans')} className={`px-3 py-2 rounded-lg ${tab === 'plans' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Plans</button>
        <button onClick={() => setTab('log')} className={`px-3 py-2 rounded-lg ${tab === 'log' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Log</button>
        {tab === 'plans' && <ExportListMenu columns={exportColumns} data={plans.map(p => ({ plan_title: p.plan_title, status: p.status }))} baseFilename="Practice-Communication-Plans" disabled={!plans.length} />}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Practice Project</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name}</option>))}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div> : !selectedProjectId ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">Select a project.</div> : tab === 'plans' ? (plans.length === 0 ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">No communication plans yet.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{p.plan_title}</td>
                  <td className="px-6 py-4 text-sm">{p.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )) : (log.length === 0 ? <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">No communication log yet.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {log.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{l.communication_type || '—'}</td>
                  <td className="px-6 py-4 text-sm">{l.sent_date ? new Date(l.sent_date).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4 text-sm">{l.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
