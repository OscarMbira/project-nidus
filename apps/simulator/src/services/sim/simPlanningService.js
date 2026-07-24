/**
 * Simulator PM planning (sim schema) — mirrors platform planning services; uses practice_project_id.
 */

import { simDb } from '../supabase/supabaseClient'

async function simUserIdFromAuth(authUserId) {
  const { data } = await simDb.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle()
  return data?.id || null
}

export async function simGetScopeManagementPlan(practiceProjectId) {
  const { data, error } = await simDb
    .from('scope_management_plans')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function simSaveScopeManagementPlan(practiceProjectId, payload, authUserId) {
  const existing = await simGetScopeManagementPlan(practiceProjectId)
  const row = {
    practice_project_id: practiceProjectId,
    scope_definition_approach: payload.scope_definition_approach ?? null,
    change_control_process: payload.change_control_process ?? null,
    scope_validation_method: payload.scope_validation_method ?? null,
    deliverable_acceptance_process: payload.deliverable_acceptance_process ?? null,
    roles_responsibilities: payload.roles_responsibilities ?? null,
    wbs_maintenance_process: payload.wbs_maintenance_process ?? null,
    scope_baseline_info: payload.scope_baseline_info ?? null,
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }
  if (existing.data?.id) {
    const { data, error } = await simDb
      .from('scope_management_plans')
      .update(row)
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await simDb.from('scope_management_plans').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

export async function simGetScopeStatement(practiceProjectId) {
  const { data, error } = await simDb
    .from('scope_statements')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function simSaveScopeStatement(practiceProjectId, payload) {
  const existing = await simGetScopeStatement(practiceProjectId)
  const row = {
    practice_project_id: practiceProjectId,
    project_description: payload.project_description ?? null,
    product_scope_description: payload.product_scope_description ?? null,
    in_scope: payload.in_scope?.length ? payload.in_scope : [],
    out_of_scope: payload.out_of_scope?.length ? payload.out_of_scope : [],
    key_deliverables: payload.key_deliverables?.length ? payload.key_deliverables : [],
    acceptance_criteria: payload.acceptance_criteria?.length ? payload.acceptance_criteria : [],
    constraints: payload.constraints?.length ? payload.constraints : [],
    assumptions: payload.assumptions?.length ? payload.assumptions : [],
    exclusions: payload.exclusions?.length ? payload.exclusions : [],
    revision_history: payload.revision_history || [],
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }
  if (existing.data?.id) {
    const { data, error } = await simDb
      .from('scope_statements')
      .update(row)
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await simDb.from('scope_statements').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

export async function simGetScheduleManagementPlan(practiceProjectId) {
  const { data, error } = await simDb
    .from('schedule_management_plans')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function simSaveScheduleManagementPlan(practiceProjectId, payload) {
  const existing = await simGetScheduleManagementPlan(practiceProjectId)
  const row = {
    practice_project_id: practiceProjectId,
    scheduling_methodology: payload.scheduling_methodology ?? null,
    scheduling_tool: payload.scheduling_tool ?? null,
    level_of_accuracy: payload.level_of_accuracy ?? null,
    units_of_measure: payload.units_of_measure ?? null,
    control_thresholds: payload.control_thresholds || {},
    reporting_formats: payload.reporting_formats ?? null,
    schedule_model_maintenance: payload.schedule_model_maintenance ?? null,
    variance_thresholds: payload.variance_thresholds || {},
    status: payload.status || 'draft',
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }
  if (existing.data?.id) {
    const { data, error } = await simDb
      .from('schedule_management_plans')
      .update(row)
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await simDb.from('schedule_management_plans').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

export async function simListRequirements(practiceProjectId) {
  const { data, error } = await simDb
    .from('requirements_register')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('requirement_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function simGetRequirement(practiceProjectId, reqId) {
  const { data, error } = await simDb
    .from('requirements_register')
    .select('*')
    .eq('id', reqId)
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function simSaveRequirement(practiceProjectId, payload, authUserId) {
  const uid = await simUserIdFromAuth(authUserId)
  const row = {
    practice_project_id: practiceProjectId,
    requirement_code: payload.requirement_code || null,
    name: payload.name,
    description: payload.description ?? null,
    category: payload.category || null,
    source_stakeholder_id: payload.source_stakeholder_id || null,
    priority: payload.priority || null,
    status: payload.status || 'draft',
    acceptance_criteria: payload.acceptance_criteria ?? null,
    traceability_tag: payload.traceability_tag ?? null,
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await simDb
      .from('requirements_register')
      .update(row)
      .eq('id', payload.id)
      .eq('practice_project_id', practiceProjectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }
  const { data, error } = await simDb.from('requirements_register').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

export async function simSoftDeleteRequirement(reqId, practiceProjectId) {
  const { error } = await simDb
    .from('requirements_register')
    .update({ is_deleted: true })
    .eq('id', reqId)
    .eq('practice_project_id', practiceProjectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function simListTraceability(practiceProjectId) {
  const { data: reqs, error: e1 } = await simDb
    .from('requirements_register')
    .select('id, requirement_code, name')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (e1) return { success: false, error: e1.message }
  const ids = (reqs || []).map((r) => r.id)
  if (ids.length === 0) return { success: true, data: [], requirements: [] }
  const { data: rows, error: e2 } = await simDb
    .from('requirements_traceability_matrix')
    .select('*')
    .in('requirement_id', ids)
    .eq('is_deleted', false)
  if (e2) return { success: false, error: e2.message }
  return { success: true, data: rows || [], requirements: reqs || [] }
}

export async function simSaveTraceabilityRow(payload) {
  const row = {
    requirement_id: payload.requirement_id,
    wbs_node_id: payload.wbs_node_id || null,
    deliverable_description: payload.deliverable_description ?? null,
    linked_test_id: payload.linked_test_id || null,
    status: payload.status || 'open',
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await simDb
      .from('requirements_traceability_matrix')
      .update(row)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await simDb.from('requirements_traceability_matrix').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function simSoftDeleteTraceRow(id) {
  const { error } = await simDb
    .from('requirements_traceability_matrix')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function simListWbsNodes(practiceProjectId) {
  const { data, error } = await simDb
    .from('wbs_nodes')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
    .order('wbs_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function simSaveWbsNode(practiceProjectId, payload) {
  const row = {
    practice_project_id: practiceProjectId,
    parent_id: payload.parent_id || null,
    wbs_code: payload.wbs_code || null,
    title: payload.title,
    description: payload.description ?? null,
    level_num: payload.level_num ?? 1,
    work_package_id: payload.work_package_id || null,
    sort_order: payload.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await simDb
      .from('wbs_nodes')
      .update(row)
      .eq('id', payload.id)
      .eq('practice_project_id', practiceProjectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await simDb.from('wbs_nodes').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function simSoftDeleteWbsNode(nodeId, practiceProjectId) {
  const { error } = await simDb
    .from('wbs_nodes')
    .update({ is_deleted: true })
    .eq('id', nodeId)
    .eq('practice_project_id', practiceProjectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function simListActivities(practiceProjectId) {
  const { data, error } = await simDb
    .from('activity_list')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('activity_code', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function simGetActivity(practiceProjectId, actId) {
  const { data, error } = await simDb
    .from('activity_list')
    .select('*')
    .eq('id', actId)
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function simSaveActivity(practiceProjectId, payload, authUserId) {
  const uid = await simUserIdFromAuth(authUserId)
  const row = {
    practice_project_id: practiceProjectId,
    wbs_node_id: payload.wbs_node_id || null,
    activity_code: payload.activity_code || null,
    name: payload.name,
    description: payload.description ?? null,
    is_milestone: !!payload.is_milestone,
    planned_start_date: payload.planned_start_date || null,
    planned_end_date: payload.planned_end_date || null,
    actual_start_date: payload.actual_start_date || null,
    actual_end_date: payload.actual_end_date || null,
    estimation_technique: payload.estimation_technique || null,
    optimistic_duration: payload.optimistic_duration ?? null,
    most_likely_duration: payload.most_likely_duration ?? null,
    pessimistic_duration: payload.pessimistic_duration ?? null,
    duration_unit: payload.duration_unit || 'days',
    basis_of_estimate: payload.basis_of_estimate ?? null,
    resource_requirements: payload.resource_requirements ?? null,
    constraints: payload.constraints ?? null,
    assumptions: payload.assumptions ?? null,
    status: payload.status || 'not_started',
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await simDb
      .from('activity_list')
      .update(row)
      .eq('id', payload.id)
      .eq('practice_project_id', practiceProjectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await simDb.from('activity_list').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function simListDependencies(practiceProjectId) {
  const { data, error } = await simDb
    .from('activity_dependencies')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function simSaveDependency(practiceProjectId, payload) {
  const row = {
    practice_project_id: practiceProjectId,
    predecessor_activity_id: payload.predecessor_activity_id,
    successor_activity_id: payload.successor_activity_id,
    dependency_type: payload.dependency_type || 'FS',
    lag_days: payload.lag_days ?? 0,
    dependency_category: payload.dependency_category || null,
    notes: payload.notes ?? null,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { data, error } = await simDb
      .from('activity_dependencies')
      .update(row)
      .eq('id', payload.id)
      .eq('practice_project_id', practiceProjectId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await simDb.from('activity_dependencies').insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function simSoftDeleteDependency(id, practiceProjectId) {
  const { error } = await simDb
    .from('activity_dependencies')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('practice_project_id', practiceProjectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
