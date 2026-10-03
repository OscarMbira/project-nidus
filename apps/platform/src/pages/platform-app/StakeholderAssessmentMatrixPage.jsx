/**
 * Stakeholder Assessment Matrix – Platform (SEAM CRUD)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, Table2, Plus, List, Target, Search, PauseCircle } from 'lucide-react'
import {
  getStakeholderAssessmentMatrix,
  deleteStakeholderAssessmentMatrix,
} from '../../services/stakeholderService'
import StakeholderSEAM from '../../components/stakeholders/StakeholderSEAM'
import StakeholderAssessmentMatrixList from '../../components/stakeholders/StakeholderAssessmentMatrixList'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { assessmentFormPath } from '@nidus/shared/utils/assessmentMatrixRoute'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { mapAssessmentRowToSeamDisplay, prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { useCurrentProject } from '../../context/CurrentProjectContext'

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
  const { projects: assignedProjects, currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const [projectId, setProjectId] = useState(() => location.state?.projectId || '')
  const projects = assignedProjects.map((p) => ({
    id: p.projectId,
    project_name: p.projectName,
    project_code: p.projectCode,
  }))
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matrix')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const matrixBase = '/platform/stakeholders/assessment-matrix'

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
    if (projectCtxLoading || projectId || !currentProjectId) return
    setProjectId(currentProjectId)
  }, [projectCtxLoading, currentProjectId, projectId])

  useEffect(() => {
    loadMatrix()
  }, [projectId, loadMatrix])

  useEffect(() => {
    const draft = location.state?.draftData || location.state?.formData
    if (!draft) return
    navigate(assessmentFormPath(matrixBase, 'new'), { replace: true, state: location.state })
  }, [])

  const seamRows = useMemo(() => records.map(mapAssessmentRowToSeamDisplay), [records])

  const openAssessment = (record, action) => {
    navigate(assessmentFormPath(matrixBase, action, record), { state: { projectId } })
  }

  const handleDelete = async (record) => {
    const name = record.stakeholder?.stakeholder_name || record.stakeholder_name || 'this stakeholder'
    if (!window.confirm(`Remove assessment for ${name}?`)) return
    setDeletingId(record.id)
    try {
      await deleteStakeholderAssessmentMatrix(record.id)
      showSuccess({
        message: 'Assessment deleted.',
        recordId: record.stakeholder?.stakeholder_reference || record.stakeholder_reference || name,
        operation: 'deleted',
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
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Table2 className="h-8 w-8 text-amber-500" />
            Stakeholder Assessment Matrix
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Current (C) and desired (D) engagement levels per stakeholder
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
            }`}
          >
            <Target className="h-4 w-4" /> Matrix
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
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
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <PauseCircle className="h-4 w-4" /> On hold
          </Link>
          <button
            type="button"
            disabled={!projectId}
            onClick={() => navigate(assessmentFormPath(matrixBase, 'new'), { state: { projectId } })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> Add Assessment
          </button>
        </div>
      </div>

      {successModal}

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Stakeholder or gap…"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {!projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-700 dark:text-gray-200">
          Select a project to manage assessments.
        </div>
      ) : view === 'matrix' ? (
        <StakeholderSEAM
          rows={seamRows}
          loading={loading}
          onView={(row) => openAssessment(row, 'view')}
          onEdit={(row) => openAssessment(row, 'edit')}
          onDelete={handleDelete}
          deletingId={deletingId}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
        />
      ) : (
        <StakeholderAssessmentMatrixList
          records={records}
          search={search}
          onView={(row) => openAssessment(row, 'view')}
          onEdit={(row) => openAssessment(row, 'edit')}
          onDelete={handleDelete}
          onStakeholderClick={(id) => navigate(`/platform/stakeholders/register/view/${id}`)}
          deletingId={deletingId}
        />
      )}
    </div>
  )
}
