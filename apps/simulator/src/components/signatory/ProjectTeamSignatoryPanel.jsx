import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Users, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb, simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import SearchableSelect from '@nidus/ui/SearchableSelect'
import {
  getScopedSignatoryConfig,
  saveScopedSignatoryConfig,
  getLedPracticeTeamsForUser,
} from '@nidus/shared/services/processTemplateSignatoryService'

// Same 23 document tables as Platform (SQL/v880c mirrors the CHECK constraint) — table
// labels come from public.database_tables, shared across apps.
const DOCUMENT_TABLES = [
  'project_charters', 'assumption_logs', 'project_management_plans',
  'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
  'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
  'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
  'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
  'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
  'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
  'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents',
]

function createSlot(label = '', isMandatory = true) {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return { id, label: label || '', is_mandatory: isMandatory !== false }
}

function slotsForSave(slots) {
  return slots.map((s) => ({ role_label: s.label, is_mandatory: s.is_mandatory !== false }))
}

function ReadOnlySummary({ label, config, loading }) {
  if (loading) return <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
  if (!config) return null
  const { mode, slots } = config
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {mode === 'none' || (slots || []).length === 0 ? (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">No signatories required.</p>
      ) : (
        <ol className="mt-1 space-y-0.5 text-sm text-gray-800 dark:text-gray-100">
          {slots.map((s, i) => (
            <li key={`${s.role_label}-${i}`}>
              {i + 1}. {s.role_label}
              {s.is_mandatory === false && <span className="ml-1 text-xs text-gray-400">(optional)</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** One editable slot row — up/down arrows for ordering (kept simple, no drag-and-drop; see
 *  Platform's equivalent component for the same note). */
function SlotRow({ index, slot, slotsLength, roleOptions, updateSlot, setSlotMandatory, moveSlot, removeSlot }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800/60">
      <span className="w-5 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <SearchableSelect
          options={roleOptions}
          value={slot.label}
          onChange={(v) => updateSlot(index, v)}
          placeholder="Select a role…"
          searchPlaceholder="Search roles…"
          allowCustom
          combobox
        />
      </div>
      <label
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        title="When unchecked, this slot is optional — it does not block document lock"
      >
        <input
          type="checkbox"
          checked={slot.is_mandatory !== false}
          onChange={(e) => setSlotMandatory(index, e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
        />
        Mandatory
      </label>
      <button type="button" onClick={() => moveSlot(index, -1)} disabled={index === 0} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-200" title="Move up">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => moveSlot(index, 1)} disabled={index === slotsLength - 1} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-200" title="Move down">
        <ChevronDown className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => removeSlot(index)} className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40" title="Remove">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

/** One inherit/none/custom editor for a single scope (project, or one led practice team). */
function ScopeEditor({ title, icon: Icon, scopeType, scopeId, accountId, documentTable, roleOptions, onSaved }) {
  const [mode, setMode] = useState('inherit')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState('')

  useEffect(() => {
    if (!accountId || !scopeId || !documentTable) return
    let cancelled = false
    setLoading(true)
    getScopedSignatoryConfig(simDb, { accountId, scopeType, scopeId, documentTable })
      .then((result) => {
        if (cancelled) return
        if (!result.success) {
          toast.error(result.message || 'Failed to load requirements')
          return
        }
        setMode(result.data.mode === 'organisation' ? 'custom' : result.data.mode)
        setSlots((result.data.slots || []).map((r) => createSlot(r.role_label, r.is_mandatory !== false)))
        setBanner(
          result.data.mode === 'none'
            ? 'No signatories at this scope (overrides parent).'
            : result.data.mode === 'custom'
              ? 'Custom list for this scope.'
              : 'Using parent defaults. Choose Custom list to copy and edit.',
        )
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accountId, scopeType, scopeId, documentTable])

  const updateSlot = (i, value) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, label: value } : s)))
  const setSlotMandatory = (i, val) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, is_mandatory: val } : s)))
  const removeSlot = (i) => setSlots((prev) => prev.filter((_, idx) => idx !== i))
  const moveSlot = (i, dir) => setSlots((prev) => {
    const target = i + dir
    if (target < 0 || target >= prev.length) return prev
    const next = [...prev]
    ;[next[i], next[target]] = [next[target], next[i]]
    return next
  })
  const addSlot = () => setSlots((prev) => [...prev, createSlot()])

  const handleSave = async () => {
    if (mode === 'custom' && slots.filter((s) => s.label.trim()).length === 0) {
      toast.error('Custom list needs at least one slot, or choose No signatories / Use parent.')
      return
    }
    setSaving(true)
    const result = await saveScopedSignatoryConfig(simDb, {
      accountId,
      documentTable,
      scopeType,
      scopeId,
      mode,
      slots: mode === 'custom' ? slotsForSave(slots).filter((s) => s.role_label.trim()) : [],
    })
    setSaving(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to save — check you have permission for this scope.')
      return
    }
    onSaved?.()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" checked={mode === 'inherit'} onChange={() => setMode('inherit')} /> Use parent
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" checked={mode === 'none'} onChange={() => setMode('none')} /> No signatories
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} /> Custom list
        </label>
      </div>
      {banner && (
        <p className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {banner}
        </p>
      )}
      {loading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
      ) : mode === 'custom' ? (
        <>
          <ul className="space-y-2">
            {slots.map((slot, index) => (
              <SlotRow
                key={slot.id}
                index={index}
                slot={slot}
                slotsLength={slots.length}
                roleOptions={roleOptions}
                updateSlot={updateSlot}
                setSlotMandatory={setSlotMandatory}
                moveSlot={moveSlot}
                removeSlot={removeSlot}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={addSlot}
            className="mt-3 inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" /> Add slot
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mode === 'none' ? 'No signatories will be required at this scope.' : 'Parent defaults apply.'}
        </p>
      )}
      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/**
 * Simulator equivalent of Platform's ProjectTeamSignatoryPanel (v1067). Practice-project
 * ownership is a single `user_id` on sim.practice_projects (not a project_manager_user_id
 * FK), and sim.practice_teams.team_lead_user_id references auth.users(id) directly — so
 * both checks compare against the raw auth user id, not public.users.id.
 */
export default function ProjectTeamSignatoryPanel({ practiceProjectId }) {
  const [accountId, setAccountId] = useState(null)
  const [authUserId, setAuthUserId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [ledTeams, setLedTeams] = useState([])
  const [roleOptions, setRoleOptions] = useState([])
  const [labels, setLabels] = useState({})
  const [docSearch, setDocSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState(DOCUMENT_TABLES[0])
  const [loading, setLoading] = useState(true)
  const [readOnlyConfig, setReadOnlyConfig] = useState(null)
  const [readOnlyLoading, setReadOnlyLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()

  useEffect(() => {
    if (!practiceProjectId) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      const [acctId, sessionResult] = await Promise.all([getCurrentUserAccountId(), simDb.auth.getSession()])
      if (cancelled) return
      const uid = sessionResult?.data?.session?.user?.id || null
      setAccountId(acctId)
      setAuthUserId(uid)

      // Note: this checks whether YOU are practice_projects.user_id for this specific
      // project (its owner) — a per-project fact, separate from any general role you hold.
      const { data: project, error: projectError } = await simDb
        .from('practice_projects')
        .select('user_id')
        .eq('id', practiceProjectId)
        .maybeSingle()
      if (cancelled) return
      if (projectError) {
        setLoadError(projectError.message || 'Failed to check your access to this practice project.')
        setLoading(false)
        return
      }
      setIsOwner(Boolean(project?.user_id && uid && project.user_id === uid))

      if (uid) {
        const teamsResult = await getLedPracticeTeamsForUser(simDb, { practiceProjectId, authUserId: uid })
        if (cancelled) return
        if (teamsResult.success) setLedTeams(teamsResult.data)
        else setLoadError(teamsResult.message || 'Failed to check your team leadership on this practice project.')
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [practiceProjectId])

  useEffect(() => {
    platformDb
      .from('database_tables')
      .select('table_name, table_description')
      .in('table_name', DOCUMENT_TABLES)
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach((r) => { map[r.table_name] = r.table_description })
        setLabels(map)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    platformDb
      .from('roles')
      .select('role_name, role_display_name')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('role_display_name', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        const seen = new Set()
        setRoleOptions((data || [])
          .map((r) => String(r.role_display_name || r.role_name || '').trim())
          .filter((label) => {
            if (!label || seen.has(label.toLowerCase())) return false
            seen.add(label.toLowerCase())
            return true
          })
          .map((label) => ({ value: label, label })))
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (ledTeams.length === 0 || !accountId || !practiceProjectId || !selectedTable) {
      setReadOnlyConfig(null)
      return
    }
    let cancelled = false
    setReadOnlyLoading(true)
    getScopedSignatoryConfig(simDb, { accountId, scopeType: 'project', scopeId: practiceProjectId, documentTable: selectedTable })
      .then((result) => { if (!cancelled && result.success) setReadOnlyConfig(result.data) })
      .finally(() => { if (!cancelled) setReadOnlyLoading(false) })
    return () => { cancelled = true }
  }, [ledTeams.length, accountId, practiceProjectId, selectedTable, refreshKey])

  const filteredDocTables = useMemo(() => {
    const q = docSearch.trim().toLowerCase()
    const list = !q ? [...DOCUMENT_TABLES] : DOCUMENT_TABLES.filter((t) => String(labels[t] || t).toLowerCase().includes(q))
    return list.sort((a, b) => String(labels[a] || a).localeCompare(String(labels[b] || b), undefined, { sensitivity: 'base' }))
  }, [docSearch, labels])

  const handleSaved = (scopeLabel) => {
    setRefreshKey((k) => k + 1)
    showSuccess({
      recordId: labels[selectedTable] || selectedTable,
      operation: 'updated',
      message: `Signatory requirements for "${labels[selectedTable] || selectedTable}" saved (${scopeLabel}).`,
    })
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {loadError}
      </div>
    )
  }

  if (!isOwner && ledTeams.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          No Document Signatory setup to configure for you on this practice project
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          This checks two specific things: whether you're recorded as <strong>this practice project's owner</strong>,
          or whether you lead a team on it. Holding a role generally doesn't apply here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Document type</label>
        <input
          type="search"
          value={docSearch}
          onChange={(e) => setDocSearch(e.target.value)}
          placeholder="Search document types…"
          className="mb-2 w-full max-w-md rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
        />
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full max-w-md rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          {filteredDocTables.map((t) => (
            <option key={t} value={t}>{labels[t] || t}</option>
          ))}
        </select>
      </div>

      {isOwner && (
        <ScopeEditor
          title={`Project requirements — ${labels[selectedTable] || selectedTable}`}
          icon={ShieldCheck}
          scopeType="project"
          scopeId={practiceProjectId}
          accountId={accountId}
          documentTable={selectedTable}
          roleOptions={roleOptions}
          onSaved={() => handleSaved('project')}
        />
      )}

      {ledTeams.length > 0 && (
        <ReadOnlySummary
          label={`Current project-level requirement for ${labels[selectedTable] || selectedTable} (what your team inherits by default)`}
          config={readOnlyConfig}
          loading={readOnlyLoading}
        />
      )}

      {ledTeams.map((team) => (
        <ScopeEditor
          key={team.id}
          title={`${team.team_name} — ${labels[selectedTable] || selectedTable}`}
          icon={Users}
          scopeType="team"
          scopeId={team.id}
          accountId={accountId}
          documentTable={selectedTable}
          roleOptions={roleOptions}
          onSaved={() => handleSaved(team.team_name)}
        />
      ))}

      {successModal}
    </div>
  )
}
