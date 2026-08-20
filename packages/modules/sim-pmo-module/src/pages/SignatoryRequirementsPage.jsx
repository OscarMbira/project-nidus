import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { simDb } from '@nidus/supabase'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import SearchableSelect from '@nidus/ui/SearchableSelect'
import {
  getScopedSignatoryConfig,
  getSignatoryCountsForDocumentTables,
  resolveEffectiveSignatoryRequirements,
  saveSignatoryRequirementsForTables,
} from '@nidus/shared/services/processTemplateSignatoryService'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function createSlot(label = '', isMandatory = true) {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return { id, label: label || '', is_mandatory: isMandatory !== false }
}

function slotsForSave(slots) {
  return slots.map((s) => ({
    role_label: typeof s === 'string' ? s : s.label,
    is_mandatory: typeof s === 'string' ? true : s.is_mandatory !== false,
  }))
}

/** "Defined" / "Count" badge for a document type row, from getSignatoryCountsForDocumentTables(). */
function docStatusBadge(info) {
  if (!info || info.mode === 'inherit') {
    return { label: 'Inherits', className: 'text-amber-600 dark:text-amber-400', count: '—' }
  }
  if (info.mode === 'none') {
    return { label: 'No', className: 'text-gray-400 dark:text-gray-500', count: 0 }
  }
  const count = info.count || 0
  return {
    label: count > 0 ? 'Yes' : 'No',
    className: count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500',
    count,
  }
}

function SortableSlotRow({
  id,
  index,
  label,
  isMandatory,
  roleOptions,
  slotsLength,
  updateSlot,
  setSlotMandatory,
  moveSlot,
  removeSlot,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800/60"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label={`Drag to reorder slot ${index + 1}`}
        className="shrink-0 cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:hover:text-gray-200"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-5 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <SearchableSelect
          options={roleOptions}
          value={label}
          onChange={(v) => updateSlot(index, v)}
          placeholder="Select a role…"
          searchPlaceholder="Search roles…"
          allowCustom
          combobox
          maxDropdownHeight={260}
          listMaxHeight={200}
        />
      </div>
      <label
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        title="When unchecked, this slot is optional — it does not block document lock"
      >
        <input
          type="checkbox"
          checked={isMandatory}
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

/**
 * Document Signatory requirements (v868/v873/v880): Org defaults plus Portfolio /
 * Programme / Project overrides (inherit / none / custom full-replace).
 */
export default function SignatoryRequirementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [pageTitle, setPageTitle] = useState('')
  const [labels, setLabels] = useState({})
  const [roleOptions, setRoleOptions] = useState([])
  const [selectedTables, setSelectedTables] = useState([DOCUMENT_TABLES[0]])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [scopeType, setScopeType] = useState(() => {
    const t = String(searchParams.get('scopeType') || 'organisation').toLowerCase()
    return ['organisation', 'portfolio', 'programme', 'project'].includes(t) ? t : 'organisation'
  })
  // scopeId in the URL may be a friendly entity code (e.g. SEED-PROG-09) or, for
  // backward-compatible bookmarks, a raw UUID. Only the UUID case can seed state
  // immediately; a code needs scopeEntities loaded before it can be resolved.
  const pendingScopeCodeRef = useRef(
    (() => {
      const raw = searchParams.get('scopeId') || ''
      return UUID_RE.test(raw) ? '' : raw
    })(),
  )
  const [scopeId, setScopeId] = useState(() => {
    const raw = searchParams.get('scopeId') || ''
    return UUID_RE.test(raw) ? raw : ''
  })
  const [scopeMode, setScopeMode] = useState('custom') // inherit | none | custom
  const [sourceBanner, setSourceBanner] = useState('')
  const [scopeEntities, setScopeEntities] = useState([])
  const { showSuccess, modal: successModal } = useSuccessModal()
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const primaryTable = selectedTables[0] || null
  const needsEntity = scopeType !== 'organisation'

  useEffect(() => {
    getCurrentUserAccountId().then(setAccountId)
    getCurrentUserInternalUserId().then(setUserId)
  }, [])

  // Friendly entity code for the URL (e.g. SEED-PROG-09) — falls back to the raw
  // UUID only while scopeEntities hasn't loaded yet or the entity has no code.
  const scopeCode = useMemo(
    () => scopeEntities.find((e) => e.id === scopeId)?.code || '',
    [scopeEntities, scopeId],
  )

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('scopeType', scopeType)
    const urlScopeValue = scopeCode || scopeId
    if (urlScopeValue) next.set('scopeId', urlScopeValue)
    else next.delete('scopeId')
    setSearchParams(next, { replace: true })
  }, [scopeType, scopeId, scopeCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve a code-based ?scopeId= (from a friendly bookmark/link) to the real UUID
  // once scopeEntities for the current scopeType have loaded.
  useEffect(() => {
    const pending = pendingScopeCodeRef.current
    if (!pending || scopeEntities.length === 0) return
    const match = scopeEntities.find((e) => (e.code || '').toLowerCase() === pending.toLowerCase())
    if (match) setScopeId(match.id)
    pendingScopeCodeRef.current = ''
  }, [scopeEntities])

  useEffect(() => {
    let cancelled = false
    simDb
      .from('menu_items')
      .select('menu_label, menu_code')
      .eq('menu_code', 'sim_tpl_signatory_requirements')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const label = String(data?.menu_label || '').trim()
        const code = String(data?.menu_code || '').trim()
        setPageTitle(label && label !== code ? label : label || '')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    simDb
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
    simDb
      .from('roles')
      .select('role_name, role_display_name')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('role_display_name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          toast.error(error.message || 'Failed to load roles')
          setRoleOptions([])
          return
        }
        const opts = (data || [])
          .map((r) => {
            const label = String(r.role_display_name || r.role_name || '').trim()
            return label ? { value: label, label } : null
          })
          .filter(Boolean)
        const seen = new Set()
        setRoleOptions(opts.filter((o) => {
          const key = o.value.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }))
      })
    return () => { cancelled = true }
  }, [])

  // Load portfolio / programme / project pickers
  useEffect(() => {
    if (!accountId || scopeType === 'organisation') {
      setScopeEntities([])
      return
    }
    let cancelled = false
    ;(async () => {
      if (scopeType === 'portfolio') {
        const { data, error } = await simDb
          .from('practice_portfolios')
          .select('id, portfolio_name, portfolio_code')
          .eq('is_deleted', false)
          .order('portfolio_name', { ascending: true })
        if (cancelled) return
        if (error) toast.error(error.message)
        setScopeEntities(
          (data || []).map((r) => ({
            id: r.id,
            code: r.portfolio_code || '',
            label: r.portfolio_code ? `${r.portfolio_code} — ${r.portfolio_name}` : r.portfolio_name,
          })),
        )
      } else if (scopeType === 'programme') {
        const { data, error } = await simDb
          .from('practice_programmes')
          .select('id, programme_name, programme_code')
          .eq('is_deleted', false)
          .order('programme_name', { ascending: true })
        if (cancelled) return
        if (error) toast.error(error.message)
        setScopeEntities(
          (data || []).map((r) => ({
            id: r.id,
            code: r.programme_code || '',
            label: r.programme_code ? `${r.programme_code} — ${r.programme_name}` : r.programme_name,
          })),
        )
      } else {
        const { data, error } = await simDb
          .from('practice_projects')
          .select('id, project_name, project_code')
          .order('project_name', { ascending: true })
        if (cancelled) return
        if (error) toast.error(error.message)
        setScopeEntities(
          (data || []).map((r) => ({
            id: r.id,
            code: r.project_code || '',
            label: r.project_code ? `${r.project_code} — ${r.project_name}` : r.project_name,
          })),
        )
      }
    })()
    return () => { cancelled = true }
  }, [accountId, scopeType])

  // Bulk "defined / count" indicator per document type in the picker list — one pair of
  // queries for all DOCUMENT_TABLES instead of one getScopedSignatoryConfig() call each.
  const [docCounts, setDocCounts] = useState({})
  const refreshDocCounts = async () => {
    if (!accountId || (needsEntity && !scopeId)) {
      setDocCounts({})
      return
    }
    const result = await getSignatoryCountsForDocumentTables(simDb, {
      accountId,
      scopeType,
      scopeId: needsEntity ? scopeId : null,
      documentTables: DOCUMENT_TABLES,
    })
    setDocCounts(result.success ? result.data : {})
  }
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!accountId || (needsEntity && !scopeId)) {
        if (!cancelled) setDocCounts({})
        return
      }
      const result = await getSignatoryCountsForDocumentTables(simDb, {
        accountId,
        scopeType,
        scopeId: needsEntity ? scopeId : null,
        documentTables: DOCUMENT_TABLES,
      })
      if (!cancelled) setDocCounts(result.success ? result.data : {})
    })()
    return () => { cancelled = true }
  }, [accountId, scopeType, scopeId, needsEntity]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load slots / mode for primary selected type (keep inherit/none cheap — no full resolve)
  useEffect(() => {
    if (!accountId || !primaryTable || selectedTables.length !== 1) {
      if (!primaryTable) setSlots([])
      setLoading(false)
      return
    }
    if (needsEntity && !scopeId) {
      setSlots([])
      setScopeMode('inherit')
      setSourceBanner('Select a portfolio, programme, or project to configure.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getScopedSignatoryConfig(simDb, {
      accountId,
      scopeType,
      scopeId: needsEntity ? scopeId : null,
      documentTable: primaryTable,
    })
      .then((result) => {
        if (cancelled) return
        if (!result.success) {
          toast.error(result.message || 'Failed to load requirements')
          setSlots([])
          return
        }
        const mode = result.data.mode
        setScopeMode(mode === 'organisation' ? 'custom' : mode)
        if (mode === 'custom' || mode === 'organisation') {
          setSlots((result.data.slots || []).map((r) => createSlot(r.role_label, r.is_mandatory !== false)))
          setSourceBanner(
            scopeType === 'organisation'
              ? 'Organisation default for this document type.'
              : `Custom list for this ${scopeType}.`,
          )
        } else if (mode === 'none') {
          setSlots([])
          setSourceBanner(`No signatories at this ${scopeType} (overrides parent).`)
        } else {
          setSlots([])
          setSourceBanner(
            `Using parent defaults for this ${scopeType}. Choose Custom list to copy and edit, or No signatories to suppress.`,
          )
        }
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(err?.message || 'Failed to load requirements')
        setSlots([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [accountId, primaryTable, selectedTables.length, scopeType, scopeId, needsEntity])

  const filteredDocTables = useMemo(() => {
    const q = docSearch.trim().toLowerCase()
    const list = !q
      ? [...DOCUMENT_TABLES]
      : DOCUMENT_TABLES.filter((t) => {
          const label = String(labels[t] || t).toLowerCase()
          return label.includes(q) || t.toLowerCase().includes(q)
        })
    return list.sort((a, b) => {
      const la = String(labels[a] || a).localeCompare(String(labels[b] || b), undefined, { sensitivity: 'base' })
      return la
    })
  }, [docSearch, labels])

  const selectedDocNames = useMemo(
    () => selectedTables.map((t) => String(labels[t] || t).trim() || t),
    [selectedTables, labels],
  )
  const editingDocLabel = selectedDocNames.length === 0
    ? 'No document type selected'
    : selectedDocNames.length === 1
      ? selectedDocNames[0]
      : `${selectedDocNames.length} document types`

  const toggleTable = (table) => {
    setSelectedTables((prev) => {
      if (prev.includes(table)) return prev.filter((t) => t !== table)
      return [...prev, table]
    })
  }

  const selectAllFiltered = () => {
    setSelectedTables((prev) => [...new Set([...prev, ...filteredDocTables])])
  }

  const deselectAll = () => {
    setSelectedTables([])
    setSlots([])
  }

  const updateSlot = (index, value) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, label: value } : s)))
  }
  const setSlotMandatory = (index, isMandatory) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, is_mandatory: Boolean(isMandatory) } : s)))
  }
  const removeSlot = (index) => {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }
  const moveSlot = (index, direction) => {
    setSlots((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      return arrayMove(prev, index, target)
    })
  }
  const addSlot = () => setSlots((prev) => [...prev, createSlot()])
  const handleSlotDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSlots((prev) => {
      const fromIndex = prev.findIndex((s) => s.id === active.id)
      const toIndex = prev.findIndex((s) => s.id === over.id)
      if (fromIndex === -1 || toIndex === -1) return prev
      return arrayMove(prev, fromIndex, toIndex)
    })
  }

  const applyMode = async (nextMode) => {
    if (scopeType === 'organisation') return
    setScopeMode(nextMode)
    if (nextMode === 'none') {
      setSlots([])
      setSourceBanner(`No signatories at this ${scopeType} (overrides parent).`)
      return
    }
    if (nextMode === 'inherit') {
      setSlots([])
      setSourceBanner(
        `Using parent defaults for this ${scopeType}. Choose Custom list to copy and edit, or No signatories to suppress.`,
      )
      return
    }
    // custom — default copy parent effective list
    if (!accountId || !primaryTable) {
      setSlots([])
      return
    }
    setSourceBanner('Copying parent list…')
    const effective = await resolveEffectiveSignatoryRequirements(simDb, {
      accountId,
      documentTable: primaryTable,
      projectId: scopeType === 'project' ? scopeId : null,
      programmeId: scopeType === 'programme' ? scopeId : null,
      portfolioId: scopeType === 'portfolio' ? scopeId : null,
    })
    if (effective.success && (effective.data?.slots || []).length) {
      setSlots(effective.data.slots.map((r) => createSlot(r.role_label, r.is_mandatory !== false)))
      setSourceBanner('Custom list (seeded from parent). Use “Start blank” to clear.')
    } else {
      setSlots([])
      setSourceBanner(
        effective.success
          ? 'Custom list (blank — parent had no slots).'
          : `Custom list (blank — could not load parent: ${effective.message || 'error'}).`,
      )
    }
  }

  const startBlankCustom = () => {
    setScopeMode('custom')
    setSlots([])
    setSourceBanner('Custom list (blank).')
  }

  const handleSave = async () => {
    if (!accountId || selectedTables.length === 0) return
    if (needsEntity && !scopeId) {
      toast.error('Select a portfolio, programme, or project first.')
      return
    }
    const mode = scopeType === 'organisation' ? 'custom' : scopeMode
    const payload = mode === 'custom' ? slotsForSave(slots).filter((s) => String(s.role_label || '').trim()) : []
    if (mode === 'custom' && payload.length > 0 && !payload.some((s) => s.is_mandatory)) {
      toast.error('At least one signatory slot must be mandatory.')
      return
    }
    if (mode === 'custom' && scopeType !== 'organisation' && payload.length === 0) {
      toast.error('Custom list needs at least one slot, or choose No signatories / Use parent.')
      return
    }
    setSaving(true)
    const result = await saveSignatoryRequirementsForTables(simDb, {
      accountId,
      documentTables: selectedTables,
      slots: payload,
      userId,
      scopeType,
      scopeId: needsEntity ? scopeId : null,
      mode,
    })
    setSaving(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to save — check you have permission for this scope.')
      return
    }
    refreshDocCounts()
    const names = selectedTables.map((t) => labels[t] || t)
    const summary = names.length === 1 ? names[0] : `${names.length} document types`
    showSuccess({
      recordId: summary,
      operation: 'updated',
      message:
        names.length === 1
          ? `Signatory requirements for "${names[0]}" saved.`
          : `Signatory requirements overwritten for ${names.length} document types.`,
    })
  }

  const slotsEditable = scopeType === 'organisation' || scopeMode === 'custom'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6 lg:h-[calc(100dvh-6.5rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="shrink-0">
        <Link to="/simulator/pmo/organisational-templates" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Organisational Templates
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {pageTitle || '\u00a0'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure signatory role-slots per document type. Organisation is the default; Portfolio, Programme, and Project
          can inherit, set no signatories, or replace with a custom list. Saving overwrites every selected document type.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Scope</label>
          <select
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value)
              setScopeId('')
            }}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="organisation">Organisation</option>
            <option value="portfolio">Portfolio</option>
            <option value="programme">Programme</option>
            <option value="project">Project</option>
          </select>
        </div>
        {needsEntity && (
          <div className="min-w-[16rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {scopeType === 'portfolio' ? 'Portfolio' : scopeType === 'programme' ? 'Programme' : 'Project'}
            </label>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Select…</option>
              {scopeEntities.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        )}
        {needsEntity && scopeId && (
          <div className="flex flex-wrap gap-3 pb-1 text-sm text-gray-700 dark:text-gray-200">
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="scopeMode" checked={scopeMode === 'inherit'} onChange={() => applyMode('inherit')} />
              Use parent
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="scopeMode" checked={scopeMode === 'none'} onChange={() => applyMode('none')} />
              No signatories
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="scopeMode" checked={scopeMode === 'custom'} onChange={() => applyMode('custom')} />
              Custom list
            </label>
            {scopeMode === 'custom' && (
              <button type="button" onClick={startBlankCustom} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                Start blank
              </button>
            )}
          </div>
        )}
      </div>
      {sourceBanner && (
        <p className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" role="status">
          {sourceBanner}
        </p>
      )}

      <div className="grid min-h-0 grid-cols-1 items-stretch gap-6 lg:flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
      <div className="flex min-h-0 min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Document types ({selectedTables.length} selected)
          </label>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={selectAllFiltered} className="text-blue-600 hover:underline dark:text-blue-400">
              Select all shown
            </button>
            <button
              type="button"
              onClick={deselectAll}
              disabled={selectedTables.length === 0}
              className="text-gray-500 hover:underline disabled:opacity-40 dark:text-gray-400"
            >
              Deselect all
            </button>
          </div>
        </div>
        <input
          type="search"
          value={docSearch}
          onChange={(e) => setDocSearch(e.target.value)}
          placeholder="Search document types…"
          className="mb-2 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
        />
        <div className="mb-1 flex max-w-md items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          <span className="flex-1">Document type</span>
          <span className="w-16 shrink-0 text-center">Defined</span>
          <span className="w-10 shrink-0 text-center">Count</span>
        </div>
        <ul className="min-h-0 max-h-56 flex-1 space-y-1 overflow-y-auto rounded border border-gray-200 p-2 dark:border-gray-700 lg:max-h-none">
          {filteredDocTables.map((t) => {
            const checked = selectedTables.includes(t)
            const badge = docStatusBadge(docCounts[t])
            return (
              <li key={t}>
                <div className="flex max-w-md items-center gap-2 rounded px-1 py-1 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/80">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTable(t)}
                      className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                    <span className="truncate">{labels[t] || t}</span>
                  </label>
                  <span className={`w-16 shrink-0 text-center text-xs font-medium ${badge.className}`}>{badge.label}</span>
                  <span className="w-10 shrink-0 text-center text-xs text-gray-500 dark:text-gray-400">{badge.count}</span>
                </div>
              </li>
            )
          })}
          {filteredDocTables.length === 0 && (
            <li className="px-1 py-2 text-xs text-gray-400 dark:text-gray-500">No document types match.</li>
          )}
        </ul>
        {selectedTables.length > 0 && (
          <p className="mt-2 shrink-0 text-sm">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Selected: </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{selectedDocNames.join(', ')}</span>
          </p>
        )}
        {selectedTables.length > 1 && (
          <p className="mt-2 shrink-0 text-xs text-amber-700 dark:text-amber-300">
            Bulk mode: the slot list will overwrite all {selectedTables.length} selected types on Save.
          </p>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Required signatory slots, in signing order</h2>
          <p className={`mt-1 text-base font-medium ${selectedDocNames.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>{editingDocLabel}</p>
          {selectedDocNames.length > 1 && (
            <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{selectedDocNames.join(', ')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {slotsEditable ? 'Drag the grip handle to change signing order, or use the arrows.' : 'Switch to Custom list to edit slots for this scope.'}
          </p>
        </div>

        {loading && selectedTables.length === 1 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
        ) : (
          <div className={`min-h-0 flex-1 overflow-y-auto ${!slotsEditable ? 'pointer-events-none opacity-60' : ''}`}>
            {slots.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {scopeMode === 'none'
                  ? 'No signatories for this scope.'
                  : scopeMode === 'inherit'
                    ? 'Parent defaults apply when a document starts signing. Choose Custom list to copy and edit here.'
                    : 'No signatories required yet — add slots below.'}
              </p>
            )}
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSlotDragEnd}>
              <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {slots.map((slot, index) => (
                    <SortableSlotRow
                      key={slot.id}
                      id={slot.id}
                      index={index}
                      label={slot.label}
                      isMandatory={slot.is_mandatory !== false}
                      roleOptions={roleOptions}
                      slotsLength={slots.length}
                      updateSlot={updateSlot}
                      setSlotMandatory={setSlotMandatory}
                      moveSlot={moveSlot}
                      removeSlot={removeSlot}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            {slotsEditable && (
              <button
                type="button"
                onClick={addSlot}
                className="mt-3 inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add slot
              </button>
            )}
          </div>
        )}

        <div className="shrink-0 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            disabled={saving || loading || selectedTables.length === 0 || (needsEntity && !scopeId)}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />{' '}
            {saving
              ? 'Saving…'
              : selectedTables.length > 1
                ? `Save & overwrite (${selectedTables.length})`
                : 'Save requirements'}
          </button>
        </div>
      </div>
      </div>

      {successModal}
    </div>
  )
}
