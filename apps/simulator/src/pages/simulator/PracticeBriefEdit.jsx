/**
 * Practice Brief Edit Page (Simulator).
 * v1344 slice 3: the practice brief's own columns in tabs — Definition · Scope · Approach ·
 * Dates & Milestones (milestones from the practice project's Milestones register, A5) · Audit.
 * Unsaved-changes guard (rule 52); success confirmation (rule 16).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getPracticeBriefById, updatePracticeBrief } from '../../services/sim/practiceBriefService'
import { listMilestones } from '../../services/milestoneService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import ProjectMilestonesSummary from '@nidus/ui/ProjectMilestonesSummary'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useToastContext } from '@nidus/shared/context/ToastContext'

const TABS = [
  { value: 'definition', label: 'Definition' },
  { value: 'scope', label: 'Scope' },
  { value: 'approach', label: 'Approach' },
  { value: 'dates', label: 'Dates & Milestones' },
  { value: 'audit', label: 'Audit details' },
]
const TEXT_FIELDS = ['brief_title', 'brief_description', 'project_definition', 'project_scope', 'out_of_scope',
  'project_approach', 'quality_approach', 'risk_approach', 'target_start_date', 'target_end_date']

const input = 'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

function toForm(data) {
  const f = Object.fromEntries(TEXT_FIELDS.map((k) => [k, data?.[k] ?? '']))
  f.project_objectives = Array.isArray(data?.project_objectives) ? data.project_objectives.join('\n') : (data?.project_objectives || '')
  return f
}

export default function PracticeBriefEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const { showSuccess, modal } = useSuccessModal()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(() => toForm({}))
  const [snapshot, setSnapshot] = useState(null)
  const [record, setRecord] = useState(null)
  const [tab, setTab] = useState('definition')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const isDirty = useMemo(() => snapshot !== null && JSON.stringify(formData) !== snapshot, [formData, snapshot])
  useUnsavedChangesGuard(isDirty && !saving)

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    getPracticeBriefById(id)
      .then((result) => {
        if (cancelled || !result.success) return
        const f = toForm(result.data)
        setRecord(result.data)
        setFormData(f)
        setSnapshot(JSON.stringify(f))
      })
      .catch((error) => console.error('Error loading brief:', error))
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (tab !== 'audit' || !record) return undefined
    let cancelled = false
    resolveAuditUserLabels(simDb, [record.created_by, record.updated_by])
      .then((labels) => { if (!cancelled) setAuditUserLabels(labels || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tab, record])

  const set = (name) => (e) => setFormData((f) => ({ ...f, [name]: e.target.value }))
  const practiceProjectId = record?.practice_project_id || projectId || null
  const loadMilestones = useCallback((pid) => listMilestones(pid), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.brief_title.trim()) {
      setTab('definition')
      toast.error('Brief title is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, formData[k] === '' ? null : formData[k]])),
        brief_title: formData.brief_title.trim(),
        project_objectives: formData.project_objectives.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
      }
      const result = await updatePracticeBrief(id, payload)
      if (!result.success) throw new Error(result.error || 'Could not save the brief')
      setSnapshot(JSON.stringify(formData))
      showSuccess({
        recordId: formData.brief_title,
        operation: 'updated',
        message: 'Practice brief saved.',
        onOk: () => navigate(`/simulator/practice-briefs/${id}${projectId ? `?projectId=${projectId}` : ''}`),
      })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button type="button" onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Practice Brief</h1>
      <DetailAuditTabList activeTab={tab} onChange={setTab} ariaLabel="Practice brief sections" tabs={TABS} />

      {tab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this brief is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this Project Brief.">
              <AuditCard title="Identity" description="How this brief is labelled.">
                <AuditField label="Title" value={record.brief_title} />
              </AuditCard>
              <AuditCard title="Classification" description="Approval status.">
                <AuditField label="Approved" value={record.is_approved ? 'Yes' : 'No'} />
              </AuditCard>
              <AuditCard title="Record history" description="When this brief was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {tab === 'definition' && (
            <>
              <div>
                <label htmlFor="brief_title" className={labelCls}>Brief Title <span className="text-red-500">*</span></label>
                <input id="brief_title" className={input} required value={formData.brief_title} onChange={set('brief_title')} />
              </div>
              <div>
                <label htmlFor="brief_description" className={labelCls}>Description</label>
                <textarea id="brief_description" rows={3} className={input} value={formData.brief_description} onChange={set('brief_description')} />
              </div>
              <div>
                <label htmlFor="project_definition" className={labelCls}>Project definition</label>
                <textarea id="project_definition" rows={4} className={input} value={formData.project_definition} onChange={set('project_definition')}
                  placeholder="What the project must achieve and its background" />
              </div>
              <div>
                <label className={labelCls}>Objectives</label>
                <MultiLineListInput viewModeId="practice-brief-objectives" id="practice_brief_objectives" value={formData.project_objectives}
                  onChange={(v) => setFormData((f) => ({ ...f, project_objectives: v }))} ariaLabelPrefix="objective" itemColumnLabel="Objective" />
              </div>
            </>
          )}
          {tab === 'scope' && (
            <>
              <div>
                <label htmlFor="project_scope" className={labelCls}>In scope</label>
                <textarea id="project_scope" rows={5} className={input} value={formData.project_scope} onChange={set('project_scope')} />
              </div>
              <div>
                <label htmlFor="out_of_scope" className={labelCls}>Out of scope</label>
                <textarea id="out_of_scope" rows={4} className={input} value={formData.out_of_scope} onChange={set('out_of_scope')} />
              </div>
            </>
          )}
          {tab === 'approach' && (
            <>
              <div>
                <label htmlFor="project_approach" className={labelCls}>Project approach</label>
                <textarea id="project_approach" rows={4} className={input} value={formData.project_approach} onChange={set('project_approach')} />
              </div>
              <div>
                <label htmlFor="quality_approach" className={labelCls}>Quality approach</label>
                <textarea id="quality_approach" rows={3} className={input} value={formData.quality_approach} onChange={set('quality_approach')} />
              </div>
              <div>
                <label htmlFor="risk_approach" className={labelCls}>Risk approach</label>
                <textarea id="risk_approach" rows={3} className={input} value={formData.risk_approach} onChange={set('risk_approach')} />
              </div>
            </>
          )}
          {tab === 'dates' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target_start_date" className={labelCls}>Target start</label>
                  <input id="target_start_date" type="date" className={input} value={formData.target_start_date || ''} onChange={set('target_start_date')} />
                </div>
                <div>
                  <label htmlFor="target_end_date" className={labelCls}>Target end</label>
                  <input id="target_end_date" type="date" className={input} value={formData.target_end_date || ''} onChange={set('target_end_date')} />
                </div>
              </div>
              <ProjectMilestonesSummary
                projectId={practiceProjectId}
                loadMilestones={loadMilestones}
                manageHref={practiceProjectId ? `/simulator/practice-projects/${practiceProjectId}/milestones` : null}
              />
            </>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
      {modal}
    </div>
  )
}
