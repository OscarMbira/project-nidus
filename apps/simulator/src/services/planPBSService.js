/**
 * PBS / PFD (M3) — public schema
 */

import { platformDb } from './supabase/supabaseClient'

function nestPBS(flat, parentId = null) {
  return (flat || [])
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((n) => ({
      ...n,
      children: nestPBS(flat, n.id),
    }))
}

export async function getPBSTree(projectId) {
  const { data, error } = await platformDb
    .from('plan_pbs_nodes')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return nestPBS(data || [])
}

export async function createPBSNode(payload) {
  const row = {
    project_id: payload.project_id,
    parent_id: payload.parent_id ?? null,
    name: payload.name,
    description: payload.description ?? null,
    product_type: payload.product_type || 'product',
    quality_criteria: payload.quality_criteria ?? null,
    acceptance_criteria: payload.acceptance_criteria ?? null,
    status: payload.status || 'not_started',
    owner_id: payload.owner_id ?? null,
    approval_required: !!payload.approval_required,
    linked_work_package_id: payload.linked_work_package_id ?? null,
    linked_milestone_id: payload.linked_milestone_id ?? null,
    sort_order: payload.sort_order ?? 0,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await platformDb.from('plan_pbs_nodes').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updatePBSNode(id, patch) {
  const { data, error } = await platformDb
    .from('plan_pbs_nodes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePBSNode(id) {
  const { data: children, error: cErr } = await platformDb.from('plan_pbs_nodes').select('id').eq('parent_id', id)
  if (cErr) throw cErr
  if (children?.length) {
    throw new Error('Remove or reassign child PBS nodes before deleting this node.')
  }
  const { error } = await platformDb.from('plan_pbs_nodes').delete().eq('id', id)
  if (error) throw error
}

export async function getPFDEdges(projectId) {
  const { data, error } = await platformDb.from('plan_pfd_edges').select('*').eq('project_id', projectId)
  if (error) throw error
  return data || []
}

export async function createPFDEdge(payload) {
  const row = {
    project_id: payload.project_id,
    from_node_id: payload.from_node_id,
    to_node_id: payload.to_node_id,
    relationship_type: payload.relationship_type || 'produces',
    notes: payload.notes ?? null,
  }
  const { data, error } = await platformDb.from('plan_pfd_edges').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deletePFDEdge(id) {
  const { error } = await platformDb.from('plan_pfd_edges').delete().eq('id', id)
  if (error) throw error
}

export async function approveProduct(nodeId, approverId) {
  const { data, error } = await platformDb
    .from('plan_pbs_nodes')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', nodeId)
    .select()
    .single()
  if (error) throw error
  return data
}
