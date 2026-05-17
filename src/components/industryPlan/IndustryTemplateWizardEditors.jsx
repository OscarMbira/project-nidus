const inputCls = 'w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900'

function moveItem(list, index, dir) {
  const next = [...list]
  const j = index + dir
  if (j < 0 || j >= next.length) return list
  ;[next[index], next[j]] = [next[j], next[index]]
  return next.map((row, i) => ({ ...row, sort_order: i }))
}

function RowActions({ index, total, onMove, onRemove }) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5">
      <button type="button" className="rounded border px-1 text-xs" disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" className="rounded border px-1 text-xs" disabled={index >= total - 1} onClick={() => onMove(1)}>
        ↓
      </button>
      <button type="button" className="rounded border px-1 text-xs text-red-600" onClick={onRemove}>
        ×
      </button>
    </div>
  )
}

export function PhaseEditor({ phases, setPhases }) {
  const update = (i, patch) => {
    const next = phases.map((p, idx) =>
      idx === i ? { ...p, ...patch, phase_number: idx + 1, sort_order: idx } : { ...p, phase_number: idx + 1, sort_order: idx },
    )
    setPhases(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setPhases([
            ...phases,
            {
              phase_number: phases.length + 1,
              phase_name: '',
              phase_description: '',
              estimated_duration: '',
              sort_order: phases.length,
            },
          ])
        }
      >
        + Add phase
      </button>
      {phases.map((p, i) => (
        <div key={p.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder={`Phase ${i + 1} name`}
              value={p.phase_name}
              onChange={(e) => update(i, { phase_name: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Estimated duration"
              value={p.estimated_duration || ''}
              onChange={(e) => update(i, { estimated_duration: e.target.value })}
            />
            <textarea
              className={`${inputCls} sm:col-span-2`}
              rows={2}
              placeholder="Phase description"
              value={p.phase_description || ''}
              onChange={(e) => update(i, { phase_description: e.target.value })}
            />
          </div>
          <RowActions
            index={i}
            total={phases.length}
            onMove={(d) => setPhases(moveItem(phases, i, d))}
            onRemove={() => setPhases(phases.filter((_, idx) => idx !== i).map((row, idx) => ({ ...row, phase_number: idx + 1, sort_order: idx })))}
          />
        </div>
      ))}
    </div>
  )
}

const ACTIVITY_TYPES = ['task', 'review', 'approval', 'meeting', 'deliverable', 'milestone']

export function ActivityEditor({ phases, activities, setActivities }) {
  const phaseOptions = phases.map((p) => ({ num: p.phase_number, label: `${p.phase_number}. ${p.phase_name || 'Phase'}` }))
  const update = (i, patch) => {
    const next = [...activities]
    next[i] = { ...next[i], ...patch }
    setActivities(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setActivities([
            ...activities,
            {
              activity_name: '',
              activity_type: 'task',
              phase_number: phases[0]?.phase_number || 1,
              typical_duration: '',
              typical_effort: '',
              resource_type: '',
              predecessor_notes: '',
              constraints: '',
              sort_order: activities.length,
            },
          ])
        }
      >
        + Add activity ({activities.length})
      </button>
      {activities.map((a, i) => (
        <div key={a.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Activity name"
              value={a.activity_name}
              onChange={(e) => update(i, { activity_name: e.target.value })}
            />
            <select
              className={inputCls}
              value={a.phase_number ?? phases[0]?.phase_number ?? 1}
              onChange={(e) => update(i, { phase_number: Number(e.target.value), phase_id: undefined })}
            >
              {phaseOptions.map((o) => (
                <option key={o.num} value={o.num}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={a.activity_type || 'task'}
              onChange={(e) => update(i, { activity_type: e.target.value })}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Typical duration"
              value={a.typical_duration || ''}
              onChange={(e) => update(i, { typical_duration: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Typical effort"
              value={a.typical_effort || ''}
              onChange={(e) => update(i, { typical_effort: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Resource type"
              value={a.resource_type || ''}
              onChange={(e) => update(i, { resource_type: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Predecessors"
              value={a.predecessor_notes || ''}
              onChange={(e) => update(i, { predecessor_notes: e.target.value })}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Constraints"
              value={a.constraints || ''}
              onChange={(e) => update(i, { constraints: e.target.value })}
            />
          </div>
          <RowActions
            index={i}
            total={activities.length}
            onMove={(d) => setActivities(moveItem(activities, i, d))}
            onRemove={() => setActivities(activities.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}

export function DeliverableEditor({ phases, deliverables, setDeliverables }) {
  const phaseOptions = phases.map((p) => ({ num: p.phase_number, label: `${p.phase_number}. ${p.phase_name || 'Phase'}` }))
  const update = (i, patch) => {
    const next = [...deliverables]
    next[i] = { ...next[i], ...patch }
    setDeliverables(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setDeliverables([
            ...deliverables,
            {
              deliverable_name: '',
              deliverable_type: 'document',
              phase_number: phases[0]?.phase_number || null,
              is_mandatory: false,
              sort_order: deliverables.length,
            },
          ])
        }
      >
        + Add deliverable ({deliverables.length})
      </button>
      {deliverables.map((d, i) => (
        <div key={d.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Deliverable name"
              value={d.deliverable_name}
              onChange={(e) => update(i, { deliverable_name: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Type (document, report…)"
              value={d.deliverable_type || 'document'}
              onChange={(e) => update(i, { deliverable_type: e.target.value })}
            />
            <select
              className={inputCls}
              value={d.phase_number ?? ''}
              onChange={(e) =>
                update(i, {
                  phase_number: e.target.value ? Number(e.target.value) : null,
                  phase_id: undefined,
                })
              }
            >
              <option value="">No phase</option>
              {phaseOptions.map((o) => (
                <option key={o.num} value={o.num}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!d.is_mandatory} onChange={(e) => update(i, { is_mandatory: e.target.checked })} />
              Mandatory
            </label>
          </div>
          <RowActions
            index={i}
            total={deliverables.length}
            onMove={(d) => setDeliverables(moveItem(deliverables, i, d))}
            onRemove={() => setDeliverables(deliverables.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}

const LIKELIHOODS = ['low', 'medium', 'high']

export function RiskEditor({ risks, setRisks }) {
  const update = (i, patch) => {
    const next = [...risks]
    next[i] = { ...next[i], ...patch }
    setRisks(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setRisks([
            ...risks,
            {
              risk_title: '',
              risk_description: '',
              risk_category: 'General',
              likelihood: 'medium',
              impact: 'medium',
              sort_order: risks.length,
            },
          ])
        }
      >
        + Add risk ({risks.length})
      </button>
      {risks.map((r, i) => (
        <div key={r.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Risk title"
              value={r.risk_title}
              onChange={(e) => update(i, { risk_title: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Category"
              value={r.risk_category || ''}
              onChange={(e) => update(i, { risk_category: e.target.value })}
            />
            <select className={inputCls} value={r.likelihood || 'medium'} onChange={(e) => update(i, { likelihood: e.target.value })}>
              {LIKELIHOODS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select className={inputCls} value={r.impact || 'medium'} onChange={(e) => update(i, { impact: e.target.value })}>
              {LIKELIHOODS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <textarea
              className={`${inputCls} sm:col-span-2`}
              rows={2}
              placeholder="Description"
              value={r.risk_description || ''}
              onChange={(e) => update(i, { risk_description: e.target.value })}
            />
          </div>
          <RowActions
            index={i}
            total={risks.length}
            onMove={(d) => setRisks(moveItem(risks, i, d))}
            onRemove={() => setRisks(risks.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}

export function MilestoneEditor({ phases, milestones, setMilestones }) {
  const phaseOptions = phases.map((p) => ({ num: p.phase_number, label: `${p.phase_number}. ${p.phase_name || 'Phase'}` }))
  const update = (i, patch) => {
    const next = [...milestones]
    next[i] = { ...next[i], ...patch }
    setMilestones(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setMilestones([
            ...milestones,
            {
              milestone_name: '',
              milestone_description: '',
              phase_number: phases[0]?.phase_number || null,
              sort_order: milestones.length,
            },
          ])
        }
      >
        + Add milestone ({milestones.length})
      </button>
      {milestones.map((m, i) => (
        <div key={m.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Milestone name"
              value={m.milestone_name}
              onChange={(e) => update(i, { milestone_name: e.target.value })}
            />
            <select
              className={inputCls}
              value={m.phase_number ?? ''}
              onChange={(e) =>
                update(i, {
                  phase_number: e.target.value ? Number(e.target.value) : null,
                  phase_id: undefined,
                })
              }
            >
              <option value="">No phase</option>
              {phaseOptions.map((o) => (
                <option key={o.num} value={o.num}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Description"
              value={m.milestone_description || ''}
              onChange={(e) => update(i, { milestone_description: e.target.value })}
            />
          </div>
          <RowActions
            index={i}
            total={milestones.length}
            onMove={(d) => setMilestones(moveItem(milestones, i, d))}
            onRemove={() => setMilestones(milestones.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}

export function RoleEditor({ roles, setRoles }) {
  const update = (i, patch) => {
    const next = [...roles]
    next[i] = { ...next[i], ...patch }
    setRoles(next)
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-sm text-blue-600"
        onClick={() =>
          setRoles([
            ...roles,
            { role_title: '', role_description: '', is_key_role: false, sort_order: roles.length },
          ])
        }
      >
        + Add role ({roles.length})
      </button>
      {roles.map((r, i) => (
        <div key={r.id || i} className="flex gap-2 rounded border p-3 dark:border-slate-600">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Role title"
              value={r.role_title}
              onChange={(e) => update(i, { role_title: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!r.is_key_role} onChange={(e) => update(i, { is_key_role: e.target.checked })} />
              Key role ★
            </label>
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Description"
              value={r.role_description || ''}
              onChange={(e) => update(i, { role_description: e.target.value })}
            />
          </div>
          <RowActions
            index={i}
            total={roles.length}
            onMove={(d) => setRoles(moveItem(roles, i, d))}
            onRemove={() => setRoles(roles.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}
