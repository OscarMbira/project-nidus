import { Fragment, useEffect, useState } from 'react'
import Modal from '../Modal.jsx'
import ViewToggle from '../ViewToggle.jsx'
import { groupByPhase, flattenWbsTree, resolvePhaseKey, phaseSelectOptions, computeMaxOutlineLevel, expandedMapForOutlineLevel, filterFlatByOutlineLevel } from '@nidus/shared/utils/industryPlanGridUtils.js'
import {
  COLUMN_STORAGE_PREFIX,
  loadColumnLayout,
  saveColumnLayout,
  normalizeColumnLayout,
  moveColumn as moveLayoutColumn,
  showColumn,
  hideColumn,
  getColumnLabel,
  formatIndustryPlanCell,
  wbsColumnOpts,
  flatColumnOpts,
  mergeColumnOptsWithCustom,
  normalizeCustomColumnDefs,
} from '@nidus/shared/utils/industryPlanGridColumns.js'
import { IndustryPlanColumnChooser } from './IndustryPlanColumnChooser.jsx'

const inputClass =
  'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100'

const PRIORITIES = ['', 'low', 'medium', 'high', 'critical']
const ACTIVITY_TYPES = ['task', 'review', 'approval', 'meeting', 'deliverable', 'milestone']
const DELIVERABLE_TYPES = ['document', 'report', 'artefact', 'decision', 'approval']

function cloneRow(row) {
  try {
    return structuredClone(row)
  } catch {
    return JSON.parse(JSON.stringify(row))
  }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function useIndustryPlanColumnLayout(storageSuffix, opts) {
  const storageKey = `${COLUMN_STORAGE_PREFIX}${storageSuffix}`
  const poolKey = (opts.optionalPool || []).join('|')
  const [layout, setLayoutState] = useState(() => loadColumnLayout(storageKey, opts))

  useEffect(() => {
    setLayoutState((prev) => {
      const next = normalizeColumnLayout(prev, opts)
      saveColumnLayout(storageKey, next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- poolKey captures pool membership
  }, [storageKey, poolKey])

  const persist = (next) => {
    const normalized = normalizeColumnLayout(next, opts)
    setLayoutState(normalized)
    saveColumnLayout(storageKey, normalized)
  }

  return {
    layout,
    opts,
    show: (key) => persist(showColumn(layout, key, opts)),
    hide: (key) => persist(hideColumn(layout, key, opts)),
    move: (fromKey, toKey) => persist(moveLayoutColumn(layout, fromKey, toKey, opts)),
    reset: () => persist(opts.defaultShown),
  }
}

function ColumnChooserWired({ colState, customColumnApi }) {
  return (
    <IndustryPlanColumnChooser
      layout={colState.layout}
      opts={colState.opts}
      onShow={colState.show}
      onHide={colState.hide}
      onMove={colState.move}
      onReset={colState.reset}
      customDefs={customColumnApi?.defs}
      onAddCustom={customColumnApi?.onAdd}
      onUpdateCustom={customColumnApi?.onUpdate}
      onDeleteCustom={customColumnApi?.onDelete}
    />
  )
}

function WbsOutlineToolbar({ outlineLevel, maxLevel, onOutlineLevel }) {
  const levels = Array.from({ length: Math.max(1, maxLevel) }, (_, i) => i + 1)
  const btn =
    'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-[11px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={btn} onClick={() => onOutlineLevel(1)} title="Collapse all (outline level 1)">
        Collapse all
      </button>
      <button type="button" className={btn} onClick={() => onOutlineLevel(maxLevel)} title="Expand all outline levels">
        Expand all
      </button>
      <label className="ml-1 inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
        <span className="whitespace-nowrap">Outline level</span>
        <select
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 text-[11px] text-gray-800 dark:text-gray-100"
          value={outlineLevel}
          onChange={(e) => onOutlineLevel(Number(e.target.value))}
        >
          {levels.map((n) => (
            <option key={n} value={n}>
              Level {n}{n === 1 ? ' (phases)' : n === maxLevel ? ' (all)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function GridColumnHeaders({ layout, opts, onMove }) {
  const [dragCol, setDragCol] = useState(null)
  const locked = new Set([...(opts.lockedPrefix || []), ...(opts.lockedSuffix || [])])
  const labels = opts.labels || {}

  return layout.map((key) => {
    const isLocked = locked.has(key)
    const alignRight = key === '_actions'
    return (
      <th
        key={key}
        draggable={!isLocked}
        onDragStart={(e) => {
          if (isLocked) return
          e.dataTransfer.effectAllowed = 'move'
          setDragCol(key)
        }}
        onDragOver={(e) => {
          if (!isLocked) e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (dragCol && !isLocked) onMove?.(dragCol, key)
          setDragCol(null)
        }}
        onDragEnd={() => setDragCol(null)}
        className={`px-2 py-2 font-medium text-gray-500 dark:text-gray-400 ${
          alignRight ? 'text-right' : 'text-left'
        } ${!isLocked ? 'cursor-grab' : ''} ${dragCol === key ? 'opacity-40' : ''}`}
        title={isLocked ? undefined : 'Drag to reorder'}
      >
        {getColumnLabel(key, labels)}
      </th>
    )
  })
}

function PlanningDefaultsFields({ draft, setDraft, offsetLabel }) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      <Field label="Priority">
        <select
          className={inputClass}
          value={draft.priority || ''}
          onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
        >
          {PRIORITIES.map((v) => (
            <option key={v || 'empty'} value={v}>{v || '—'}</option>
          ))}
        </select>
      </Field>
      <Field label="Planned hours">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={draft.planned_hours ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, planned_hours: e.target.value }))}
        />
      </Field>
      <Field label="Planned cost">
        <input
          type="number"
          min={0}
          step="0.01"
          className={inputClass}
          value={draft.planned_cost ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, planned_cost: e.target.value }))}
        />
      </Field>
      <Field label={offsetLabel || 'Offset from phase start (days)'}>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={draft.start_offset_days ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, start_offset_days: e.target.value }))}
        />
      </Field>
      <Field label="Locked">
        <label className="flex items-center gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(draft.is_locked)}
            onChange={(e) => setDraft((d) => ({ ...d, is_locked: e.target.checked }))}
          />
          Locked on real projects
        </label>
      </Field>
    </div>
  )
}

function CustomFieldsSection({ draft, setDraft, customDefs }) {
  const defs = normalizeCustomColumnDefs(customDefs)
  if (!defs.length) return null

  const setField = (id, value) => {
    setDraft((d) => ({
      ...d,
      custom_fields: { ...(d.custom_fields || {}), [id]: value },
    }))
  }

  return (
    <div className="space-y-3 rounded border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
        Custom columns
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {defs.map((def) => {
          const value = draft.custom_fields?.[def.id]
          if (def.type === 'yes_no') {
            return (
              <Field key={def.id} label={def.label}>
                <label className="flex items-center gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => setField(def.id, e.target.checked)}
                  />
                  Yes
                </label>
              </Field>
            )
          }
          if (def.type === 'number') {
            return (
              <Field key={def.id} label={def.label}>
                <input
                  type="number"
                  className={inputClass}
                  value={value ?? ''}
                  onChange={(e) => setField(def.id, e.target.value)}
                />
              </Field>
            )
          }
          return (
            <Field key={def.id} label={def.label}>
              <input
                className={inputClass}
                value={value ?? ''}
                onChange={(e) => setField(def.id, e.target.value)}
              />
            </Field>
          )
        })}
      </div>
    </div>
  )
}

function detailTitleFor(kind, row) {
  const labels = {
    phases: 'phase',
    activities: 'activity',
    deliverables: 'deliverable',
    milestones: 'milestone',
    risks: 'risk',
    roles: 'role',
  }
  const kindLabel = labels[kind] || 'record'
  const name = row?.phase_name
    || row?.activity_name
    || row?.deliverable_name
    || row?.milestone_name
    || row?.risk_title
    || row?.role_title
    || ''
  return String(name || '').trim() ? `Edit ${kindLabel}` : `New ${kindLabel}`
}

function RowEditForm({ kind, draft, setDraft, phases, customDefs }) {
  const phaseOpts = phaseSelectOptions(phases || [])

  if (kind === 'phases') {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Phase #">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={draft.phase_number ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, phase_number: e.target.value }))}
            />
          </Field>
          <Field label="Phase name" className="sm:col-span-2">
            <input
              className={inputClass}
              value={draft.phase_name || ''}
              onChange={(e) => setDraft((d) => ({ ...d, phase_name: e.target.value }))}
            />
          </Field>
          <Field label="Estimated duration">
            <input
              className={inputClass}
              value={draft.estimated_duration || ''}
              onChange={(e) => setDraft((d) => ({ ...d, estimated_duration: e.target.value }))}
              placeholder="2–4 weeks"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              rows={3}
              className={inputClass}
              value={draft.phase_description || ''}
              onChange={(e) => setDraft((d) => ({ ...d, phase_description: e.target.value }))}
            />
          </Field>
        </div>
        <PlanningDefaultsFields draft={draft} setDraft={setDraft} offsetLabel="Offset from project start (days)" />
        <CustomFieldsSection draft={draft} setDraft={setDraft} customDefs={customDefs} />
      </div>
    )
  }

  if (kind === 'activities') {
    const skillsText = Array.isArray(draft.required_skills)
      ? draft.required_skills.join(', ')
      : (draft.required_skills || '')
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Activity name">
            <input
              className={inputClass}
              value={draft.activity_name || ''}
              onChange={(e) => setDraft((d) => ({ ...d, activity_name: e.target.value }))}
            />
          </Field>
          <Field label="Phase #">
            <select
              className={inputClass}
              value={draft.phase_number == null ? '' : String(draft.phase_number)}
              onChange={(e) => setDraft((d) => ({ ...d, phase_number: e.target.value }))}
            >
              <option value="">— Unassigned —</option>
              {phaseOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              className={inputClass}
              value={draft.activity_type || ''}
              onChange={(e) => setDraft((d) => ({ ...d, activity_type: e.target.value }))}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Resource type">
            <input
              className={inputClass}
              value={draft.resource_type || ''}
              onChange={(e) => setDraft((d) => ({ ...d, resource_type: e.target.value }))}
            />
          </Field>
          <Field label="Typical duration">
            <input
              className={inputClass}
              value={draft.typical_duration || ''}
              onChange={(e) => setDraft((d) => ({ ...d, typical_duration: e.target.value }))}
            />
          </Field>
          <Field label="Typical effort">
            <input
              className={inputClass}
              value={draft.typical_effort || ''}
              onChange={(e) => setDraft((d) => ({ ...d, typical_effort: e.target.value }))}
            />
          </Field>
          <Field label="Required skills (comma-separated)" className="sm:col-span-2">
            <input
              className={inputClass}
              value={skillsText}
              onChange={(e) => {
                const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                setDraft((d) => ({ ...d, required_skills: parts }))
              }}
              placeholder="e.g. Planning, Risk analysis"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              rows={3}
              className={inputClass}
              value={draft.activity_description || ''}
              onChange={(e) => setDraft((d) => ({ ...d, activity_description: e.target.value }))}
            />
          </Field>
        </div>
        <PlanningDefaultsFields draft={draft} setDraft={setDraft} />
        <CustomFieldsSection draft={draft} setDraft={setDraft} customDefs={customDefs} />
      </div>
    )
  }

  if (kind === 'deliverables') {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Deliverable name">
            <input
              className={inputClass}
              value={draft.deliverable_name || ''}
              onChange={(e) => setDraft((d) => ({ ...d, deliverable_name: e.target.value }))}
            />
          </Field>
          <Field label="Phase #">
            <select
              className={inputClass}
              value={draft.phase_number == null ? '' : String(draft.phase_number)}
              onChange={(e) => setDraft((d) => ({ ...d, phase_number: e.target.value }))}
            >
              <option value="">— Unassigned —</option>
              {phaseOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              className={inputClass}
              value={draft.deliverable_type || ''}
              onChange={(e) => setDraft((d) => ({ ...d, deliverable_type: e.target.value }))}
            >
              {DELIVERABLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Mandatory">
            <label className="flex items-center gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(draft.is_mandatory)}
                onChange={(e) => setDraft((d) => ({ ...d, is_mandatory: e.target.checked }))}
              />
              Required deliverable
            </label>
          </Field>
        </div>
        <PlanningDefaultsFields draft={draft} setDraft={setDraft} />
        <CustomFieldsSection draft={draft} setDraft={setDraft} customDefs={customDefs} />
      </div>
    )
  }

  if (kind === 'milestones') {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Milestone name">
            <input
              className={inputClass}
              value={draft.milestone_name || ''}
              onChange={(e) => setDraft((d) => ({ ...d, milestone_name: e.target.value }))}
            />
          </Field>
          <Field label="Phase #">
            <select
              className={inputClass}
              value={draft.phase_number == null ? '' : String(draft.phase_number)}
              onChange={(e) => setDraft((d) => ({ ...d, phase_number: e.target.value }))}
            >
              <option value="">— Unassigned —</option>
              {phaseOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              rows={3}
              className={inputClass}
              value={draft.milestone_description || ''}
              onChange={(e) => setDraft((d) => ({ ...d, milestone_description: e.target.value }))}
            />
          </Field>
        </div>
        <PlanningDefaultsFields draft={draft} setDraft={setDraft} />
        <CustomFieldsSection draft={draft} setDraft={setDraft} customDefs={customDefs} />
      </div>
    )
  }

  // Generic fallback for risks / roles / other flat keys
  const nameKey = kind === 'risks' ? 'risk_title' : kind === 'roles' ? 'role_title' : 'name'
  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          className={inputClass}
          value={draft[nameKey] || ''}
          onChange={(e) => setDraft((d) => ({ ...d, [nameKey]: e.target.value }))}
        />
      </Field>
      <CustomFieldsSection draft={draft} setDraft={setDraft} customDefs={customDefs} />
    </div>
  )
}

/**
 * Toolbar for entity sections: title, count, card/grid view toggle, add, columns slot.
 * view is 'card'|'grid' — maps to ViewToggle 'grid'|'list'.
 */
export function IndustryPlanEntityToolbar({
  title,
  count,
  view,
  onViewChange,
  onAdd,
  addLabel = '+ Add',
  columnsSlot,
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {title}
        {count != null && (
          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({count})</span>
        )}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {columnsSlot}
        <ViewToggle
          value={view === 'grid' ? 'list' : 'grid'}
          onChange={(v) => onViewChange?.(v === 'list' ? 'grid' : 'card')}
        />
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function setterForKind(kind, setters) {
  return {
    phases: setters.setPhases,
    activities: setters.setActivities,
    deliverables: setters.setDeliverables,
    milestones: setters.setMilestones,
  }[kind]
}

/**
 * WBS tree grid for industry plan wizard (phases + nested children).
 */
export function IndustryPlanWbsGrid({
  phases = [],
  setPhases,
  activities = [],
  setActivities,
  deliverables = [],
  setDeliverables,
  milestones = [],
  setMilestones,
  customDefs,
  customColumnApi,
}) {
  const defs = normalizeCustomColumnDefs(customDefs ?? customColumnApi?.defs)
  const colState = useIndustryPlanColumnLayout(
    'wbs',
    mergeColumnOptsWithCustom(wbsColumnOpts(), defs),
  )
  const { groups, unassigned } = groupByPhase(phases, { activities, deliverables, milestones })
  const maxOutlineLevel = computeMaxOutlineLevel(groups, unassigned)
  const [outlineLevel, setOutlineLevel] = useState(maxOutlineLevel)
  const [expanded, setExpanded] = useState(() => expandedMapForOutlineLevel(groups, maxOutlineLevel))
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)

  const setters = { setPhases, setActivities, setDeliverables, setMilestones }

  useEffect(() => {
    setOutlineLevel((prev) => Math.min(Math.max(1, prev), maxOutlineLevel))
  }, [maxOutlineLevel])

  const applyOutlineLevel = (level) => {
    const next = Math.max(1, Math.min(Number(level) || 1, maxOutlineLevel))
    setOutlineLevel(next)
    setExpanded(expandedMapForOutlineLevel(groups, next))
  }

  const toggle = (key) => {
    setExpanded((prev) => {
      const currentlyOpen = prev[key] !== false
      const willOpen = !currentlyOpen
      if (willOpen && outlineLevel <= 1) setOutlineLevel(maxOutlineLevel)
      return { ...prev, [key]: willOpen }
    })
  }

  const openRow = (kind, index) => {
    const list = { phases, activities, deliverables, milestones }[kind]
    const row = list?.[index]
    if (!row) return
    setSelected({ kind, index })
    setDraft(cloneRow(row))
  }

  const closeModal = () => {
    setSelected(null)
    setDraft(null)
  }

  const saveModal = () => {
    if (!selected || !draft) return
    const setList = setterForKind(selected.kind, setters)
    if (setList) {
      setList((prev) => prev.map((row, i) => (i === selected.index ? draft : row)))
    }
    closeModal()
  }

  const countTree = (nodes) => {
    let n = 0
    const walk = (list) => {
      for (const node of list || []) {
        n += 1
        walk(node.children)
      }
    }
    walk(nodes)
    return n
  }

  const renderTreeRows = (nodes) => filterFlatByOutlineLevel(flattenWbsTree(nodes), outlineLevel).map((item) => {
    const depthPad = Math.max(0, (item.depth || 1) - 1)
    const ctx = {
      kind: item.kind,
      row: item.row,
      wbs: item.wbs,
      label: item.label,
      depth: item.depth,
      customDefs: defs,
    }
    const isSel = selected?.kind === item.kind && selected?.index === item.index

    return (
      <tr
        key={`${item.kind}-${item.index}-${item.wbs}`}
        onClick={() => openRow(item.kind, item.index)}
        className={`cursor-pointer ${
          isSel
            ? 'bg-blue-50 dark:bg-blue-950/40'
            : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'
        }`}
      >
        {colState.layout.map((key) => {
          if (key === '_actions') {
            return <td key={key} className="px-2 py-1.5 text-right text-gray-400">Edit</td>
          }
          if (key === 'wbs') {
            return (
              <td key={key} className="px-2 py-1.5 text-gray-500 dark:text-gray-400 font-mono">
                <span
                  className="inline-flex items-center"
                  style={{ paddingLeft: `${depthPad * 14 + 8}px` }}
                >
                  <span className="mr-1.5 text-gray-400 dark:text-gray-600 select-none" aria-hidden="true">└</span>
                  {item.wbs}
                </span>
              </td>
            )
          }
          if (key === 'name') {
            return (
              <td key={key} className="px-2 py-1.5 text-gray-800 dark:text-gray-100">
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ paddingLeft: `${depthPad * 16}px` }}
                >
                  <span className="h-3 w-0.5 shrink-0 rounded bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                  {formatIndustryPlanCell('name', ctx)}
                </span>
              </td>
            )
          }
          return (
            <td key={key} className="px-2 py-1.5 text-gray-600 dark:text-gray-400">
              {formatIndustryPlanCell(key, ctx)}
            </td>
          )
        })}
      </tr>
    )
  })

  const colCount = colState.layout.length
  const selectedRow = selected
    ? { phases, activities, deliverables, milestones }[selected.kind]?.[selected.index]
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-3xl">
          WBS numbers are display-only. Click a row to edit. Use Collapse all / Expand all or Outline level (MS Project style).
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <WbsOutlineToolbar
            outlineLevel={outlineLevel}
            maxLevel={maxOutlineLevel}
            onOutlineLevel={applyOutlineLevel}
          />
          <ColumnChooserWired colState={colState} customColumnApi={customColumnApi} />
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[720px] divide-y divide-gray-200 dark:divide-gray-700 text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <GridColumnHeaders layout={colState.layout} opts={colState.opts} onMove={colState.move} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950/40">
            {groups.map((g) => {
              const open = expanded[g.wbs] !== false
              const childCount = countTree(g.tree)
              const phaseCtx = {
                kind: 'phases',
                isPhase: true,
                row: g.phase || {},
                wbs: g.wbs,
                label: 'Phase',
                customDefs: defs,
              }
              const isSel = selected?.kind === 'phases' && selected?.index === g.phaseIndex
              return (
                <Fragment key={g.wbs}>
                  <tr
                    onClick={() => openRow('phases', g.phaseIndex)}
                    className={`cursor-pointer ${
                      isSel
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'bg-gray-100/80 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {colState.layout.map((key) => {
                      if (key === '_actions') {
                        return <td key={key} className="px-2 py-1.5 text-right text-gray-400">Edit</td>
                      }
                      if (key === 'wbs') {
                        return (
                          <td key={key} className="px-2 py-1.5 font-semibold text-gray-800 dark:text-gray-100">
                            <button
                              type="button"
                              className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                              onClick={(e) => { e.stopPropagation(); toggle(g.wbs) }}
                              aria-label={open ? 'Collapse' : 'Expand'}
                            >
                              {open ? '▾' : '▸'}
                            </button>
                            {g.wbs}
                          </td>
                        )
                      }
                      if (key === 'kind') {
                        return (
                          <td key={key} className="px-2 py-1.5 font-medium text-gray-600 dark:text-gray-300">
                            Phase
                          </td>
                        )
                      }
                      if (key === 'name') {
                        return (
                          <td key={key} className="px-2 py-1.5 font-medium text-gray-900 dark:text-gray-100">
                            <span className="inline-flex items-center font-semibold">
                              {g.phase?.phase_name || '—'}
                              <span className="ml-2 text-gray-400 font-normal">({childCount})</span>
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={key} className="px-2 py-1.5 text-gray-600 dark:text-gray-400">
                          {formatIndustryPlanCell(key, phaseCtx)}
                        </td>
                      )
                    })}
                  </tr>
                  {open && renderTreeRows(g.tree)}
                </Fragment>
              )
            })}
            {(unassigned.tree?.length > 0) && (
              <Fragment>
                <tr className="bg-amber-50/80 dark:bg-amber-950/30">
                  <td className="px-2 py-1.5 font-semibold text-amber-800 dark:text-amber-200" colSpan={colCount}>
                    <button
                      type="button"
                      className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded"
                      onClick={() => toggle('__unassigned')}
                    >
                      {expanded.__unassigned !== false ? '▾' : '▸'}
                    </button>
                    Unassigned (no matching phase #)
                  </td>
                </tr>
                {expanded.__unassigned !== false && renderTreeRows(unassigned.tree)}
              </Fragment>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(selected && draft && selectedRow)}
        onClose={closeModal}
        title={selected && draft ? detailTitleFor(selected.kind, draft) : 'Edit'}
        size="xl"
        footer={(
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveModal}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Save
            </button>
          </>
        )}
      >
        {selected && draft && (
          <RowEditForm
            kind={selected.kind}
            draft={draft}
            setDraft={setDraft}
            phases={phases}
            customDefs={defs}
          />
        )}
      </Modal>
    </div>
  )
}

/**
 * Flat entity grid (activities, deliverables, milestones, etc.) for industry plan wizard.
 */
export function IndustryPlanFlatEntityGrid({
  listKey,
  rows = [],
  setRows,
  phases = [],
  customDefs,
  customColumnApi,
  indentNameKey,
}) {
  const defs = normalizeCustomColumnDefs(customDefs ?? customColumnApi?.defs)
  const catalogOpts = mergeColumnOptsWithCustom(
    flatColumnOpts(listKey) || {
      lockedPrefix: ['_row'],
      lockedSuffix: ['_actions'],
      optionalPool: [],
      defaultShown: ['_row', '_actions'],
    },
    defs,
  )
  const colState = useIndustryPlanColumnLayout(listKey, catalogOpts)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [draft, setDraft] = useState(null)

  const openRow = (index) => {
    const row = rows[index]
    if (!row) return
    setSelectedIndex(index)
    setDraft(cloneRow(row))
  }

  const closeModal = () => {
    setSelectedIndex(null)
    setDraft(null)
  }

  const saveModal = () => {
    if (selectedIndex == null || !draft || !setRows) return
    setRows((prev) => prev.map((row, i) => (i === selectedIndex ? draft : row)))
    closeModal()
  }

  const renderDataCell = (key, row) => {
    const raw = formatIndustryPlanCell(key, { kind: listKey, row, customDefs: defs })
    if (indentNameKey && key === indentNameKey && resolvePhaseKey(row)) {
      return (
        <span className="inline-flex items-center gap-1.5 pl-6">
          <span className="mr-1 text-gray-400 dark:text-gray-600 select-none" aria-hidden="true">└</span>
          <span className="h-3 w-0.5 shrink-0 rounded bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          {raw}
        </span>
      )
    }
    return raw
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ColumnChooserWired colState={colState} customColumnApi={customColumnApi} />
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[640px] divide-y divide-gray-200 dark:divide-gray-700 text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <GridColumnHeaders layout={colState.layout} opts={colState.opts} onMove={colState.move} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950/40">
            {rows.map((row, index) => (
              <tr
                key={`${listKey}-${index}`}
                onClick={() => openRow(index)}
                className={`cursor-pointer ${
                  selectedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'
                }`}
              >
                {colState.layout.map((key) => {
                  if (key === '_row') {
                    return (
                      <td
                        key={key}
                        className="select-none px-2 py-1.5 text-gray-500 dark:text-gray-400 w-10"
                      >
                        {index + 1}
                      </td>
                    )
                  }
                  if (key === '_actions') {
                    return (
                      <td key={key} className="px-2 py-1.5 text-right text-gray-400">
                        Edit
                      </td>
                    )
                  }
                  return (
                    <td key={key} className="px-2 py-1.5 text-gray-800 dark:text-gray-200">
                      {renderDataCell(key, row)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={selectedIndex != null && Boolean(draft)}
        onClose={closeModal}
        title={draft ? detailTitleFor(listKey, draft) : 'Edit'}
        size="xl"
        footer={(
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveModal}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Save
            </button>
          </>
        )}
      >
        {draft && (
          <RowEditForm
            kind={listKey}
            draft={draft}
            setDraft={setDraft}
            phases={phases}
            customDefs={defs}
          />
        )}
      </Modal>
    </div>
  )
}
