/**
 * Industry Plan Templates — PMO master data (public schema).
 */
import { platformDb } from './supabase/supabaseClient'

const TEMPLATE = 'pmo_industry_templates'
const PHASE = 'pmo_industry_template_phases'
const ACTIVITY = 'pmo_industry_template_activities'
const DELIVERABLE = 'pmo_industry_template_deliverables'
const RISK = 'pmo_industry_template_risks'
const MILESTONE = 'pmo_industry_template_milestones'
const ROLE = 'pmo_industry_template_roles'

const CHILD_TABLES = [ACTIVITY, DELIVERABLE, RISK, MILESTONE, ROLE, PHASE]

function throwIf(error, label) {
  if (error) throw new Error(error.message || label)
}

export async function listIndustryTemplates({ status, search, pmoView = false } = {}) {
  let q = platformDb
    .from(TEMPLATE)
    .select(
      'id, industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, updated_at',
    )
    .eq('is_deleted', false)
    .order('industry_name')

  if (!pmoView) q = q.eq('status', 'published')
  else if (status) q = q.eq('status', status)

  const { data, error } = await q
  throwIf(error, 'Failed to list industry templates')

  let rows = data || []
  const t = (search || '').trim().toLowerCase()
  if (t) {
    rows = rows.filter(
      (r) =>
        (r.industry_name || '').toLowerCase().includes(t) ||
        (r.industry_code || '').toLowerCase().includes(t) ||
        (r.description || '').toLowerCase().includes(t) ||
        (r.tags || []).some((tag) => String(tag).toLowerCase().includes(t)),
    )
  }
  return rows
}

export async function getTemplateById(id) {
  const { data: header, error } = await platformDb.from(TEMPLATE).select('*').eq('id', id).maybeSingle()
  throwIf(error, 'Failed to load template')
  if (!header) return null

  const [phases, activities, deliverables, risks, milestones, roles] = await Promise.all([
    platformDb.from(PHASE).select('*').eq('template_id', id).order('sort_order'),
    platformDb.from(ACTIVITY).select('*').eq('template_id', id).order('sort_order'),
    platformDb.from(DELIVERABLE).select('*').eq('template_id', id).order('sort_order'),
    platformDb.from(RISK).select('*').eq('template_id', id).order('sort_order'),
    platformDb.from(MILESTONE).select('*').eq('template_id', id).order('sort_order'),
    platformDb.from(ROLE).select('*').eq('template_id', id).order('sort_order'),
  ])

  for (const r of [phases, activities, deliverables, risks, milestones, roles]) {
    throwIf(r.error, 'Failed to load template children')
  }

  return {
    ...header,
    phases: phases.data || [],
    activities: activities.data || [],
    deliverables: deliverables.data || [],
    risks: risks.data || [],
    milestones: milestones.data || [],
    roles: roles.data || [],
  }
}

export async function createTemplate(payload) {
  const row = {
    industry_code: payload.industry_code,
    industry_name: payload.industry_name,
    description: payload.description ?? null,
    typical_duration: payload.typical_duration ?? null,
    icon: payload.icon ?? 'layers',
    tags: payload.tags ?? [],
    status: payload.status ?? 'draft',
    version: payload.version ?? '1.0',
    is_active: true,
    is_deleted: false,
  }
  const { data, error } = await platformDb.from(TEMPLATE).insert(row).select().single()
  throwIf(error, 'Failed to create template')
  return data
}

export async function updateTemplate(id, payload) {
  const { data, error } = await platformDb
    .from(TEMPLATE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  throwIf(error, 'Failed to update template')
  return data
}

export async function archiveTemplate(id) {
  return updateTemplate(id, { status: 'archived', is_active: false })
}

export async function duplicateTemplate(id) {
  const src = await getTemplateById(id)
  if (!src) throw new Error('Template not found')

  const suffix = `_copy_${Date.now().toString(36)}`
  const created = await createTemplate({
    industry_code: `${src.industry_code}${suffix}`.slice(0, 120),
    industry_name: `${src.industry_name} (Copy)`,
    description: src.description,
    typical_duration: src.typical_duration,
    icon: src.icon,
    tags: src.tags,
    status: 'draft',
    version: src.version,
  })

  const phaseIdMap = new Map()
  for (const p of src.phases) {
    const { data, error } = await platformDb
      .from(PHASE)
      .insert({
        template_id: created.id,
        phase_number: p.phase_number,
        phase_name: p.phase_name,
        phase_description: p.phase_description,
        estimated_duration: p.estimated_duration,
        sort_order: p.sort_order,
      })
      .select()
      .single()
    throwIf(error, 'Failed to duplicate phases')
    phaseIdMap.set(p.id, data.id)
  }

  const mapPhase = (oldPhaseId) => (oldPhaseId ? phaseIdMap.get(oldPhaseId) ?? null : null)

  for (const a of src.activities) {
    await platformDb.from(ACTIVITY).insert({
      template_id: created.id,
      phase_id: mapPhase(a.phase_id),
      activity_name: a.activity_name,
      activity_description: a.activity_description,
      activity_type: a.activity_type,
      typical_duration: a.typical_duration,
      typical_effort: a.typical_effort,
      resource_type: a.resource_type,
      predecessor_notes: a.predecessor_notes,
      constraints: a.constraints,
      sort_order: a.sort_order,
    })
  }
  for (const d of src.deliverables) {
    await platformDb.from(DELIVERABLE).insert({
      template_id: created.id,
      phase_id: mapPhase(d.phase_id),
      deliverable_name: d.deliverable_name,
      deliverable_type: d.deliverable_type,
      is_mandatory: d.is_mandatory,
      sort_order: d.sort_order,
    })
  }
  for (const r of src.risks) {
    await platformDb.from(RISK).insert({
      template_id: created.id,
      risk_title: r.risk_title,
      risk_description: r.risk_description,
      risk_category: r.risk_category,
      likelihood: r.likelihood,
      impact: r.impact,
      sort_order: r.sort_order,
    })
  }
  for (const m of src.milestones) {
    await platformDb.from(MILESTONE).insert({
      template_id: created.id,
      phase_id: mapPhase(m.phase_id),
      milestone_name: m.milestone_name,
      milestone_description: m.milestone_description,
      sort_order: m.sort_order,
    })
  }
  for (const r of src.roles) {
    await platformDb.from(ROLE).insert({
      template_id: created.id,
      role_title: r.role_title,
      role_description: r.role_description,
      is_key_role: r.is_key_role,
      sort_order: r.sort_order,
    })
  }

  return getTemplateById(created.id)
}

export async function deleteTemplateChildren(templateId) {
  for (const table of CHILD_TABLES) {
    const { error } = await platformDb.from(table).delete().eq('template_id', templateId)
    throwIf(error, `Failed to clear ${table}`)
  }
}

export async function replaceTemplateChildren(templateId, bundle) {
  await deleteTemplateChildren(templateId)
  const phaseIdByNumber = new Map()

  for (const p of bundle.phases || []) {
    const { data, error } = await platformDb
      .from(PHASE)
      .insert({
        template_id: templateId,
        phase_number: p.phase_number,
        phase_name: p.phase_name,
        phase_description: p.phase_description ?? null,
        estimated_duration: p.estimated_duration ?? null,
        sort_order: p.sort_order ?? p.phase_number,
      })
      .select()
      .single()
    throwIf(error, 'Failed to save phases')
    phaseIdByNumber.set(p.phase_number, data.id)
    if (p.id) phaseIdByNumber.set(p.id, data.id)
  }

  const resolvePhaseId = (p) => {
    if (!p) return null
    if (phaseIdByNumber.has(p)) return phaseIdByNumber.get(p)
    const num = Number(p)
    return phaseIdByNumber.get(num) ?? null
  }

  for (const a of bundle.activities || []) {
    const { error } = await platformDb.from(ACTIVITY).insert({
      template_id: templateId,
      phase_id: resolvePhaseId(a.phase_id ?? a.phase_number),
      activity_name: a.activity_name,
      activity_description: a.activity_description ?? null,
      activity_type: a.activity_type ?? 'task',
      typical_duration: a.typical_duration ?? null,
      typical_effort: a.typical_effort ?? null,
      resource_type: a.resource_type ?? null,
      predecessor_notes: a.predecessor_notes ?? null,
      constraints: a.constraints ?? null,
      sort_order: a.sort_order ?? 0,
    })
    throwIf(error, 'Failed to save activities')
  }

  for (const d of bundle.deliverables || []) {
    const { error } = await platformDb.from(DELIVERABLE).insert({
      template_id: templateId,
      phase_id: resolvePhaseId(d.phase_id ?? d.phase_number),
      deliverable_name: d.deliverable_name,
      deliverable_type: d.deliverable_type ?? 'document',
      is_mandatory: !!d.is_mandatory,
      sort_order: d.sort_order ?? 0,
    })
    throwIf(error, 'Failed to save deliverables')
  }

  for (const r of bundle.risks || []) {
    const { error } = await platformDb.from(RISK).insert({
      template_id: templateId,
      risk_title: r.risk_title,
      risk_description: r.risk_description ?? null,
      risk_category: r.risk_category ?? null,
      likelihood: r.likelihood ?? null,
      impact: r.impact ?? null,
      sort_order: r.sort_order ?? 0,
    })
    throwIf(error, 'Failed to save risks')
  }

  for (const m of bundle.milestones || []) {
    const { error } = await platformDb.from(MILESTONE).insert({
      template_id: templateId,
      phase_id: resolvePhaseId(m.phase_id ?? m.phase_number),
      milestone_name: m.milestone_name,
      milestone_description: m.milestone_description ?? null,
      sort_order: m.sort_order ?? 0,
    })
    throwIf(error, 'Failed to save milestones')
  }

  for (const r of bundle.roles || []) {
    const { error } = await platformDb.from(ROLE).insert({
      template_id: templateId,
      role_title: r.role_title,
      role_description: r.role_description ?? null,
      is_key_role: !!r.is_key_role,
      sort_order: r.sort_order ?? 0,
    })
    throwIf(error, 'Failed to save roles')
  }
}

export async function getActivitiesByTemplate(templateId) {
  const { data, error } = await platformDb
    .from(ACTIVITY)
    .select('*, phase:pmo_industry_template_phases(phase_name, phase_number)')
    .eq('template_id', templateId)
    .order('sort_order')
  throwIf(error, 'Failed to load activities')
  return data || []
}

export async function getActivitiesByPhase(phaseId) {
  const { data, error } = await platformDb
    .from(ACTIVITY)
    .select('*')
    .eq('phase_id', phaseId)
    .order('sort_order')
  throwIf(error, 'Failed to load phase activities')
  return data || []
}

/** Build JSONB snapshot arrays for PM project copy from a loaded template. */
export function buildSnapshotFromTemplate(template) {
  return {
    included_phases: (template.phases || []).map((p, i) => ({
      id: p.id,
      phase_number: p.phase_number,
      phase_name: p.phase_name,
      phase_description: p.phase_description,
      estimated_duration: p.estimated_duration,
      sort_order: p.sort_order ?? i,
      included: true,
    })),
    included_activities: (template.activities || []).map((a, i) => ({
      id: a.id,
      phase_id: a.phase_id,
      activity_name: a.activity_name,
      activity_description: a.activity_description,
      activity_type: a.activity_type,
      typical_duration: a.typical_duration,
      typical_effort: a.typical_effort,
      resource_type: a.resource_type,
      predecessor_notes: a.predecessor_notes,
      constraints: a.constraints,
      sort_order: a.sort_order ?? i,
      included: true,
    })),
    included_deliverables: (template.deliverables || []).map((d, i) => ({
      id: d.id,
      phase_id: d.phase_id,
      deliverable_name: d.deliverable_name,
      deliverable_type: d.deliverable_type,
      is_mandatory: d.is_mandatory,
      sort_order: d.sort_order ?? i,
      included: true,
    })),
    included_risks: (template.risks || []).map((r, i) => ({
      id: r.id,
      risk_title: r.risk_title,
      risk_description: r.risk_description,
      risk_category: r.risk_category,
      likelihood: r.likelihood,
      impact: r.impact,
      sort_order: r.sort_order ?? i,
      included: true,
    })),
    included_milestones: (template.milestones || []).map((m, i) => ({
      id: m.id,
      phase_id: m.phase_id,
      milestone_name: m.milestone_name,
      milestone_description: m.milestone_description,
      sort_order: m.sort_order ?? i,
      included: true,
    })),
    included_roles: (template.roles || []).map((r, i) => ({
      id: r.id,
      role_title: r.role_title,
      role_description: r.role_description,
      is_key_role: r.is_key_role,
      sort_order: r.sort_order ?? i,
      included: true,
    })),
  }
}
