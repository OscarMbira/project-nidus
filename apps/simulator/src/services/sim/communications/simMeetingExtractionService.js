/**
 * Simulator — comm_meeting_extracted_* (sim schema) + practice_issues / practice_risks
 */
import { simDb } from '../../supabase/supabaseClient'
import { createPracticeIssue } from '../practiceIssueService'
import { createPracticeRisk } from '../practiceRiskService'

export async function listPendingForCurrentUser() {
  const { data: auth } = await simDb.auth.getUser()
  if (!auth?.user) return { issues: [], risks: [], error: new Error('Not authenticated') }
  const { data: runs, error: e1 } = await simDb.from('simulation_runs').select('id').eq('user_id', auth.user.id)
  if (e1) return { issues: [], risks: [], error: e1 }
  const runIds = (runs || []).map((r) => r.id)
  if (!runIds.length) return { issues: [], risks: [], error: null }

  const { data: pps } = await simDb.from('practice_projects').select('id').in('simulation_run_id', runIds)
  const ppids = (pps || []).map((p) => p.id)
  if (!ppids.length) return { issues: [], risks: [], error: null }

  const [{ data: issues }, { data: risks }] = await Promise.all([
    simDb.from('comm_meeting_extracted_issues').select('*').in('practice_project_id', ppids).in('status', ['pending_review', 'enriched']),
    simDb.from('comm_meeting_extracted_risks').select('*').in('practice_project_id', ppids).in('status', ['pending_review', 'enriched']),
  ])
  return { issues: issues || [], risks: risks || [], error: null }
}

async function getCurrentReviewerPublicUserId() {
  const { data: auth } = await simDb.auth.getUser()
  if (!auth?.user) return null
  const { data } = await simDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
  return data?.id ?? null
}

/** Map public.users.id → auth.users.id for FK columns on practice_* tables */
async function publicUserIdToAuthUid(publicUserId) {
  if (!publicUserId) return null
  const { data } = await simDb.from('users').select('auth_user_id').eq('id', publicUserId).maybeSingle()
  return data?.auth_user_id ?? null
}

function mapPriority(p) {
  const v = String(p || 'medium').toLowerCase()
  if (v === 'high' || v === 'critical') return v === 'critical' ? 'critical' : 'high'
  if (v === 'low') return 'low'
  return 'medium'
}

function mapProbImpact(label) {
  const v = String(label || 'medium').toLowerCase()
  if (v === 'high') return 4
  if (v === 'low') return 2
  return 3
}

function normalizeResponse(r) {
  const v = String(r || 'mitigate').toLowerCase()
  const allowed = ['avoid', 'transfer', 'mitigate', 'accept', 'exploit']
  return allowed.includes(v) ? v : 'mitigate'
}

export async function updateSimExtractedIssue(id, patch) {
  const reviewer = await getCurrentReviewerPublicUserId()
  const { data, error } = await simDb
    .from('comm_meeting_extracted_issues')
    .update({
      ...patch,
      reviewed_at: new Date().toISOString(),
      reviewed_by: patch.reviewed_by ?? reviewer,
    })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function updateSimExtractedRisk(id, patch) {
  const reviewer = await getCurrentReviewerPublicUserId()
  const { data, error } = await simDb
    .from('comm_meeting_extracted_risks')
    .update({
      ...patch,
      reviewed_at: new Date().toISOString(),
      reviewed_by: patch.reviewed_by ?? reviewer,
    })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

/**
 * Create sim.practice_issues draft from comm_meeting_extracted_issues and link extraction row.
 */
export async function approveAndCreatePracticeIssue(extractedRow, { ownerUserId, dueDate, priority } = {}) {
  const projectId = extractedRow.practice_project_id
  if (!projectId) throw new Error('Missing practice_project_id on extraction row')

  const authOwner = await publicUserIdToAuthUid(ownerUserId || null)
  const reviewer = await getCurrentReviewerPublicUserId()

  const issueData = {
    issue_title: extractedRow.ai_extracted_title,
    issue_description: extractedRow.ai_extracted_desc || extractedRow.ai_extracted_title,
    issue_type: 'other',
    issue_category: extractedRow.suggested_category || 'process',
    priority: mapPriority(priority || extractedRow.suggested_priority),
    severity: 'medium',
    status: 'draft',
    is_ai_generated: true,
    ai_source_type: 'meeting_extraction',
    due_date: dueDate || null,
  }
  if (authOwner) {
    issueData.assigned_to_user_id = authOwner
    issueData.reported_by_user_id = authOwner
  }

  const { success, data, error } = await createPracticeIssue(projectId, issueData)
  if (!success || !data) throw new Error(error || 'createPracticeIssue failed')

  const { error: uerr } = await simDb
    .from('comm_meeting_extracted_issues')
    .update({
      status: 'created',
      issue_id: data.id,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', extractedRow.id)

  if (uerr) throw uerr
  return data
}

/**
 * Create sim.practice_risks draft from comm_meeting_extracted_risks and link extraction row.
 */
export async function approveAndCreatePracticeRisk(extractedRow, { ownerUserId, dueDate } = {}) {
  const projectId = extractedRow.practice_project_id
  if (!projectId) throw new Error('Missing practice_project_id on extraction row')

  const authOwner = await publicUserIdToAuthUid(ownerUserId || null)
  const reviewer = await getCurrentReviewerPublicUserId()

  const riskData = {
    risk_title: extractedRow.ai_extracted_title,
    risk_description: extractedRow.ai_extracted_desc || '',
    risk_category: extractedRow.suggested_category || 'schedule',
    risk_type: 'threat',
    probability: mapProbImpact(extractedRow.suggested_probability),
    impact: mapProbImpact(extractedRow.suggested_impact),
    status: 'draft',
    is_ai_generated: true,
    ai_source_type: 'meeting_extraction',
    response_strategy: normalizeResponse(extractedRow.suggested_response),
    identified_date: dueDate || new Date().toISOString().split('T')[0],
  }

  const { data: auth } = await simDb.auth.getUser()
  if (auth?.user) {
    riskData.identified_by_user_id = auth.user.id
  }
  if (authOwner) {
    riskData.risk_owner_user_id = authOwner
  }

  const { success, data, error } = await createPracticeRisk(projectId, riskData)
  if (!success || !data) throw new Error(error || 'createPracticeRisk failed')

  const { error: uerr } = await simDb
    .from('comm_meeting_extracted_risks')
    .update({
      status: 'created',
      risk_id: data.id,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', extractedRow.id)

  if (uerr) throw uerr
  return data
}
