/**
 * Stakeholder Analysis Page – Platform (Understand + Analyse)
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Target, List, Plus, Trash2 } from 'lucide-react'
import { getStakeholders, getStakeholderAnalysis, saveStakeholderAnalysis, deleteStakeholderAnalysis } from '../../services/stakeholderService'
import PowerInterestMatrix from '../../components/stakeholders/PowerInterestMatrix'
import StakeholderAnalysisForm from '../../components/stakeholders/StakeholderAnalysisForm'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { platformDb } from '../../services/supabase/supabaseClient'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function StakeholderAnalysisPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [projectId, setProjectId] = useState(() => (location.state && location.state.projectId) || '')
  const [projects, setProjects] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [analysis, setAnalysis] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matrix')
  const [showForm, setShowForm] = useState(false)
  const [editingAnalysis, setEditingAnalysis] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [pendingStakeholderId, setPendingStakeholderId] = useState(() => (location.state && location.state.stakeholderId) || null)
  const [analysisLoaded, setAnalysisLoaded] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId) {
      setAnalysisLoaded(false)
      loadStakeholders()
      loadAnalysis().then(() => setAnalysisLoaded(true))
    } else {
      setStakeholders([])
      setAnalysis([])
      setAnalysisLoaded(false)
    }
  }, [projectId])

  // Clear nav state so refresh doesn’t re-open form
  useEffect(() => {
    if (location.state?.projectId || location.state?.stakeholderId) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  // After analysis has loaded, open form for pending stakeholder (from matrix "Edit Analysis")
  useEffect(() => {
    if (!pendingStakeholderId || !analysisLoaded || !projectId) return
    const record = analysis.find(a => a.stakeholder_id === pendingStakeholderId)
    setEditingAnalysis(record || { stakeholder_id: pendingStakeholderId })
    setShowForm(true)
    setPendingStakeholderId(null)
  }, [pendingStakeholderId, analysisLoaded, projectId, analysis])

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

  const loadAnalysis = async () => {
    if (!projectId) return
    try {
      const data = await getStakeholderAnalysis({ project_id: projectId })
      setAnalysis(data || [])
      return data || []
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const handleSaveAnalysis = async (formData) => {
    try {
      await saveStakeholderAnalysis(formData, editingAnalysis?.id)
      setShowForm(false)
      setEditingAnalysis(null)
      loadAnalysis()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete analysis for ${record.stakeholder?.stakeholder_name || 'this stakeholder'}?`)) return
    try {
      setDeleting(record.id)
      await deleteStakeholderAnalysis(record.id)
      loadAnalysis()
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const exportColumns = [
    { key: 'stakeholder_name', label: 'Stakeholder' },
    { key: 'power_level', label: 'Power' },
    { key: 'interest_level', label: 'Interest' },
    { key: 'matrix_quadrant', label: 'Quadrant' },
    { key: 'current_attitude', label: 'Attitude' },
    { key: 'engagement_priority', label: 'Priority' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/platform/stakeholders/register')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-amber-500" />
            Stakeholder Analysis
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Power/interest matrix and attitude analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('matrix')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><Target className="h-4 w-4" /> Matrix</button>
          <button onClick={() => setView('list')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><List className="h-4 w-4" /> List</button>
          <ExportListMenu
            columns={exportColumns}
            data={analysis.map(a => ({
              stakeholder_name: a.stakeholder?.stakeholder_name || '',
              power_level: a.power_level,
              interest_level: a.interest_level,
              matrix_quadrant: a.matrix_quadrant || '',
              current_attitude: a.current_attitude || '',
              engagement_priority: a.engagement_priority || '',
            }))}
            baseFilename="Stakeholder-Analysis"
            disabled={!analysis.length}
          />
          <button onClick={() => { setEditingAnalysis(null); setShowForm(true) }} disabled={!projectId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"><Plus className="h-5 w-5" /> Add Analysis</button>
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
      ) : view === 'matrix' ? (
        <PowerInterestMatrix
          projectId={projectId}
          stakeholders={stakeholders}
          refreshTrigger={analysis.length}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
          onEditAnalysis={({ stakeholderId: sid }) => {
            const record = analysis.find(a => a.stakeholder_id === sid)
            setEditingAnalysis(record || { stakeholder_id: sid })
            setShowForm(true)
          }}
          onReposition={async (item, { power_level, interest_level, matrix_quadrant }) => {
            try {
              const payload = {
                project_id: projectId,
                stakeholder_id: item.stakeholder_id || item.stakeholder?.id,
                power_level,
                interest_level,
                matrix_quadrant,
                ...(item.id && {
                  current_attitude: item.current_attitude,
                  desired_attitude: item.desired_attitude,
                  legitimacy_level: item.legitimacy_level,
                  urgency_level: item.urgency_level,
                  salience_class: item.salience_class,
                }),
              }
              await saveStakeholderAnalysis(payload, item.id)
              loadAnalysis()
            } catch (e) {
              console.error(e)
              alert(e?.message || 'Failed to update position')
            }
          }}
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Power</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Interest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quadrant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Attitude</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {analysis.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{a.stakeholder?.stakeholder_name || '—'}</td>
                  <td className="px-6 py-4 text-sm">{a.power_level ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">{a.interest_level ?? '—'}</td>
                  <td className="px-6 py-4 text-sm capitalize">{a.matrix_quadrant?.replace('-', ' ') || '—'}</td>
                  <td className="px-6 py-4 text-sm">{a.current_attitude || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingAnalysis(a); setShowForm(true) }} className="text-blue-600 dark:text-blue-400 mr-2">Edit</button>
                    <button onClick={() => handleDelete(a)} disabled={deleting === a.id} className="text-red-600 dark:text-red-400 disabled:opacity-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {analysis.length === 0 && <div className="p-8 text-center text-gray-500">No analysis records. Add one from the button above.</div>}
        </div>
      )}

      {showForm && (
        <StakeholderAnalysisForm
          analysis={editingAnalysis}
          stakeholderId={editingAnalysis?.stakeholder_id}
          projectId={projectId}
          stakeholders={stakeholders}
          onSave={handleSaveAnalysis}
          onCancel={() => { setShowForm(false); setEditingAnalysis(null) }}
        />
      )}
    </div>
  )
}
