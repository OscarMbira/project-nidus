/**
 * Expense claims — hierarchical approval (Platform)
 */

import { platformDb } from './supabase/supabaseClient'

async function getPublicUserId() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

/** Normalise JSONB approval_chain from Supabase */
export function parseApprovalChain(chain) {
  if (chain == null) return []
  if (Array.isArray(chain)) return chain
  if (typeof chain === 'string') {
    try {
      const p = JSON.parse(chain)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

export async function saveDraft(payload) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const row = {
    project_id: payload.project_id,
    submitted_by_user_id: uid,
    expense_type: payload.expense_type || 'other',
    expense_date: payload.expense_date || new Date().toISOString().slice(0, 10),
    amount: Number(payload.amount) || 0,
    currency: payload.currency || 'USD',
    description: payload.description || null,
    receipt_url: payload.receipt_url || null,
    vendor_name: payload.vendor_name || null,
    claim_status: 'draft',
    is_reimbursable: payload.is_reimbursable !== false,
  }
  if (payload.id) {
    const { data, error } = await platformDb.from('project_expense_claims').update(row).eq('id', payload.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('project_expense_claims').insert(row).select().single()
  if (error) throw error
  return data
}

export async function submitExpense(claimId) {
  const { data: claim, error: ce } = await platformDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (ce) throw ce
  const { data: chainRaw, error: re } = await platformDb.rpc('resolve_expense_approval_chain', {
    p_project_id: claim.project_id,
    p_submitter_user_id: claim.submitted_by_user_id,
    p_amount: claim.amount,
  })
  if (re) throw re
  const chain = parseApprovalChain(chainRaw)
  const total = chain.length
  if (total === 0) {
    const { data, error } = await platformDb
      .from('project_expense_claims')
      .update({
        claim_status: 'fully_approved',
        current_approval_level: null,
        total_approval_levels: 0,
        approval_chain: chain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .update({
      claim_status: 'pending_l1',
      current_approval_level: 1,
      total_approval_levels: total,
      approval_chain: chain,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyExpenses() {
  const uid = await getPublicUserId()
  if (!uid) return []
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .select('*, projects(project_code, project_name)')
    .eq('submitted_by_user_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPendingApprovals() {
  const uid = await getPublicUserId()
  if (!uid) return []
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .select('*, projects(project_code, project_name)')
    .in('claim_status', ['pending_l1', 'pending_l2', 'pending_l3'])
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = data || []
  return rows.filter((c) => {
    const chain = parseApprovalChain(c.approval_chain)
    const cur = c.current_approval_level || 1
    const step = chain[cur - 1]
    return step && step.approver_user_id === uid
  })
}

export async function approveStep(claimId, comments) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data: claim, error: fe } = await platformDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (fe) throw fe
  if (!claim) throw new Error('Claim not found')
  const chain = parseApprovalChain(claim.approval_chain)
  const cur = claim.current_approval_level || 1
  const step = chain[cur - 1]
  if (!step || step.approver_user_id !== uid) {
    throw new Error('You are not the current approver for this claim')
  }
  const total = chain.length
  await platformDb.from('expense_approval_steps').insert({
    expense_claim_id: claimId,
    approval_level: cur,
    approver_user_id: uid,
    action: 'approved',
    comments: comments || null,
  })
  let nextStatus
  let nextLevel
  if (cur >= total) {
    nextStatus = 'fully_approved'
    nextLevel = null
  } else {
    nextLevel = cur + 1
    nextStatus = `pending_l${nextLevel}`
  }
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .update({
      claim_status: nextStatus,
      current_approval_level: nextLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectStep(claimId, reason) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data: claim, error: fe } = await platformDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (fe) throw fe
  if (!claim) throw new Error('Claim not found')
  const chain = parseApprovalChain(claim.approval_chain)
  const cur = claim.current_approval_level || 1
  const step = chain[cur - 1]
  if (!step || step.approver_user_id !== uid) {
    throw new Error('You are not the current approver for this claim')
  }
  await platformDb.from('expense_approval_steps').insert({
    expense_claim_id: claimId,
    approval_level: cur,
    approver_user_id: uid,
    action: 'rejected',
    comments: reason || null,
  })
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .update({ claim_status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markPaid(claimId) {
  const { data: claim, error: fe } = await platformDb.from('project_expense_claims').select('claim_status').eq('id', claimId).single()
  if (fe) throw fe
  if (claim?.claim_status !== 'fully_approved') {
    throw new Error('Claim must be fully approved before marking as paid')
  }
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .update({ claim_status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getApprovalHistory(claimId) {
  const { data, error } = await platformDb
    .from('expense_approval_steps')
    .select('*')
    .eq('expense_claim_id', claimId)
    .order('actioned_at', { ascending: true })
  if (error) throw error
  return data || []
}

/** Claims awaiting payment (fully approved, not yet paid) — typically PMO/finance */
export async function getFullyApprovedClaims() {
  const { data, error } = await platformDb
    .from('project_expense_claims')
    .select('*, projects(project_code, project_name)')
    .eq('claim_status', 'fully_approved')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listThresholds(accountId) {
  const { data, error } = await platformDb
    .from('expense_approval_thresholds')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('min_amount', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveThreshold(payload) {
  if (payload.id) {
    const { data, error } = await platformDb
      .from('expense_approval_thresholds')
      .update({
        threshold_name: payload.threshold_name,
        min_amount: payload.min_amount,
        max_amount: payload.max_amount,
        required_approval_level: payload.required_approval_level,
        is_active: payload.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('expense_approval_thresholds').insert(payload).select().single()
  if (error) throw error
  return data
}
