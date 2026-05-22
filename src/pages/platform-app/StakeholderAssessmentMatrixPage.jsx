/**
 * Stakeholder Assessment Matrix – Platform (SEAM CRUD)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, Table2, Plus, List, Target, Search, PauseCircle } from 'lucide-react'
import {
  getStakeholders,
  getStakeholderAssessmentMatrix,
  saveStakeholderAssessmentMatrix,
  deleteStakeholderAssessmentMatrix,
} from '../../services/stakeholderService'
import StakeholderSEAM from '../../components/stakeholders/StakeholderSEAM'
import StakeholderAssessmentMatrixList from '../../components/stakeholders/StakeholderAssessmentMatrixList'
import StakeholderAssessmentMatrixForm from '../../components/stakeholders/StakeholderAssessmentMatrixForm'
import CrudSuccessBanner from '../../components/stakeholders/CrudSuccessBanner'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { mapAssessmentRowToSeamDisplay, prettySeamLevel } from '../../utils/stakeholderSEAMUtils'
import { platformDb } from '../../services/supabase/supabaseClient'

const EXPORT_COLUMNS = [
  { key: 'stakeholder_name', label: 'Stakeholder' },
  { key: 'assessment_date', label: 'Date' },
  { key: 'current_level', label: 'Current' },
  { key: 'desired_level', label: 'Desired' },
  { key: 'gap_summary', label: 'Gap' },
]

export default function StakeholderAssessmentMatrixPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [projectId, setProjectId] = useState(() => location.state?.projectId || '')
  const [projects, setProjects] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matrix')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [success, setSuccess] = useState(null)
  const [draftInitial, setDraftInitial] = useState(null)

  const loadProjects = useCallback(async () => {
    const { data } = await platformDb
      .from('projects')
      .select('id, project_name, project_code')
      .eq('is_deleted', false)
      .order('project_name', { ascending: true })
    setProjects(data || [])
  }, [])

  const loadStakeholders = useCallback(async () => {
    if (!projectId) {
      setStakeholders([])
      return
    }
    const data = await getStakeholders({ project_id: projectId })
    setStakeholders(data || [])
  }, [projectId])

  const loadMatrix = useCallback(async () => {
    if (!projectId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getStakeholderAssessmentMatrix({ project_id: projectId })
      setRecords(data || [])
    } catch (e) {
      console.error(e)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadStakeholders()
    loadMatrix()
  }, [projectId, loadStakeholders, loadMatrix])

  useEffect(() => {
    const draft = location.state?.draftData || location.state?.formData
    if (draft) {
      setDraftInitial(draft)
      if (draft.project_id) setProjectId(draft.project_id)
      setShowForm(true)
      setEditing(draft.id ? draft : null)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  const seamRows = useMemo(() => records.map(mapAssessmentRowToSeamDisplay), [records])

  const handleSave = async (formData) => {
    const saved = await saveStakeholderAssessmentMatrix(formData, editing?.id)
    setShowForm(false)
    setEditing(null)
    setDraftInitial(null)
    setSuccess({
      message: `${editing?.id ? 'Assessment updated' : 'Assessment created'} successfully.`,
      recordId: saved.id,
      operation: editing?.id ? 'update' : 'create',
    })
    loadMatrix()
  }

  const handleDelete = async (record) => {
    const name = record.stakeholder?.stakeholder_name || 'this stakeholder'
    if (!window.confirm(`Remove assessment for ${name}?`)) return
    setDeletingId(record.id)
    try {
      await deleteStakeholderAssessmentMatrix(record.id)
      setSuccess({
        message: 'Assessment deleted.',
        recordId: record.id,
        operation: 'delete',
      })
      loadMatrix()
    } catch (e) {
      alert(e?.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const exportData = records.map((r) => ({
    stakeholder_name: r.stakeholder?.stakeholder_name || '',
    assessment_date: r.assessment_date || '',
    current_level: prettySeamLevel(r.current_level),
    desired_level: prettySeamLevel(r.desired_level),
    gap_summary: r.gap_summary || '',
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/platform/stakeholders/register')}
          className="p-2 hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Table2 className="h-8 w-8 text-amber-500" />
            Stakeholder Assessment Matrix
          </h1>
          <p className="mt-1 text-gray-400">
            Current (C) and desired (D) engagement levels per stakeholder
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            <Target className="h-4 w-4" /> Matrix
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            <List className="h-4 w-4" /> List
          </button>
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={exportData}
            baseFilename="Stakeholder-Assessment-Matrix"
            disabled={!records.length}
          />
          <Link
            to="/platform/stakeholders/assessment-matrix/on-hold"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
          >
            <PauseCircle className="h-4 w-4" /> On hold
          </Link>
          <button
            type="button"
            disabled={!projectId}
            onClick={() => {
              setEditing(null)
              setDraftInitial(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> Add Assessment
          </button>
        </div>
      </div>

      <CrudSuccessBanner
        message={success?.message}
        recordId={success?.recordId}
        operation={success?.operation}
        onDismiss={() => setSuccess(null)}
      />

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
              </option>
            ))}
          </select>
        </div>
        {view === 'list' && (
          <div className="flex-1 min-w-[200px] max-w-md">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Stakeholder or gap…"
                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
              />
            </div>
          </div>
        )}
      </div>

      {!projectId ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center text-gray-400">
          Select a project to manage assessments.
        </div>
      ) : view === 'matrix' ? (
        <StakeholderSEAM
          rows={seamRows}
          loading={loading}
          onEdit={(row) => {
            setEditing(row.raw || row)
            setShowForm(true)
          }}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
        />
      ) : (
        <StakeholderAssessmentMatrixList
          records={records}
          search={search}
          onEdit={(r) => {
            setEditing(r)
            setShowForm(true)
          }}
          onDelete={handleDelete}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
          deletingId={deletingId}
        />
      )}

      {showForm && (
        <StakeholderAssessmentMatrixForm
          record={editing || draftInitial}
          projectId={projectId}
          stakeholders={stakeholders}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
            setDraftInitial(null)
          }}
        />
      )}
    </div>
  )
}
