/**
 * AI plan sessions (M5) — generation via Edge Function `plan-ai-generate` when deployed.
 */

import { platformDb } from './supabase/supabaseClient'

const EDGE_FN = 'plan-ai-generate'

export async function generatePlan({ prompt, industryTemplate, projectId, organisationId, createdByProfileId }) {
  const { data: fnData, error: fnError } = await platformDb.functions.invoke(EDGE_FN, {
    body: {
      prompt,
      industryTemplate: industryTemplate || null,
      projectId,
    },
  })

  let generated = {
    generated_phases: null,
    generated_milestones: null,
    generated_tasks: null,
    generated_risks: null,
    ai_assumptions: null,
    ai_explanation: null,
  }

  if (!fnError && fnData && typeof fnData === 'object') {
    generated = {
      generated_phases: fnData.generated_phases ?? fnData.phases ?? null,
      generated_milestones: fnData.generated_milestones ?? fnData.milestones ?? null,
      generated_tasks: fnData.generated_tasks ?? fnData.tasks ?? null,
      generated_risks: fnData.generated_risks ?? fnData.risks ?? null,
      ai_assumptions: fnData.ai_assumptions ?? fnData.assumptions ?? null,
      ai_explanation: fnData.ai_explanation ?? fnData.explanation ?? null,
    }
  } else if (fnError) {
    generated.ai_explanation =
      (fnError.message || 'AI Edge Function unavailable.') +
      ' Configure the plan-ai-generate Edge Function or retry later.'
  }

  const row = {
    project_id: projectId,
    organisation_id: organisationId,
    prompt_text: prompt,
    industry_template: industryTemplate ?? null,
    generated_phases: generated.generated_phases,
    generated_milestones: generated.generated_milestones,
    generated_tasks: generated.generated_tasks,
    generated_risks: generated.generated_risks,
    ai_assumptions: generated.ai_assumptions,
    ai_explanation: generated.ai_explanation,
    status: 'generated',
    created_by: createdByProfileId ?? null,
  }

  const { data, error } = await platformDb.from('plan_ai_sessions').insert(row).select().single()
  if (error) throw error
  return { session: data, edgeError: fnError || null }
}

export async function getAISessions(projectId) {
  const { data, error } = await platformDb
    .from('plan_ai_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAISession(id) {
  const { data, error } = await platformDb.from('plan_ai_sessions').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/**
 * Persists accepted AI output: updates session, inserts tasks from generated_tasks JSON when present.
 */
export async function acceptGeneratedPlan(sessionId, acceptedByProfileId) {
  const session = await getAISession(sessionId)
  const projectId = session.project_id
  const tasksJson = session.generated_tasks
  let createdTasks = 0

  const { data: statusRow, error: stErr } = await platformDb.from('task_statuses').select('id').limit(1).maybeSingle()
  if (stErr) throw stErr
  const defaultStatusId = statusRow?.id

  if (Array.isArray(tasksJson) && tasksJson.length && defaultStatusId) {
    for (const t of tasksJson) {
      const name = t.name || t.task_name || 'Generated task'
      const duration = Number(t.duration_days) || Number(t.duration) || null
      const row = {
        task_name: name,
        project_id: projectId,
        status_id: defaultStatusId,
        task_description: t.description ?? null,
        start_date: t.start_date ?? null,
        due_date: t.due_date ?? null,
        estimated_duration_days: duration,
        is_milestone: !!t.is_milestone,
        is_deleted: false,
      }
      const { error: insErr } = await platformDb.from('tasks').insert(row)
      if (!insErr) createdTasks += 1
    }
  }

  const { data, error } = await platformDb
    .from('plan_ai_sessions')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: acceptedByProfileId ?? null,
    })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return { session: data, createdTasks }
}
