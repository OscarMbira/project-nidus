/**
 * v1355 — create and edit a practice risk, including the three-point ranges.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import QuantifiedRiskFields from '@nidus/planning/screens/qra/QuantifiedRiskFields.jsx'
import { quantifiedProblem } from '@nidus/planning/engine/qra/riskExposure.js'
import { simDb } from '../../services/supabase/supabaseClient'
import { createPracticeRisk, getPracticeRiskById, updatePracticeRisk } from '../../services/sim/practiceRiskService'

const HELP_KEYS = [
  'risk_title', 'risk_description', 'probability', 'impact',
  'pre_probability_percent', 'post_probability_percent',
  'pre_cost_min', 'pre_cost_ml', 'pre_cost_max', 'post_cost_min', 'post_cost_ml', 'post_cost_max',
  'pre_schedule_days_min', 'pre_schedule_days_ml', 'pre_schedule_days_max',
  'post_schedule_days_min', 'post_schedule_days_ml', 'post_schedule_days_max',
  'impact_distribution', 'qra_group_id',
].map((name) => `sim.practice_risks.${name}`)

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

const EMPTY = {
  risk_title: '',
  risk_description: '',
  probability: 3,
  impact: 3,
  pre_probability: 3,
  pre_probability_percent: '',
  pre_cost_min: '', pre_cost_ml: '', pre_cost_max: '',
  pre_schedule_days_min: '', pre_schedule_days_ml: '', pre_schedule_days_max: '',
  post_probability: 3,
  post_probability_percent: '',
  post_cost_min: '', post_cost_ml: '', post_cost_max: '',
  post_schedule_days_min: '', post_schedule_days_ml: '', post_schedule_days_max: '',
  impact_distribution: 'triangular',
  qra_group_id: '',
}

function blankNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function PracticeRiskForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get('projectId')
  const { showSuccess, modal } = useSuccessModal()
  const [form, setForm] = useState(EMPTY)
  const [loaded, setLoaded] = useState(null)
  const [tab, setTab] = useState('details')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [snapshot, setSnapshot] = useState(JSON.stringify(EMPTY))
  const dirty = JSON.stringify(form) !== snapshot
  useUnsavedChangesGuard(dirty)

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    getPracticeRiskById(id).then((result) => {
      if (cancelled || !result.success) {
        if (!cancelled) setError(result.error || 'Could not load the risk.')
        return
      }
      const risk = result.data
      const next = {
        ...EMPTY,
        risk_title: risk.risk_title || '',
        risk_description: risk.risk_description || '',
        probability: risk.probability || risk.pre_probability || 3,
        impact: risk.impact || 3,
        pre_probability: risk.pre_probability || risk.probability || 3,
        pre_probability_percent: risk.pre_probability_percent ?? '',
        pre_cost_min: risk.pre_cost_min ?? '',
        pre_cost_ml: risk.pre_cost_ml ?? risk.pre_cost_impact ?? '',
        pre_cost_max: risk.pre_cost_max ?? '',
        pre_schedule_days_min: risk.pre_schedule_days_min ?? '',
        pre_schedule_days_ml: risk.pre_schedule_days_ml ?? risk.pre_schedule_impact_days ?? '',
        pre_schedule_days_max: risk.pre_schedule_days_max ?? '',
        post_probability: risk.post_probability || 3,
        post_probability_percent: risk.post_probability_percent ?? '',
        post_cost_min: risk.post_cost_min ?? '',
        post_cost_ml: risk.post_cost_ml ?? '',
        post_cost_max: risk.post_cost_max ?? '',
        post_schedule_days_min: risk.post_schedule_days_min ?? '',
        post_schedule_days_ml: risk.post_schedule_days_ml ?? '',
        post_schedule_days_max: risk.post_schedule_days_max ?? '',
        impact_distribution: risk.impact_distribution || 'triangular',
        qra_group_id: risk.qra_group_id || '',
      }
      setForm(next)
      setSnapshot(JSON.stringify(next))
      setLoaded(risk)
    })
    return () => { cancelled = true }
  }, [id])

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value, ...(field === 'pre_probability' ? { probability: value } : {}) }))
  }

  async function save() {
    setError(null)
    if (!form.risk_title.trim() || !form.risk_description.trim()) {
      setError('Enter a title and a description.')
      return
    }
    const costProblem = quantifiedProblem(form, { percentKey: 'pre_probability_percent', minKey: 'pre_cost_min', mlKey: 'pre_cost_ml', maxKey: 'pre_cost_max' })
    const dayProblem = quantifiedProblem(form, { percentKey: 'pre_probability_percent', minKey: 'pre_schedule_days_min', mlKey: 'pre_schedule_days_ml', maxKey: 'pre_schedule_days_max' })
    if (costProblem || dayProblem) {
      setError(costProblem || dayProblem)
      return
    }
    const payload = {
      risk_title: form.risk_title.trim(),
      risk_description: form.risk_description.trim(),
      probability: Number(form.probability) || 3,
      impact: Number(form.impact) || 3,
      pre_probability: Number(form.pre_probability || form.probability) || 3,
      pre_probability_percent: blankNumber(form.pre_probability_percent),
      pre_cost_min: blankNumber(form.pre_cost_min),
      pre_cost_ml: blankNumber(form.pre_cost_ml),
      pre_cost_max: blankNumber(form.pre_cost_max),
      pre_cost_impact: blankNumber(form.pre_cost_ml),
      pre_schedule_days_min: blankNumber(form.pre_schedule_days_min),
      pre_schedule_days_ml: blankNumber(form.pre_schedule_days_ml),
      pre_schedule_days_max: blankNumber(form.pre_schedule_days_max),
      pre_schedule_impact_days: form.pre_schedule_days_ml === '' ? null : Math.round(Number(form.pre_schedule_days_ml)),
      post_probability: Number(form.post_probability) || null,
      post_probability_percent: blankNumber(form.post_probability_percent),
      post_cost_min: blankNumber(form.post_cost_min),
      post_cost_ml: blankNumber(form.post_cost_ml),
      post_cost_max: blankNumber(form.post_cost_max),
      post_schedule_days_min: blankNumber(form.post_schedule_days_min),
      post_schedule_days_ml: blankNumber(form.post_schedule_days_ml),
      post_schedule_days_max: blankNumber(form.post_schedule_days_max),
      impact_distribution: form.impact_distribution || 'triangular',
      qra_group_id: form.qra_group_id || null,
    }
    setSaving(true)
    const result = id ? await updatePracticeRisk(id, payload) : await createPracticeRisk(projectId, payload)
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Could not save the risk.')
      return
    }
    setSnapshot(JSON.stringify(form))
    const saved = result.data
    showSuccess({
      recordId: saved?.risk_reference || saved?.risk_code || saved?.id,
      operation: id ? 'updated' : 'created',
      subject: 'practice risk',
      message: 'The risk and its ranges are saved.',
      onOk: id ? undefined : () => navigate(`/simulator/practice-risk-register/${saved.id}?projectId=${projectId}`),
    })
    if (id) setLoaded(saved)
  }

  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 max-w-4xl">
        <button type="button" onClick={() => navigate(-1)} data-help="exempt" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{id ? 'Edit practice risk' : 'New practice risk'}</h1>
        {error && <p className="text-sm text-red-700 dark:text-red-300 mb-3" role="alert">{error}</p>}
        <DetailAuditTabList activeTab={tab} onChange={setTab} />
        {tab === 'audit' ? (
          loaded ? (
            <AuditDetailsPanel>
              <AuditCard title="Identity"><AuditField label="Title" value={loaded.risk_title} /></AuditCard>
              <AuditCard title="Classification"><AuditField label="Status" value={loaded.status} /></AuditCard>
              <AuditCard title="Record history"><AuditField label="Updated" value={loaded.updated_at} /></AuditCard>
            </AuditDetailsPanel>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-200 py-6">Audit details appear after this record is saved.</p>
          )
        ) : (
          <div className="space-y-4 mt-4">
            <div>
              <FieldLabelWithHelp helpKey="sim.practice_risks.risk_title" htmlFor="pr-title" required>Title</FieldLabelWithHelp>
              <input id="pr-title" className={inputClass} value={form.risk_title} onChange={(e) => set('risk_title', e.target.value)} />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="sim.practice_risks.risk_description" htmlFor="pr-desc" required>Description</FieldLabelWithHelp>
              <textarea id="pr-desc" rows={4} className={inputClass} value={form.risk_description} onChange={(e) => set('risk_description', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabelWithHelp helpKey="sim.practice_risks.probability" htmlFor="pr-prob" required>Probability (1–5)</FieldLabelWithHelp>
                <input id="pr-prob" type="range" min="1" max="5" value={form.probability} onChange={(e) => set('probability', Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <FieldLabelWithHelp helpKey="sim.practice_risks.impact" htmlFor="pr-impact" required>Impact (1–5)</FieldLabelWithHelp>
                <input id="pr-impact" type="range" min="1" max="5" value={form.impact} onChange={(e) => set('impact', Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Before the response</h2>
            <QuantifiedRiskFields prefix="pre" values={form} onChange={set} helpTable="sim.practice_risks" projectId={projectId} db={simDb} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">After the response</h2>
            <QuantifiedRiskFields prefix="post" values={form} onChange={set} helpTable="sim.practice_risks" showShape={false} />
            <button type="button" onClick={save} disabled={saving || (id && !loaded)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save risk'}
            </button>
          </div>
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}
