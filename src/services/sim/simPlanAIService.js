import { simDb, platformDb } from '../supabase/supabaseClient'

export async function generatePlan({ prompt, industryTemplate, practiceProjectId, authUserId }) {
  const { data: fnData, error: fnError } = await platformDb.functions.invoke('plan-ai-generate', {
    body: { prompt, industryTemplate, practiceProjectId, sim: true },
  })

  let gen = {}
  if (!fnError && fnData && typeof fnData === 'object') {
    gen = {
      generated_phases: fnData.generated_phases ?? fnData.phases ?? null,
      generated_milestones: fnData.generated_milestones ?? null,
      generated_tasks: fnData.generated_tasks ?? null,
      generated_risks: fnData.generated_risks ?? null,
      ai_assumptions: fnData.ai_assumptions ?? null,
      ai_explanation: fnData.ai_explanation ?? (fnError ? String(fnError.message) : null),
    }
  } else if (fnError) {
    gen.ai_explanation = fnError.message || 'Edge Function plan-ai-generate not available.'
  }

  const { data, error } = await simDb
    .from('plan_ai_sessions')
    .insert({
      practice_project_id: practiceProjectId,
      prompt_text: prompt,
      industry_template: industryTemplate ?? null,
      generated_phases: gen.generated_phases,
      generated_milestones: gen.generated_milestones,
      generated_tasks: gen.generated_tasks,
      generated_risks: gen.generated_risks,
      ai_assumptions: gen.ai_assumptions,
      ai_explanation: gen.ai_explanation,
      status: 'generated',
      created_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return { session: data, edgeError: fnError || null }
}

export async function getAISessions(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_ai_sessions')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
