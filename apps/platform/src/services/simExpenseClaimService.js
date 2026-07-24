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

export async function saveSimDraft(payload) {
  const uid = await getPublicUserId()
  if (!uid) throw new Error('Not authenticated')
  const row = {
    practice_project_id: payload.practice_project_id,
    submitted_by_user_id: uid,
    expense_type: payload.expense_type || 'other',
    expense_date: payload.expense_date || new Date().toISOString().slice(0, 10),
    amount: Number(payload.amount) || 0,
    currency: payload.currency || 'USD',
    description: payload.description || null,
    claim_status: 'draft',
  }
  if (payload.id) {
    const { data, error } = await simDb.from('project_expense_claims').update(row).eq('id', payload.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('project_expense_claims').insert(row).select().single()
  if (error) throw error
  return data
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
    .select('*')
    .eq('submitted_by_user_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
