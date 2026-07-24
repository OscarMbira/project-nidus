/**
 * comm_meeting_extracted_* — approve/reject/enrich and create Issue/Risk rows.
 */
import { platformDb } from '../supabase/supabaseClient'
import { createIssue } from '../issueService'
import { createRisk } from '../riskService'
import { getIssueRegisterByProject } from '../issueRegisterService'

export async function listPendingExtractedIssues(projectId) {
  const { data, error } = await platformDb
    .from('comm_meeting_extracted_issues')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending_review', 'enriched'])
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function listPendingExtractedRisks(projectId) {
  const { data, error } = await platformDb
    .from('comm_meeting_extracted_risks')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending_review', 'enriched'])
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function listAllPendingForAccount(accountId) {
  const { data: projects, error: e1 } = await platformDb.from('projects').select('id').eq('account_id', accountId).eq('is_deleted', false)
  if (e1) return { issues: [], risks: [], error: e1 }
  const pids = (projects || []).map((p) => p.id)
  if (!pids.length) return { issues: [], risks: [], error: null }

  const [{ data: issues, error: e2 }, { data: risks, error: e3 }] = await Promise.all([
    platformDb
      .from('comm_meeting_extracted_issues')
      .select('*')
      .in('project_id', pids)
      .in('status', ['pending_review', 'enriched']),
    platformDb
      .from('comm_meeting_extracted_risks')
      .select('*')
      .in('project_id', pids)
      .in('status', ['pending_review', 'enriched']),
  ])
  return {
    issues: issues || [],
    risks: risks || [],
    error: e2 || e3 || null,
  }
}

export async function updateExtractedIssue(id, patch) {
  const { data, error } = await platformDb
    .from('comm_meeting_extracted_issues')
    .update({ ...patch, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function updateExtractedRisk(id, patch) {
  const { data, error } = await platformDb
    .from('comm_meeting_extracted_risks')
    .update({ ...patch, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function approveAndCreateIssue(extractedRow, { ownerUserId, dueDate, priority } = {}) {
  const register = await getIssueRegisterByProject(extractedRow.project_id)
  if (!register?.id) throw new Error('Issue register not found for project')

  const issueData = {
    issue_title: extractedRow.ai_extracted_title,
    issue_description: extractedRow.ai_extracted_desc || extractedRow.ai_extracted_title,
    issue_type: 'other',
    issue_category: extractedRow.suggested_category || 'process',
    priority: priority || extractedRow.suggested_priority || 'medium',
    severity: 'medium',
    status: 'draft',
    is_ai_generated: true,
    ai_source_type: 'meeting_extraction',
    due_date: dueDate || null,
    owner_id: ownerUserId || null,
  }

  const created = await createIssue(register.id, issueData)
  await updateExtractedIssue(extractedRow.id, {
    status: 'created',
    issue_id: created.id,
    reviewed_by: ownerUserId || null,
  })
  return created
}

export async function approveAndCreateRisk(extractedRow, { ownerUserId, dueDate } = {}) {
  const { data: auth } = await platformDb.auth.getUser()
  if (!auth?.user) throw new Error('Not authenticated')
  const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
  if (!userRecord?.id) throw new Error('User record missing')

  const riskData = {
    project_id: extractedRow.project_id,
    risk_title: extractedRow.ai_extracted_title,
    event_description: extractedRow.ai_extracted_desc || '',
    risk_category: extractedRow.suggested_category || 'schedule',
    pre_probability: 3,
    pre_impact: 3,
    status: 'draft',
    is_ai_generated: true,
    ai_source_type: 'meeting_extraction',
    risk_author_id: userRecord.id,
    risk_owner_id: ownerUserId || null,
    date_registered: dueDate || new Date().toISOString().split('T')[0],
    response_category: extractedRow.suggested_response || 'mitigate',
  }

  const { success, data, error } = await createRisk(riskData)
  if (!success || !data) throw new Error(error || 'createRisk failed')

  await updateExtractedRisk(extractedRow.id, {
    status: 'created',
    risk_id: data.id,
    reviewed_by: ownerUserId || null,
  })
  return data
}

export async function insertExtractedFromAi(meetingId, projectId, aiPayload) {
  const issues = aiPayload?.issues || []
  const risks = aiPayload?.risks || []
  const actions = aiPayload?.action_items || []

  for (const i of issues) {
    await platformDb.from('comm_meeting_extracted_issues').insert({
      meeting_id: meetingId,
      project_id: projectId,
      ai_extracted_title: i.title,
      ai_extracted_desc: i.description || '',
      suggested_priority: i.priority || 'medium',
      suggested_category: i.category || null,
      source_quote: i.source_quote || null,
      status: 'pending_review',
    })
  }
  for (const r of risks) {
    await platformDb.from('comm_meeting_extracted_risks').insert({
      meeting_id: meetingId,
      project_id: projectId,
      ai_extracted_title: r.title,
      ai_extracted_desc: r.description || '',
      suggested_probability: r.probability || 'medium',
      suggested_impact: r.impact || 'medium',
      suggested_category: r.category || null,
      suggested_response: r.response || 'mitigate',
      source_quote: r.source_quote || null,
      status: 'pending_review',
    })
  }
  for (const a of actions) {
    await platformDb.from('comm_meeting_action_items').insert({
      meeting_id: meetingId,
      description: a.description || '',
      assigned_to_name: a.owner_name || null,
      due_date: a.due_date || null,
      priority: a.priority || 'medium',
      status: 'pending',
      source_quote: a.source_quote || null,
    })
  }
}
