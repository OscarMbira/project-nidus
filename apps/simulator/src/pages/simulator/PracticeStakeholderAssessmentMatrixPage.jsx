/**
 * Practice Stakeholder Assessment Matrix – Simulator
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, Table2, Plus, List, Target, Search, PauseCircle } from 'lucide-react'
import {
  getPracticeStakeholderAssessmentMatrix,
  deletePracticeStakeholderAssessmentMatrix,
} from '../../services/sim/practiceStakeholderService'
import StakeholderSEAM from '../../components/stakeholders/StakeholderSEAM'
import StakeholderAssessmentMatrixList from '../../components/stakeholders/StakeholderAssessmentMatrixList'
import { assessmentFormPath } from '@nidus/shared/utils/assessmentMatrixRoute'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { mapAssessmentRowToSeamDisplay, prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import { simDb } from '../../services/supabase/supabaseClient'

const EXPORT_COLUMNS = [
  { key: 'stakeholder_name', label: 'Stakeholder' },
  { key: 'assessment_date', label: 'Date' },
  { key: 'current_level', label: 'Current' },
  { key: 'desired_level', label: 'Desired' },
  { key: 'gap_summary', label: 'Gap' },
]

export default function PracticeStakeholderAssessmentMatrixPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [projectId, setProjectId] = useState(() => location.state?.practice_project_id || location.state?.projectId || '')
  const [projects, setProjects] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matrix')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const matrixBase = '/simulator/practice-stakeholders/assessment-matrix'

  const loadProjects = useCallback(async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) return
      const { data: urow } = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!urow?.id) return
      const res = await getMyPracticeProjects(urow.id)
      if (res.success) setProjects(res.data || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadMatrix = useCallback(async () => {
    if (!projectId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await getPracticeStakeholderAssessmentMatrix({ practice_project_id: projectId })
      if (!res.success) throw new Error(res.error)
      setRecords(
        (res.data || []).map((r) => ({
          ...r,
          stakeholder_id: r.practice_stakeholder_id,
          project_id: r.practice_project_id,
          stakeholder: r.practice_stakeholder,
        }))
      )
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
    const name = record.stakeholder?.stakeholder_name || record.practice_stakeholder?.stakeholder_name || record.stakeholder_name || 'this stakeholder'
    if (!window.confirm(`Remove assessment for ${name}?`)) return
    setDeletingId(record.id)
    try {
      const res = await deletePracticeStakeholderAssessmentMatrix(record.id)
      if (!res.success) throw new Error(res.error)
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/simulator/practice-stakeholders/register')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Table2 className="h-8 w-8 text-amber-500" />
            Stakeholder Assessment Matrix
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Practice SEAM — current vs desired engagement</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <Target className="h-4 w-4" /> Matrix
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" /> List
          </button>
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={exportData}
            baseFilename="Practice-Assessment-Matrix"
            disabled={!records.length}
          />
          <Link
            to="/simulator/practice-stakeholders/assessment-matrix/on-hold"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
          >
            <PauseCircle className="h-4 w-4" /> On hold
          </Link>
          <button
            type="button"
            disabled={!projectId}
            onClick={() => navigate(assessmentFormPath(matrixBase, 'new'), { state: { projectId } })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> Add Assessment
          </button>
        </div>
      </div>

      {successModal}

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Practice project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {!projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center text-gray-500">
          Select a practice project.
        </div>
      ) : view === 'matrix' ? (
        <StakeholderSEAM
          rows={seamRows}
          loading={loading}
          onView={(row) => openAssessment(row, 'view')}
          onEdit={(row) => openAssessment(row, 'edit')}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ) : (
        <StakeholderAssessmentMatrixList
          records={records}
          search={search}
          onView={(row) => openAssessment(row, 'view')}
          onEdit={(row) => openAssessment(row, 'edit')}
          onDelete={handleDelete}
          deletingId={deletingId}
          pageId="practice-stakeholder-assessment-matrix"
        />
      )}
    </div>
  )
}
