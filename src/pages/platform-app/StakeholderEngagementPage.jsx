/**
 * Stakeholder Engagement Page – Platform (Prioritise + Engage)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Plus, LayoutGrid, List } from 'lucide-react'
import { getStakeholders, getStakeholderEngagement, saveStakeholderEngagement } from '../../services/stakeholderService'
import EngagementTracker from '../../components/stakeholders/EngagementTracker'
import EngagementPlanForm from '../../components/stakeholders/EngagementPlanForm'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function StakeholderEngagementPage() {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [engagement, setEngagement] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) {
      loadStakeholders()
      loadEngagement()
    } else {
      setStakeholders([])
      setEngagement([])
    }
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

  const loadStakeholders = async () => {
    if (!projectId) return
    try {
      const data = await getStakeholders({ project_id: projectId })
      setStakeholders(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadEngagement = async () => {
    if (!projectId) return
    try {
      const data = await getStakeholderEngagement({ project_id: projectId })
      setEngagement(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSavePlan = async (formData) => {
    try {
      await saveStakeholderEngagement(formData, editingPlan?.id)
      setShowForm(false)
      setEditingPlan(null)
      loadEngagement()
    } catch (e) {
      alert(e.message)
    }
  }

  const byLevel = {
    leading: engagement.filter(e => e.engagement_level === 'leading'),
    supportive: engagement.filter(e => e.engagement_level === 'supportive'),
    neutral: engagement.filter(e => e.engagement_level === 'neutral' || !e.engagement_level),
    unsupportive: engagement.filter(e => e.engagement_level === 'unsupportive'),
    blocking: engagement.filter(e => e.engagement_level === 'blocking'),
  }

  const exportColumns = [
    { key: 'stakeholder_name', label: 'Stakeholder' },
    { key: 'engagement_level', label: 'Level' },
    { key: 'target_engagement_level', label: 'Target' },
    { key: 'engagement_strategy', label: 'Strategy' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/platform/stakeholders/register')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-500" />
            Engagement Planning
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Prioritise and plan stakeholder engagement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('board')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'board' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><LayoutGrid className="h-4 w-4" /> Board</button>
          <button onClick={() => setView('tracker')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'tracker' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><List className="h-4 w-4" /> Tracker</button>
          <ExportListMenu
            columns={exportColumns}
            data={engagement.map(e => ({
              stakeholder_name: e.stakeholder?.stakeholder_name || '',
              engagement_level: e.engagement_level || '',
              target_engagement_level: e.target_engagement_level || '',
              engagement_strategy: (e.engagement_strategy || '').slice(0, 50),
            }))}
            baseFilename="Stakeholder-Engagement"
            disabled={!engagement.length}
          />
          <button onClick={() => { setEditingPlan(null); setShowForm(true) }} disabled={!projectId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"><Plus className="h-5 w-5" /> Add Plan</button>
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
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['leading', 'supportive', 'neutral', 'unsupportive', 'blocking'].map(level => (
            <div key={level} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-3">{level}</h3>
              <div className="space-y-2">
                {byLevel[level].map(e => (
                  <div key={e.id} className="bg-white dark:bg-gray-800 rounded p-2 text-sm shadow">
                    <div className="font-medium text-gray-900 dark:text-white">{e.stakeholder?.stakeholder_name || '—'}</div>
                    <div className="text-xs text-gray-500">Target: {e.target_engagement_level || '—'}</div>
                    <button onClick={() => { setEditingPlan(e); setShowForm(true) }} className="text-blue-600 text-xs mt-1">Edit</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EngagementTracker projectId={projectId} stakeholders={stakeholders} />
      )}

      {showForm && (
        <EngagementPlanForm
          plan={editingPlan}
          stakeholderId={editingPlan?.stakeholder_id}
          projectId={projectId}
          stakeholders={stakeholders}
          onSave={handleSavePlan}
          onCancel={() => { setShowForm(false); setEditingPlan(null) }}
        />
      )}
    </div>
  )
}
