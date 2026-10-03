/**
 * Full-page add, view, or edit for one practice assessment.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import StakeholderAssessmentMatrixForm from '../../components/stakeholders/StakeholderAssessmentMatrixForm'
import {
  getPracticeStakeholders,
  getPracticeStakeholderAssessmentByRouteKey,
  savePracticeStakeholderAssessmentMatrix,
} from '../../services/sim/practiceStakeholderService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { assessmentRecordKey } from '@nidus/shared/utils/assessmentMatrixRoute'

const LIST_PATH = '/simulator/practice-stakeholders/assessment-matrix'

function asFormRecord(row) {
  if (!row) return null
  return {
    ...row,
    id: row.id,
    stakeholder_id: row.practice_stakeholder_id || row.stakeholder_id,
    project_id: row.practice_project_id || row.project_id,
    stakeholder: row.practice_stakeholder || row.stakeholder,
    stakeholder_reference: row.practice_stakeholder?.stakeholder_reference || row.stakeholder_reference,
  }
}

export default function PracticeStakeholderAssessmentMatrixFormPage() {
  const navigate = useNavigate()
  const { recordKey } = useParams()
  const { pathname, state } = useLocation()
  const projectId = state?.projectId || state?.practice_project_id || ''
  const readOnly = pathname.includes('/assessment-matrix/view/')
  const isCreate = pathname.endsWith('/new')
  const { showSuccess, modal } = useSuccessModal()
  const [record, setRecord] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(!isCreate)
  const [loadError, setLoadError] = useState('')
  const draftRef = useRef(state?.formData || state?.draftData || null)
  const loadedKeyRef = useRef('')
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  useEffect(() => {
    if (!isCreate) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const normalizedDraft = draftRef.current ? asFormRecord(draftRef.current) : null
        const draftProjectId = normalizedDraft?.project_id || projectId
        const peopleRes = draftProjectId ? await getPracticeStakeholders(draftProjectId) : { success: true, data: [] }
        if (cancelled) return
        setStakeholders(peopleRes.success ? (peopleRes.data || []) : [])
        setRecord(normalizedDraft)
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Could not load stakeholders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isCreate, projectId])

  useEffect(() => {
    if (isCreate) return undefined
    const decodedKey = decodeURIComponent(recordKey || '')
    if (loadedKeyRef.current && loadedKeyRef.current === decodedKey) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const loadedRes = await getPracticeStakeholderAssessmentByRouteKey(decodedKey)
        if (cancelled) return
        if (!loadedRes.success) throw new Error(loadedRes.error)
        const loaded = asFormRecord(loadedRes.data)
        if (!loaded) {
          setLoadError('This assessment was not found.')
          setRecord(null)
          setStakeholders([])
          return
        }
        const person = loaded.stakeholder || loaded.practice_stakeholder
        setRecord(loaded)
        setStakeholders(person?.id ? [person] : [])
        const key = assessmentRecordKey(loaded)
        loadedKeyRef.current = key || decodedKey
        if (key && key !== decodedKey) {
          const action = readOnly ? 'view' : 'edit'
          navigate(`${LIST_PATH}/${action}/${encodeURIComponent(key)}`, {
            replace: true,
            state: { projectId: loaded.project_id || projectIdRef.current },
          })
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Could not load this assessment')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [recordKey, isCreate, readOnly, navigate])

  const backToList = () => navigate(LIST_PATH, { state: { projectId: record?.project_id || projectId } })

  const handleSave = async (formData) => {
    const res = await savePracticeStakeholderAssessmentMatrix({
      practice_project_id: formData.project_id || projectId,
      practice_stakeholder_id: formData.stakeholder_id,
      assessment_date: formData.assessment_date,
      current_level: formData.current_level,
      desired_level: formData.desired_level,
      notes: formData.notes,
    }, record?.id)
    if (!res.success) throw new Error(res.error)
    const person = stakeholders.find((row) => row.id === formData.stakeholder_id)
    showSuccess({
      recordId: person?.stakeholder_reference || person?.stakeholder_name || 'Assessment',
      operation: record?.id ? 'updated' : 'created',
      message: 'Assessment saved.',
      onOk: backToList,
    })
    setRecord((current) => asFormRecord({ ...(current || {}), ...(res.data || {}), ...formData }))
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mx-auto mb-4 max-w-3xl">
        <Link
          to={LIST_PATH}
          state={{ projectId: record?.project_id || projectId }}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assessment matrix
        </Link>
      </div>
      {loading ? (
        <p className="px-2 text-gray-700 dark:text-gray-200">Loading…</p>
      ) : loadError ? (
        <p className="px-2 text-sm text-red-700 dark:text-red-300">{loadError}</p>
      ) : (
        <StakeholderAssessmentMatrixForm
          record={record}
          projectId={record?.project_id || projectId}
          stakeholders={stakeholders}
          readOnly={readOnly}
          entityType="practice_stakeholder_assessment_matrix"
          formRoute={LIST_PATH}
          onSave={handleSave}
          onCancel={backToList}
        />
      )}
    </div>
  )
}
