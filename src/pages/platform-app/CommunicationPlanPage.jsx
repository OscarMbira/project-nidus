/**
 * Communication Plans Page – Platform (Engage): Plans + Log tabs.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, List, Plus } from 'lucide-react'
import { getCommunicationPlans, saveCommunicationPlan } from '../../services/stakeholderService'
import CommunicationPlanForm from '../../components/stakeholders/CommunicationPlanForm'
import CommunicationLog from '../../components/stakeholders/CommunicationLog'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function CommunicationPlanPage() {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('plans')
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) loadPlans()
    else setPlans([])
  }, [projectId])

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

  const loadPlans = async () => {
    if (!projectId) return
    try {
      const data = await getCommunicationPlans({ project_id: projectId })
      setPlans(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSavePlan = async (formData) => {
    try {
      await saveCommunicationPlan(formData, editingPlan?.id)
      setShowForm(false)
      setEditingPlan(null)
      loadPlans()
    } catch (e) {
      alert(e.message)
    }
  }

  const exportColumns = [
    { key: 'plan_name', label: 'Plan' },
    { key: 'plan_status', label: 'Status' },
    { key: 'plan_start_date', label: 'Start' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/platform/stakeholders/register')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-500" />
            Communication Plans
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Plan and log stakeholder communications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('plans')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tab === 'plans' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><FileText className="h-4 w-4" /> Plans</button>
          <button onClick={() => setTab('log')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tab === 'log' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><List className="h-4 w-4" /> Log</button>
          {tab === 'plans' && (
            <>
              <ExportListMenu columns={exportColumns} data={plans.map(p => ({ plan_name: p.plan_name, plan_status: p.plan_status, plan_start_date: p.plan_start_date }))} baseFilename="Communication-Plans" disabled={!plans.length} />
              <button onClick={() => { setEditingPlan(null); setShowForm(true) }} disabled={!projectId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"><Plus className="h-5 w-5" /> Add Plan</button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>))}
        </select>
      </div>

      {!projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">Select a project.</div>
      ) : tab === 'plans' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Start</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{p.plan_name}</td>
                  <td className="px-6 py-4 text-sm">{p.plan_status}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{p.plan_start_date ? new Date(p.plan_start_date).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => { setEditingPlan(p); setShowForm(true) }} className="text-blue-600 dark:text-blue-400">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 && <div className="p-8 text-center text-gray-500">No plans. Add one above.</div>}
        </div>
      ) : (
        <CommunicationLog projectId={projectId} />
      )}

      {showForm && (
        <CommunicationPlanForm plan={editingPlan} projectId={projectId} onSave={handleSavePlan} onCancel={() => { setShowForm(false); setEditingPlan(null) }} />
      )}
    </div>
  )
}
