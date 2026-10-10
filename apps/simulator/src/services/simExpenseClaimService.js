/** Simulator expense claims — sim.project_expense_claims */
import { simDb } from './supabase/supabaseClient'
import { platformDb } from './supabase/supabaseClient'
import { parseApprovalChain } from './expenseClaimService'

async function getPublicUserId() {
  const {
    data: { user },
  } = await simDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

/** Sum of valid (amount > 0) line items, or null when there are none. */
function sumItems(items) {
  const valid = (items || []).filter((it) => it && Number(it.amount) > 0)
  if (valid.length === 0) return null
  return valid.reduce((sum, it) => sum + Number(it.amount), 0)
}

export async function saveSimDraft(payload) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const items = Array.isArray(payload.items) ? payload.items.filter((it) => it && Number(it.amount) > 0) : []
  const itemsTotal = sumItems(items)
  const row = {
    practice_project_id: payload.practice_project_id,
    submitted_by_user_id: uid,
    expense_type: payload.expense_type || 'other',
    expense_date: payload.expense_date || new Date().toISOString().slice(0, 10),
    amount: itemsTotal !== null ? itemsTotal : Number(payload.amount) || 0,
    currency: payload.currency || 'USD',
    description: payload.description || null,
    notes: payload.notes || null,
    claim_status: 'draft',
  }
  let claim
  if (payload.id) {
    const { data, error } = await simDb.from('project_expense_claims').update(row).eq('id', payload.id).select().single()
    if (error) throw error
    claim = data
  } else {
    const { data, error } = await simDb.from('project_expense_claims').insert(row).select().single()
    if (error) throw error
    claim = data
  }
  await saveSimExpenseClaimItems(claim.id, items)
  return claim
}

/** Replace all line items for a claim (delete-all + re-insert). */
export async function saveSimExpenseClaimItems(claimId, items) {
  await simDb.from('project_expense_claim_items').delete().eq('expense_claim_id', claimId)
  if (!items || items.length === 0) return []
  const rows = items.map((it, index) => ({
    expense_claim_id: claimId,
    description: it.description,
    amount: Number(it.amount),
    category_id: it.category_id || null,
    notes: it.notes || null,
    display_order: index,
  }))
  const { data, error } = await simDb.from('project_expense_claim_items').insert(rows).select()
  if (error) throw error
  return data
}

export async function getSimExpenseClaimItems(claimId) {
  const { data, error } = await simDb
    .from('project_expense_claim_items')
    .select('*, expense_categories(category_name)')
    .eq('expense_claim_id', claimId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function submitSimExpense(claimId) {
  const { data: claim, error: ce } = await simDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (ce) throw ce
  const { data: chainRaw, error: re } = await simDb.rpc('resolve_expense_approval_chain', {
    p_practice_project_id: claim.practice_project_id,
    p_submitter_public_user_id: claim.submitted_by_user_id,
    p_amount: claim.amount,
  })
  if (re) throw re
  const chain = parseApprovalChain(chainRaw)
  const total = chain.length
  if (total === 0) {
    const { data, error } = await simDb
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
  const { data, error } = await simDb
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

export async function getMySimExpenses() {
  const uid = await getPublicUserId()
  if (!uid) return []
  const { data, error } = await simDb
    .from('project_expense_claims')
    .select('*, practice_projects(project_code, project_name)')
    .eq('submitted_by_user_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getSimExpenseClaim(claimId) {
  const { data, error } = await simDb
    .from('project_expense_claims')
    .select('*, practice_projects(project_code, project_name)')
    .eq('id', claimId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Only a draft can be deleted — anything submitted is already in the approval trail. */
export async function deleteSimDraft(claimId) {
  const { error } = await simDb
    .from('project_expense_claims')
    .update({ is_deleted: true })
    .eq('id', claimId)
    .eq('claim_status', 'draft')
  if (error) throw error
  return { success: true }
}

export async function getSimPendingApprovals() {
  const uid = await getPublicUserId()
  if (!uid) return []
  const { data, error } = await simDb
    .from('project_expense_claims')
    .select('*, practice_projects(project_code, project_name)')
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

export async function approveSimStep(claimId, comments) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data: claim, error: fe } = await simDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (fe) throw fe
  if (!claim) throw new Error('Claim not found')
  const chain = parseApprovalChain(claim.approval_chain)
  const cur = claim.current_approval_level || 1
  const step = chain[cur - 1]
  if (!step || step.approver_user_id !== uid) {
    throw new Error('You are not the current approver for this claim')
  }
  const total = chain.length
  await simDb.from('expense_approval_steps').insert({
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
  const { data, error } = await simDb
    .from('project_expense_claims')
    .update({ claim_status: nextStatus, current_approval_level: nextLevel, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectSimStep(claimId, reason) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data: claim, error: fe } = await simDb.from('project_expense_claims').select('*').eq('id', claimId).single()
  if (fe) throw fe
  if (!claim) throw new Error('Claim not found')
  const chain = parseApprovalChain(claim.approval_chain)
  const cur = claim.current_approval_level || 1
  const step = chain[cur - 1]
  if (!step || step.approver_user_id !== uid) {
    throw new Error('You are not the current approver for this claim')
  }
  await simDb.from('expense_approval_steps').insert({
    expense_claim_id: claimId,
    approval_level: cur,
    approver_user_id: uid,
    action: 'rejected',
    comments: reason || null,
  })
  const { data, error } = await simDb
    .from('project_expense_claims')
    .update({ claim_status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markSimPaid(claimId) {
  const { data: claim, error: fe } = await simDb.from('project_expense_claims').select('claim_status').eq('id', claimId).single()
  if (fe) throw fe
  if (claim?.claim_status !== 'fully_approved') {
    throw new Error('Claim must be fully approved before marking as paid')
  }
  const { data, error } = await simDb
    .from('project_expense_claims')
    .update({ claim_status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSimApprovalHistory(claimId) {
  const { data, error } = await simDb
    .from('expense_approval_steps')
    .select('*')
    .eq('expense_claim_id', claimId)
    .order('actioned_at', { ascending: true })
  if (error) throw error
  return data || []
}

/** Claims awaiting payment (fully approved, not yet paid) — typically PMO/finance */
export async function getSimFullyApprovedClaims() {
  const { data, error } = await simDb
    .from('project_expense_claims')
    .select('*, practice_projects(project_code, project_name)')
    .eq('claim_status', 'fully_approved')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listSimThresholds(accountId) {
  const { data, error } = await simDb
    .from('expense_approval_thresholds')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('min_amount', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveSimThreshold(payload) {
  if (payload.id) {
    const { data, error } = await simDb
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
  const { data, error } = await simDb.from('expense_approval_thresholds').insert(payload).select().single()
  if (error) throw error
  return data
}
