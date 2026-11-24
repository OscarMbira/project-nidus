/**
 * v1354 — portfolio scoring and scenarios. Platform and Simulator only (D10).
 */
import { platformDb, simDb } from '@nidus/supabase'
import { confidenceToScore } from '../engine/portfolioScoring.js'

function fail(error, fallback) {
  const msg = error?.message || fallback
  if (/SCENARIO_NOTES/.test(msg)) throw new Error('Write a justification before you approve or reject.')
  if (/SCENARIO_STATE/.test(msg)) throw new Error(msg.replace(/^.*SCENARIO_STATE:\s*/, ''))
  if (/SCENARIO_FORBIDDEN/.test(msg)) throw new Error('You cannot change this scenario.')
  throw new Error(msg || fallback)
}

export const SUGGESTED_CRITERIA = [
  { name: 'Strategic fit', weight_percent: 25, scale_guidance: '1 is a weak fit with the stated strategy. 5 is essential to it.', sort_order: 10 },
  { name: 'Financial value', weight_percent: 25, scale_guidance: '1 returns little for the cost. 5 returns far more than it costs.', sort_order: 20 },
  { name: 'Risk', weight_percent: 25, scale_guidance: '1 is hard to deliver. 5 is well understood and controllable. Score the opportunity, not the threat.', sort_order: 30 },
  { name: 'Urgency', weight_percent: 25, scale_guidance: '1 can wait. 5 has a date that cannot move.', sort_order: 40 },
]

export function createPortfolioOptData(isSim) {
  const db = isSim ? simDb : platformDb
  const portfolios = isSim ? 'practice_portfolios' : 'portfolios'
  const links = isSim ? 'practice_portfolio_projects' : 'portfolio_projects'
  const linkPortfolio = isSim ? 'practice_portfolio_id' : 'portfolio_id'
  const linkProject = isSim ? 'practice_project_id' : 'project_id'
  const projects = isSim ? 'practice_projects' : 'projects'

  async function listPortfolios() {
    const { data, error } = await db.from(portfolios).select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name')
    if (error) fail(error, 'Could not load portfolios.')
    return data || []
  }

  async function portfolioByKey(key) {
    if (!key) return null
    const uuid = /^[0-9a-f-]{36}$/i.test(key)
    let q = db.from(portfolios).select('id, portfolio_name, portfolio_code, created_at, updated_at, created_by, updated_by').eq('is_deleted', false)
    q = uuid ? q.eq('id', key) : q.eq('portfolio_code', key)
    const { data, error } = await q.maybeSingle()
    if (error) fail(error, 'Could not load the portfolio.')
    return data || null
  }

  async function projectsIn(portfolioId) {
    const { data: rows, error } = await db.from(links).select('*').eq(linkPortfolio, portfolioId)
    if (error) fail(error, 'Could not load portfolio projects.')
    const ids = (rows || []).map((r) => r[linkProject]).filter(Boolean)
    if (!ids.length) return []
    const { data: names, error: nameError } = await db.from(projects).select('id, project_name, project_code, planned_start_date').in('id', ids)
    if (nameError) fail(nameError, 'Could not load projects.')
    const byId = Object.fromEntries((names || []).map((p) => [p.id, p]))
    return (rows || []).map((r) => ({ ...r, project: byId[r[linkProject]] || { id: r[linkProject], project_name: 'Project' }, projectId: r[linkProject] }))
  }

  async function criteria(portfolioId) {
    const { data, error } = await db.from('portfolio_scoring_criteria').select('*').eq('portfolio_id', portfolioId).order('sort_order').order('name')
    if (error) fail(error, 'Could not load criteria.')
    return data || []
  }

  async function saveCriteria(portfolioId, rows) {
    const existing = await criteria(portfolioId)
    const keep = new Set(rows.map((r) => r.id).filter(Boolean))
    for (const old of existing) {
      if (!keep.has(old.id)) {
        const { error } = await db.from('portfolio_scoring_criteria').delete().eq('id', old.id)
        if (error) fail(error, 'Could not remove a criterion.')
      }
    }
    for (const row of rows) {
      const payload = { portfolio_id: portfolioId, name: row.name, weight_percent: Number(row.weight_percent), scale_guidance: row.scale_guidance || null, sort_order: row.sort_order || 0 }
      const q = row.id
        ? db.from('portfolio_scoring_criteria').update(payload).eq('id', row.id)
        : db.from('portfolio_scoring_criteria').insert(payload)
      const { error } = await q
      if (error) fail(error, 'Could not save criteria.')
    }
  }

  async function scores(portfolioId) {
    const { data, error } = await db.from('portfolio_project_scores').select('*').eq('portfolio_id', portfolioId)
    if (error) fail(error, 'Could not load scores.')
    return data || []
  }

  async function saveScores(portfolioId, projectId, values, userId) {
    for (const [criterionId, score] of Object.entries(values)) {
      const { error } = await db.from('portfolio_project_scores').upsert({
        portfolio_id: portfolioId, project_id: projectId, criterion_id: criterionId, score: Number(score),
        scored_by: userId || null, scored_at: new Date().toISOString(),
      }, { onConflict: 'project_id,criterion_id' })
      if (error) fail(error, 'Could not save the score.')
    }
  }

  async function strategicPrefill(projectId) {
    if (isSim) return null
    const { data, error } = await db.from('strategic_contributions').select('contribution_confidence').eq('project_id', projectId).eq('is_deleted', false)
    if (error || !data?.length) return null
    const nums = data.map((r) => confidenceToScore(r.contribution_confidence)).filter((n) => n != null)
    if (!nums.length) return null
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
  }

  async function taskHours(projectId) {
    const col = isSim ? 'practice_project_id' : 'project_id'
    const { data, error } = await db.from('tasks').select('estimated_hours').eq(col, projectId).eq('is_deleted', false)
    if (error) return 0
    return (data || []).reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0)
  }

  async function listScenarios(portfolioId) {
    const { data, error } = await db.from('portfolio_scenarios').select('*').eq('portfolio_id', portfolioId).order('name')
    if (error) fail(error, 'Could not load scenarios.')
    return data || []
  }

  async function scenarioByKey(portfolioId, key) {
    const uuid = /^[0-9a-f-]{36}$/i.test(key || '')
    let q = db.from('portfolio_scenarios').select('*').eq('portfolio_id', portfolioId)
    q = uuid ? q.eq('id', key) : q.eq('display_id', key)
    const { data, error } = await q.maybeSingle()
    if (error) fail(error, 'Could not load the scenario.')
    return data || null
  }

  async function saveScenario(row, rules, results) {
    const payload = {
      portfolio_id: row.portfolio_id, name: row.name, max_start_shift: Number(row.max_start_shift) || 0,
      limits: row.limits || [], method: row.method || null, total_score: row.total_score ?? null, status: row.status || 'draft',
    }
    const q = row.id
      ? db.from('portfolio_scenarios').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', row.id).select().single()
      : db.from('portfolio_scenarios').insert(payload).select().single()
    const { data, error } = await q
    if (error) fail(error, 'Could not save the scenario.')
    if (rules) {
      await db.from('portfolio_scenario_rules').delete().eq('scenario_id', data.id)
      if (rules.length) {
        const { error: ruleError } = await db.from('portfolio_scenario_rules').insert(rules.map((r) => ({ scenario_id: data.id, rule_type: r.rule_type, project_id: r.project_id, other_project_id: r.other_project_id || null })))
        if (ruleError) fail(ruleError, 'Could not save the rules.')
      }
    }
    if (results) {
      await db.from('portfolio_scenario_results').delete().eq('scenario_id', data.id)
      if (results.length) {
        const { error: resultError } = await db.from('portfolio_scenario_results').insert(results.map((r) => ({ scenario_id: data.id, project_id: r.project_id, included: r.included, shift_periods: r.shift_periods || 0, score: r.score ?? null, reason: r.reason || null })))
        if (resultError) fail(resultError, 'Could not save the results.')
      }
    }
    return data
  }

  async function rulesOf(scenarioId) {
    const { data, error } = await db.from('portfolio_scenario_rules').select('*').eq('scenario_id', scenarioId)
    if (error) fail(error, 'Could not load rules.')
    return data || []
  }

  async function resultsOf(scenarioId) {
    const { data, error } = await db.from('portfolio_scenario_results').select('*').eq('scenario_id', scenarioId)
    if (error) fail(error, 'Could not load results.')
    return data || []
  }

  async function submit(id) {
    const { error } = await db.from('portfolio_scenarios').update({ status: 'pending_approval', submitted_at: new Date().toISOString() }).eq('id', id)
    if (error) fail(error, 'Could not submit the scenario.')
  }

  async function decide(id, decision, notes) {
    const { error } = await db.rpc('decide_portfolio_scenario', { p_scenario_id: id, p_decision: decision, p_notes: notes })
    if (error) fail(error, 'Could not record the decision.')
  }

  async function apply(id) {
    const { error } = await db.rpc('apply_portfolio_scenario', { p_scenario_id: id })
    if (error) fail(error, 'Could not apply the scenario.')
  }

  return {
    listPortfolios, portfolioByKey, projectsIn, criteria, saveCriteria, scores, saveScores, strategicPrefill, taskHours,
    listScenarios, scenarioByKey, saveScenario, rulesOf, resultsOf, submit, decide, apply,
  }
}
