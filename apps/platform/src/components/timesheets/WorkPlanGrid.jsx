import { Fragment, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Send, AlertTriangle, History, ChevronDown, ChevronRight } from 'lucide-react'
import {
  getOrCreateWorkPlan,
  listWorkPlanItems,
  createWorkPlanItem,
  updateWorkPlanItem,
  deleteWorkPlanItem,
  submitWorkPlan,
  getWorkPlanItemStatuses,
  getCarryForwardCandidates,
  computeWorkPlanVariance,
  getProjectRoleOptions,
} from '../../services/projectWorkPlanService'
import { getWorkCategories } from '../../services/timesheetWorkCategoryService'
import { getProjectMembers } from '../../services/projectMembershipService'
import SelectField from '@nidus/ui/SelectField'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_BADGE_CLASSES = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.draft}`}>
      {status}
    </span>
  )
}

const newRowKey = (i) => `new:${i}`
const isNewRowKey = (key) => key.startsWith('new:')
const blankDraft = () => ({ details: '', statusCode: 'not_started', targetCompletionPct: '', startDate: '', endDate: '', roleCode: '', taskLabel: '', referenceCode: '', memberUserId: '', priority: 'medium', workCategory: '', estimatedHours: '', remark: '' })

/**
 * Self-service Work Plan tab (v1180) — a flat list of planned items for the project's resolved
 * period (weekly or monthly, per settings.work_plan_period_type), not day-grouped like
 * OvertimeGrid: a plan item's Start/End dates can span the whole period or beyond, so there's no
 * natural "which day does this row belong to" the way a logged hour has. Same draft/submitted/
 * approved/rejected lifecycle and edit-locking as Timesheets; approve/reject itself lives on the
 * Team Work Plan view (PM/PMO/Team Lead/Team Manager), not here.
 */
export default function WorkPlanGrid({ projectId, userId, periodType, periodStartDate, periodEndDate, previousPeriodStartDate, entries, billingType, onChanged }) {
  const [workPlan, setWorkPlan] = useState(null)
  const [items, setItems] = useState([])
  const [statuses, setStatuses] = useState([])
  const [categories, setCategories] = useState([])
  const [roles, setRoles] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [extraRows, setExtraRows] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [savingKey, setSavingKey] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('view') // 'edit' | 'view'
  const [carryForwardCandidates, setCarryForwardCandidates] = useState([])
  const [carryForwardDismissed, setCarryForwardDismissed] = useState(false)
  // Accordion — only one saved item's detail panel is open at a time; expanding a row closes
  // whichever other row was open. Blank/new rows are exempt (they're always expanded, see
  // `expanded` below) since they need to be filled in regardless of this state.
  const [expandedKey, setExpandedKey] = useState(null)

  const toggleExpanded = (rowKey) => {
    setExpandedKey((prev) => (prev === rowKey ? null : rowKey))
  }

  const load = async () => {
    if (!projectId || !userId || !periodStartDate) return
    setLoading(true)
    try {
      const plan = await getOrCreateWorkPlan(projectId, userId, periodType, periodStartDate, periodEndDate)
      setWorkPlan(plan)
      const rows = await listWorkPlanItems(plan.id)
      setItems(rows)
    } catch (e) {
      toast.error(e?.message || 'Failed to load work plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, userId, periodStartDate, periodEndDate, periodType])

  useEffect(() => {
    getWorkPlanItemStatuses().then((r) => setStatuses((r.data || []).filter((s) => !s.is_system))).catch(() => setStatuses([]))
    getWorkCategories().then((r) => setCategories(r.data || [])).catch(() => setCategories([]))
    if (projectId && projectId !== 'null') {
      getProjectRoleOptions(projectId).then(setRoles).catch(() => setRoles([]))
      getProjectMembers(projectId).then((r) => setMembers(r.success ? r.data : [])).catch(() => setMembers([]))
    }
  }, [projectId])

  useEffect(() => {
    setCarryForwardDismissed(false)
    if (!projectId || !userId || !previousPeriodStartDate || items.length > 0) { setCarryForwardCandidates([]); return }
    getCarryForwardCandidates(projectId, userId, previousPeriodStartDate).then(setCarryForwardCandidates).catch(() => setCarryForwardCandidates([]))
  }, [projectId, userId, previousPeriodStartDate, items.length])

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const i of items) {
        next[i.id] = {
          details: i.details || '',
          statusCode: i.status_code || 'not_started',
          targetCompletionPct: i.target_completion_pct != null ? String(i.target_completion_pct) : '',
          startDate: i.planned_start_date || '',
          endDate: i.planned_end_date || '',
          roleCode: i.role_code || '',
          taskLabel: i.task_label || '',
          referenceCode: i.reference_code || '',
          memberUserId: i.member_user_id || '',
          priority: i.priority || 'medium',
          workCategory: i.work_category || '',
          estimatedHours: i.estimated_hours != null ? String(i.estimated_hours) : '',
          remark: i.remark || '',
        }
      }
      return next
    })
  }, [items])

  const editable = workPlan && (workPlan.status === 'draft' || workPlan.status === 'rejected')

  const rowKeys = useMemo(() => {
    const blankCount = items.length === 0 ? Math.max(1, extraRows) : extraRows
    return [...items.map((i) => i.id), ...Array.from({ length: blankCount }, (_, i) => newRowKey(i))]
  }, [items, extraRows])

  const handleAddRow = () => setExtraRows((n) => n + 1)
  const handleCancelBlankRow = (rowKey) => {
    setExtraRows((n) => Math.max(0, n - 1))
    setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
  }

  const handleBlur = async (rowKey, draftOverride) => {
    if (!editable) return
    const existing = items.find((i) => i.id === rowKey) || null
    const draft = draftOverride || drafts[rowKey] || blankDraft()
    if (!draft.details || !draft.details.trim()) {
      if (existing) {
        // blanking Details on an existing row deletes it, same convention as the Timesheet grids'
        // "clear to zero = remove" pattern
        setSavingKey(rowKey)
        try { await deleteWorkPlanItem(existing.id); setItems((prev) => prev.filter((i) => i.id !== existing.id)) }
        catch (e) { toast.error(e?.message || 'Failed to delete item') }
        finally { setSavingKey(null) }
      }
      return
    }
    const payload = {
      details: draft.details.trim(),
      status_code: draft.statusCode || 'not_started',
      target_completion_pct: draft.targetCompletionPct === '' ? null : Number(draft.targetCompletionPct),
      planned_start_date: draft.startDate || null,
      planned_end_date: draft.endDate || null,
      role_code: draft.roleCode || null,
      task_label: draft.taskLabel || null,
      reference_code: draft.referenceCode || null,
      member_user_id: draft.memberUserId || null,
      priority: draft.priority || 'medium',
      work_category: draft.workCategory || null,
      estimated_hours: draft.estimatedHours === '' ? null : Number(draft.estimatedHours),
      remark: draft.remark || null,
    }
    setSavingKey(rowKey)
    try {
      if (existing) {
        const updated = await updateWorkPlanItem(existing.id, payload)
        setItems((prev) => prev.map((i) => (i.id === existing.id ? updated : i)))
      } else {
        const created = await createWorkPlanItem({ ...payload, work_plan_id: workPlan.id, sort_order: items.length * 10 })
        setItems((prev) => [...prev, created])
        setExtraRows((n) => Math.max(0, n - 1))
        setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
      }
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to save item')
    } finally {
      setSavingKey(null)
    }
  }

  const updateDraft = (rowKey, field, value) => {
    setDrafts((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || blankDraft()), [field]: value } }))
  }

  // Marking an item Completed implies it's 100% done — auto-fill % Target unless the user has
  // already set it to exactly 100 (nothing to override in that case).
  const handleStatusChange = (rowKey, value) => {
    setDrafts((prev) => {
      const current = prev[rowKey] || blankDraft()
      const next = { ...current, statusCode: value }
      if (value === 'completed') next.targetCompletionPct = '100'
      return { ...prev, [rowKey]: next }
    })
  }

  // Immediate-save variant for SelectField fields (Task/Category), which have no onBlur — same
  // fix as WeeklyTimesheetGrid.jsx's handleSelectChange.
  const handleSelectChange = (rowKey, field, value) => {
    const next = { ...(drafts[rowKey] || blankDraft()), [field]: value }
    setDrafts((prev) => ({ ...prev, [rowKey]: next }))
    handleBlur(rowKey, next)
  }

  const handleDeleteItem = async (item) => {
    if (!editable) return
    setSavingKey(item.id)
    try {
      await deleteWorkPlanItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to delete item')
    } finally {
      setSavingKey(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const updated = await submitWorkPlan(workPlan.id)
      setWorkPlan(updated)
      toast.success('Work plan submitted for approval')
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCarryForward = async (candidate) => {
    try {
      const created = await createWorkPlanItem({
        work_plan_id: workPlan.id,
        sort_order: items.length * 10,
        details: candidate.details,
        status_code: 'carried_forward',
        target_completion_pct: candidate.target_completion_pct,
        planned_start_date: periodStartDate,
        planned_end_date: candidate.planned_end_date,
        role_code: candidate.role_code,
        task_id: candidate.task_id,
        work_category: candidate.work_category,
        estimated_hours: candidate.estimated_hours,
        remark: candidate.remark,
      })
      setItems((prev) => [...prev, created])
      setCarryForwardCandidates((prev) => prev.filter((c) => c.id !== candidate.id))
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to carry item forward')
    }
  }

  const variance = useMemo(() => {
    if (billingType !== 'time_and_material') return null
    return computeWorkPlanVariance(items, entries || [])
  }, [billingType, items, entries])

  if (loading) {
    return <div className="py-8 text-center text-gray-500 dark:text-slate-500">Loading work plan…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Work Plan</p>
          <StatusBadge status={workPlan?.status} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
            <button type="button" onClick={() => setMode('edit')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'edit' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              Edit
            </button>
            <button type="button" onClick={() => setMode('view')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'view' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              View
            </button>
          </div>
          <button type="button" onClick={handleSubmit} disabled={submitting || !editable || items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white">
            <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit Plan'}
          </button>
        </div>
      </div>

      {!editable && workPlan?.status && (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          This plan is {workPlan.status} and can't be edited{workPlan.status === 'rejected' ? '' : ' unless it is rejected back to you'}.
        </p>
      )}

      {!carryForwardDismissed && carryForwardCandidates.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
              <History className="h-4 w-4" /> Carry forward incomplete items from last period?
            </p>
            <button type="button" onClick={() => setCarryForwardDismissed(true)} className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {carryForwardCandidates.map((c) => (
              <button key={c.id} type="button" onClick={() => handleCarryForward(c)}
                className="inline-flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                <Plus className="h-3 w-3" /> {c.details}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'edit' && (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Grid + form hybrid: the compact row only carries the "at a glance" columns (SN,
            Details, Status, % Target, Est. Hours). Everything else (Start/End, Role, Task,
            Category, Remark) lives in an expandable form panel per row — a flat table with all
            11 fields as columns was unreadably cramped. New/blank rows always start expanded
            (there's nothing to glance at yet); saved items default collapsed. */}
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[50px]" />
            <col />
            <col className="w-[150px]" />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[40px]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">SN</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Details</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Reference</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">% Target</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Est. Hours</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {rowKeys.map((rowKey, idx) => {
              const existing = items.find((i) => i.id === rowKey) || null
              const draft = drafts[rowKey] || blankDraft()
              const isBlank = isNewRowKey(rowKey)
              const rowBusy = savingKey === rowKey
              const itemVariance = variance?.items.find((v) => v.itemId === rowKey)
              const expanded = isBlank || expandedKey === rowKey
              return (
                <Fragment key={rowKey}>
                <tr>
                  <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input type="text" value={draft.details} disabled={!editable || rowBusy}
                        onChange={(e) => updateDraft(rowKey, 'details', e.target.value)}
                        onBlur={() => handleBlur(rowKey)}
                        placeholder="Planned work item"
                        className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                      {itemVariance?.noHoursLogged && (
                        <span title="Planned but no hours logged yet this period" className="shrink-0 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {existing && editable && (
                        <button type="button" title="Delete this item" disabled={rowBusy} onClick={() => handleDeleteItem(existing)}
                          className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isBlank && (
                        <button type="button" title="Remove this row" onClick={() => handleCancelBlankRow(rowKey)}
                          className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <SelectField
                      value={draft.workCategory}
                      onChange={(v) => handleSelectChange(rowKey, 'workCategory', v)}
                      options={categories.map((c) => ({ value: c.code, label: c.name }))}
                      placeholder="Category…"
                      disabled={!editable || rowBusy}
                      forceSearchable
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select value={draft.statusCode} disabled={!editable || rowBusy}
                      onChange={(e) => handleStatusChange(rowKey, e.target.value)}
                      onBlur={() => handleBlur(rowKey)}
                      className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed">
                      {statuses.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={draft.referenceCode} disabled={!editable || rowBusy}
                      onChange={(e) => updateDraft(rowKey, 'referenceCode', e.target.value)}
                      onBlur={() => handleBlur(rowKey)}
                      placeholder="e.g. DEF-123"
                      className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" max="100" value={draft.targetCompletionPct} disabled={!editable || rowBusy || draft.statusCode === 'completed'}
                      onChange={(e) => updateDraft(rowKey, 'targetCompletionPct', e.target.value)}
                      onBlur={() => handleBlur(rowKey)}
                      placeholder="%"
                      title={draft.statusCode === 'completed' ? 'Locked at 100% while Status is Completed' : undefined}
                      className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-right text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={draft.estimatedHours} disabled={!editable || rowBusy}
                      onChange={(e) => updateDraft(rowKey, 'estimatedHours', e.target.value)}
                      onBlur={() => handleBlur(rowKey)}
                      placeholder="0"
                      className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-right text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!isBlank && (
                      <button type="button" title={expanded ? 'Hide details' : 'Show more details (Start/End, Role, Task, Category, Remark)'}
                        onClick={() => toggleExpanded(rowKey)}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded && (
                  <tr className="bg-gray-50/60 dark:bg-slate-900/40">
                    <td></td>
                    <td colSpan={7} className="px-3 pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Start</label>
                          <input type="date" value={draft.startDate} disabled={!editable || rowBusy}
                            onChange={(e) => updateDraft(rowKey, 'startDate', e.target.value)}
                            onBlur={() => handleBlur(rowKey)}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">End</label>
                          <input type="date" value={draft.endDate} disabled={!editable || rowBusy}
                            onChange={(e) => updateDraft(rowKey, 'endDate', e.target.value)}
                            onBlur={() => handleBlur(rowKey)}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Role</label>
                          <SelectField
                            value={draft.roleCode}
                            onChange={(v) => handleSelectChange(rowKey, 'roleCode', v)}
                            options={roles.map((r) => ({ value: r.role_name, label: r.role_display_name }))}
                            placeholder="Select a role…"
                            disabled={!editable || rowBusy}
                            forceSearchable
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Task</label>
                          <input type="text" value={draft.taskLabel} disabled={!editable || rowBusy}
                            onChange={(e) => updateDraft(rowKey, 'taskLabel', e.target.value)}
                            onBlur={() => handleBlur(rowKey)}
                            placeholder="Task"
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Member</label>
                          <SelectField
                            value={draft.memberUserId}
                            onChange={(v) => handleSelectChange(rowKey, 'memberUserId', v)}
                            options={members.map((m) => ({ value: m.user_id, label: m.user?.full_name || m.user?.email || 'Unknown member' }))}
                            placeholder="Select a member…"
                            disabled={!editable || rowBusy}
                            forceSearchable
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Priority</label>
                          <select value={draft.priority} disabled={!editable || rowBusy}
                            onChange={(e) => updateDraft(rowKey, 'priority', e.target.value)}
                            onBlur={() => handleBlur(rowKey)}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed">
                            {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Remark</label>
                          <input type="text" value={draft.remark} disabled={!editable || rowBusy}
                            onChange={(e) => updateDraft(rowKey, 'remark', e.target.value)}
                            onBlur={() => handleBlur(rowKey)}
                            placeholder="Remark"
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {mode === 'edit' && editable && (
        <button type="button" onClick={handleAddRow}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      )}

      {mode === 'view' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[50px]" />
              <col />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[140px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[40px]" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">SN</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Details</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Reference</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">% Target</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Est. Hours</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-slate-500">No items in this plan.</td></tr>
              )}
              {items.map((item, idx) => {
                const category = categories.find((c) => c.code === item.work_category)
                const status = statuses.find((s) => s.code === item.status_code)
                const rowExpanded = expandedKey === item.id
                const itemVariance = variance?.items.find((v) => v.itemId === item.id)
                return (
                  <Fragment key={item.id}>
                  <tr>
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-slate-100">
                      <span className="inline-flex items-center gap-1.5">
                        {item.details}
                        {itemVariance?.noHoursLogged && (
                          <span title="Planned but no hours logged yet this period" className="shrink-0 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{category?.name || item.work_category || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-slate-300 capitalize">{status?.name || (item.status_code || '').replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{item.reference_code || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{item.target_completion_pct != null ? `${item.target_completion_pct}%` : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{item.estimated_hours != null ? Number(item.estimated_hours).toFixed(1) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" title={rowExpanded ? 'Hide details' : 'Show more details'}
                        onClick={() => toggleExpanded(item.id)}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
                        {rowExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {rowExpanded && (
                    <tr className="bg-gray-50/60 dark:bg-slate-900/40">
                      <td></td>
                      <td colSpan={7} className="px-3 pb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">Start</span>{item.planned_start_date || '—'}</div>
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">End</span>{item.planned_end_date || '—'}</div>
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">Role</span>{item.role_code || '—'}</div>
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">Task</span>{item.task_label || '—'}</div>
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">Member</span>{members.find((m) => m.user_id === item.member_user_id)?.user?.full_name || members.find((m) => m.user_id === item.member_user_id)?.user?.email || '—'}</div>
                          <div><span className="text-xs text-gray-500 dark:text-slate-400 block">Priority</span>{PRIORITY_OPTIONS.find((p) => p.value === item.priority)?.label || '—'}</div>
                          <div className="sm:col-span-2 lg:col-span-3"><span className="text-xs text-gray-500 dark:text-slate-400 block">Remark</span>{item.remark || '—'}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {variance && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-slate-300 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
          <span><strong className="text-gray-900 dark:text-white">{variance.plannedHours.toFixed(1)}h</strong> planned</span>
          <span><strong className="text-gray-900 dark:text-white">{variance.actualHours.toFixed(1)}h</strong> actual</span>
          <span className={variance.varianceHours < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
            <strong>{variance.varianceHours >= 0 ? '+' : ''}{variance.varianceHours.toFixed(1)}h</strong>
            {variance.variancePct != null && ` (${variance.variancePct >= 0 ? '+' : ''}${variance.variancePct.toFixed(0)}%)`} variance
          </span>
          {variance.unplannedHours > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> <strong>{variance.unplannedHours.toFixed(1)}h</strong> logged with no matching plan item
            </span>
          )}
        </div>
      )}
    </div>
  )
}
