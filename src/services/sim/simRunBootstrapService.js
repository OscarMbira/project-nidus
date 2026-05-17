/**
 * v505 Bootstrap — create simulation run, practice project, NPC assignments, seed risks/EVM slices.
 */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'
import { createPracticeRisk } from './practiceRiskService'

const DIFFICULTY_MOD = {
  easy: 0.8,
  standard: 1.0,
  hard: 1.2,
  expert: 1.5,
}

const ALL_NPC_ROLES = [
  'project_sponsor',
  'programme_manager',
  'project_manager',
  'team_manager',
  'project_assurance',
  'change_authority',
  'quality_assurance',
  'team_member',
  'project_board_member',
]

export async function assignNPCCharacters(runId, userRole) {
  const { data: chars, error } = await simDb.from('npc_characters').select('id, role_name')
  if (error) return { success: false, error: error.message }

  const rows = []
  for (const role of ALL_NPC_ROLES) {
    if (role === userRole) continue
    const ch = (chars || []).find((c) => c.role_name === role)
    if (!ch) continue
    rows.push({ run_id: runId, role_name: role, npc_character_id: ch.id })
  }

  if (rows.length) {
    const { error: insErr } = await simDb.from('npc_run_assignments').insert(rows)
    if (insErr) return { success: false, error: insErr.message }
  }
  return { success: true, error: null, count: rows.length }
}

export async function seedProjectArtefacts(practiceProjectId, scenarioId) {
  const { data: seeds, error } = await simDb
    .from('scenario_seed_data')
    .select('seed_type, seed_payload')
    .eq('scenario_id', scenarioId)
    .eq('is_active', true)

  if (error) return { success: false, error: error.message }

  let risks = 0
  for (const s of seeds || []) {
    if (s.seed_type === 'risks' && Array.isArray(s.seed_payload?.items)) {
      for (const item of s.seed_payload.items) {
        const r = await createPracticeRisk(practiceProjectId, {
          risk_title: item.risk_title || 'Scenario risk',
          risk_description: item.risk_description || '',
          risk_level: item.risk_level || 'medium',
          status: item.status || 'open',
        })
        if (r.success) risks += 1
      }
    }
  }
  return { success: true, risksSeeded: risks }
}

export async function seedWPDData(practiceProjectId, scenarioId, runId) {
  const { data: seeds } = await simDb
    .from('scenario_seed_data')
    .select('seed_type, seed_payload')
    .eq('scenario_id', scenarioId)

  let curve = []
  let points = []
  for (const s of seeds || []) {
    if (s.seed_type === 'evm_baseline') curve = s.seed_payload?.curve || []
    if (s.seed_type === 'period_actuals') points = s.seed_payload?.points || []
  }

  const today = new Date().toISOString().slice(0, 10)
  const pv0 = curve[0]?.pv ?? 0
  const ac0 = points[0]?.ac ?? 0

  const { error } = await simDb.from('project_evm_snapshots').upsert(
    {
      practice_project_id: practiceProjectId,
      period_date: today,
      planned_value: pv0,
      earned_value: pv0 * 0.9,
      actual_cost: ac0,
      notes: `v505 bootstrap run=${runId}`,
    },
    { onConflict: 'practice_project_id,period_date' },
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * @param {{ scenarioId: string, userRole: string, methodology?: string, difficulty?: keyof typeof DIFFICULTY_MOD }} opts
 */
export async function startSimulationRun(opts) {
  try {
    const authUserId = await getSimAuthUserId()
    const methodology = opts.methodology || 'traditional'
    const difficulty = opts.difficulty || 'standard'
    const mod = DIFFICULTY_MOD[difficulty] ?? 1.0

    const { data: scenario, error: scErr } = await simDb.from('scenarios').select('*').eq('id', opts.scenarioId).single()
    if (scErr || !scenario) return { success: false, error: scErr?.message || 'Scenario not found' }

    const { data: run, error: runErr } = await simDb
      .from('simulation_runs')
      .insert({
        user_id: authUserId,
        scenario_id: opts.scenarioId,
        status: 'in_progress',
        methodology,
        user_role: opts.userRole,
        difficulty_modifier: mod,
        current_phase: scenario.project_duration_days ? 'initiation' : 'initiation',
        simulation_state: { v505: true, difficulty },
      })
      .select()
      .single()

    if (runErr || !run) return { success: false, error: runErr?.message || 'Failed to create run' }

    const { data: practiceProject, error: ppErr } = await simDb
      .from('practice_projects')
      .insert({
        user_id: authUserId,
        simulation_run_id: run.id,
        project_name: `${scenario.name} (Live Sim)`,
        project_description: scenario.description || scenario.short_description || '',
        project_code: `SIM-NPC-${String(run.id).slice(0, 8)}`,
        is_practice_mode: true,
      })
      .select()
      .single()

    if (ppErr || !practiceProject) {
      await simDb.from('simulation_runs').delete().eq('id', run.id)
      return { success: false, error: ppErr?.message || 'Failed to create practice project' }
    }

    await simDb
      .from('simulation_runs')
      .update({
        practice_project_id: practiceProject.id,
        sim_day: 1,
        sim_start_date: new Date().toISOString().slice(0, 10),
        active_stage: 'initiation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    const npcRes = await assignNPCCharacters(run.id, opts.userRole)
    if (!npcRes.success) return { success: false, error: npcRes.error }

    await seedProjectArtefacts(practiceProject.id, opts.scenarioId)
    await seedWPDData(practiceProject.id, opts.scenarioId, run.id)

    await generateInitialNpcEvent(run.id)

    return {
      success: true,
      runId: run.id,
      practiceProjectId: practiceProject.id,
      npcAssignments: npcRes.count,
    }
  } catch (e) {
    console.error('startSimulationRun', e)
    return { success: false, error: e.message || 'Bootstrap failed' }
  }
}

async function generateInitialNpcEvent(runId) {
  const { data: tmpl } = await simDb.from('npc_event_templates').select('*').eq('template_code', 'sponsor_status_board_deadline').maybeSingle()
  if (!tmpl) return

  const { data: assigns } = await simDb.from('npc_run_assignments').select('*').eq('run_id', runId)
  const npcId = (assigns || []).find((a) => a.role_name === tmpl.emitting_role)?.npc_character_id || null

  await simDb.from('ai_events').insert({
    run_id: runId,
    event_type: 'npc_template',
    event_category: tmpl.category,
    event_name: tmpl.title,
    event_description: tmpl.description,
    severity: tmpl.severity,
    triggered_at: new Date().toISOString(),
    response_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
    npc_character_id: npcId,
    npc_event_template_id: tmpl.id,
    response_options: tmpl.options,
    max_score: 100,
  })
}
