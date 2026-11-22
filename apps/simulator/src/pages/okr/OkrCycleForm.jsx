/**
 * OKR Cycle — create/edit form (GAP-03, v963 Phase 8). Simulator mirror of
 * apps/platform/src/pages/okr/OkrCycleForm.jsx. Routed page per rule 65.
 */
import { useEffect, useMemo, useState } from 'react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { DetailAuditTabList, RecordAuditDetails } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getCycle, createCycle, updateCycle } from '../../services/okrService'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'
const BASE = '/simulator/pm/okr/cycles'

function OkrCycleFormBody() {
  const { cycleId } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!cycleId

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [cycleName, setCycleName] = useState('')
  const [cycleCode, setCycleCode] = useState('')
  const [periodType, setPeriodType] = useState('quarter')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('active')
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  // v1340 (rule 63.1): Details / Audit details tabs.
  const [record, setRecord] = useState(null)
  const [tab, setTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify({ cycleName: '', cycleCode: '', periodType: 'quarter', startDate: '', endDate: '', status: 'active' }))
        return
      }
      setLoading(true)
      const record = await getCycle(cycleId)
      if (cancelled || !record) return
      setRecord(record)
      setCycleName(record.cycle_name || '')
      setCycleCode(record.cycle_code || '')
      setPeriodType(record.period_type || 'quarter')
      setStartDate(record.start_date || '')
      setEndDate(record.end_date || '')
      setStatus(record.status || 'active')
      setInitialSnapshot(JSON.stringify({
        cycleName: record.cycle_name || '', cycleCode: record.cycle_code || '', periodType: record.period_type || 'quarter',
        startDate: record.start_date || '', endDate: record.end_date || '', status: record.status || 'active',
      }))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [cycleId, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ cycleName, cycleCode, periodType, startDate, endDate, status }) !== initialSnapshot
  }, [cycleName, cycleCode, periodType, startDate, endDate, status, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this OKR cycle.')

  const handleSave = async () => {
    if (!cycleName.trim() || !cycleCode.trim() || !startDate || !endDate) return
    setSaving(true)
    setError(null)
    const payload = {
      cycle_name: cycleName.trim(),
      cycle_code: cycleCode.trim(),
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      status,
    }
    try {
      if (!isEdit) {
        payload.account_id = await getCurrentUserAccountId()
      }
      const result = isEdit ? await updateCycle(cycleId, payload) : await createCycle(payload)
      showSuccess({
        recordId: result?.cycle_code || cycleCode,
        operation: isEdit ? 'updated' : 'created',
        onOk: () => navigate(BASE, { replace: true }),
      })
    } catch (e) {
      setError(e?.code === '23505' ? 'A cycle with this code already exists.' : (e?.message || 'Failed to save cycle.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(BASE))
    else requestNavigation(BASE)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Cycles
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Cycle' : 'New Cycle'}</h1>

      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{error}</div>}

      <DetailAuditTabList activeTab={tab} onChange={setTab} />
      {tab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <RecordAuditDetails
                db={platformDb}
                record={record}
                noun="OKR cycle"
                identity={[{ label: 'Cycle name', value: record?.cycle_name }, { label: 'Start', value: record?.start_date }, { label: 'End', value: record?.end_date }]}
                classification={[{ label: 'Status', value: record?.status }]}
          />
        </div>
      ) : (<>
      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <FieldLabelWithHelp helpKey="sim.okr_cycles.cycle_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>Cycle name *</FieldLabelWithHelp>
          <input type="text" value={cycleName} onChange={(e) => setCycleName(e.target.value)} className={inputClass} placeholder="Q1 2026" />
        </div>
        <div>
          <FieldLabelWithHelp helpKey="sim.okr_cycles.cycle_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>Cycle code *</FieldLabelWithHelp>
          <input type="text" value={cycleCode} onChange={(e) => setCycleCode(e.target.value)} className={inputClass} placeholder="2026-Q1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabelWithHelp helpKey="sim.okr_cycles.period_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period type</FieldLabelWithHelp>
            <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className={inputClass}>
              <option value="quarter">Quarter</option>
              <option value="half_year">Half year</option>
              <option value="full_year">Full year</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <FieldLabelWithHelp helpKey="sim.okr_cycles.status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</FieldLabelWithHelp>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabelWithHelp helpKey="sim.okr_cycles.start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>Start date *</FieldLabelWithHelp>
            <RegionalDateInput eventStyle value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="sim.okr_cycles.end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>End date *</FieldLabelWithHelp>
            <RegionalDateInput eventStyle value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !cycleName.trim() || !cycleCode.trim() || !startDate || !endDate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
      </>)}
      {modal}
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.okr_cycles.cycle_name',
  'sim.okr_cycles.cycle_code',
  'sim.okr_cycles.period_type',
  'sim.okr_cycles.status',
  'sim.okr_cycles.start_date',
  'sim.okr_cycles.end_date',
]

export default function OkrCycleForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <OkrCycleFormBody {...props} />
    </FieldHelpScope>
  )
}
