/**
 * Resolves human-readable codes ↔ UUIDs for Platform (public) and Simulator (sim).
 * Never mixes clients across schemas.
 */

import { platformDb, simDb } from './supabase/supabaseClient'
import { isLikelyDatabaseUuid } from '../utils/isUuid'

const CACHE_PREFIX = 'entity_code_'
const TTL_MS = 10 * 60 * 1000

function cacheGet(type, value) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${type}_${value}`)
    if (!raw) return null
    const row = JSON.parse(raw)
    if (!row?.exp || Date.now() > row.exp) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${type}_${value}`)
      return null
    }
    return row.uuid
  } catch {
    return null
  }
}

function cacheSet(type, value, uuid) {
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${type}_${value}`,
      JSON.stringify({ uuid, exp: Date.now() + TTL_MS }),
    )
  } catch {
    /* ignore quota */
  }
}

function bypassLookup(segment) {
  return isLikelyDatabaseUuid(segment)
}

// --- Platform ---

export async function resolveProjectId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('project', key)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('projects')
    .select('id')
    .eq('project_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveProjectId', error.message)
  const id = data?.id || null
  if (id) cacheSet('project', key, id)
  return id
}

export async function resolveProgrammeId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('programme', key)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('programmes')
    .select('id')
    .eq('programme_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveProgrammeId', error.message)
  const id = data?.id || null
  if (id) cacheSet('programme', key, id)
  return id
}

export async function resolvePortfolioId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('portfolio', key)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('portfolios')
    .select('id')
    .eq('portfolio_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolvePortfolioId', error.message)
  const id = data?.id || null
  if (id) cacheSet('portfolio', key, id)
  return id
}

export async function resolveRiskId(codeOrUuid, projectId) {
  const key = String(codeOrUuid || '').trim()
  const pid = String(projectId || '').trim()
  if (!key || !pid) return null
  if (bypassLookup(key)) return key
  const cacheKey = `${pid}:${key}`
  const hit = cacheGet('risk', cacheKey)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('risks')
    .select('id')
    .eq('project_id', pid)
    .eq('risk_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveRiskId', error.message)
  const id = data?.id || null
  if (id) cacheSet('risk', cacheKey, id)
  return id
}

export async function resolveIssueId(codeOrUuid, projectId) {
  const key = String(codeOrUuid || '').trim()
  const pid = String(projectId || '').trim()
  if (!key || !pid) return null
  if (bypassLookup(key)) return key
  const cacheKey = `${pid}:${key}`
  const hit = cacheGet('issue', cacheKey)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('issues')
    .select('id')
    .eq('project_id', pid)
    .eq('issue_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveIssueId', error.message)
  const id = data?.id || null
  if (id) cacheSet('issue', cacheKey, id)
  return id
}

export async function resolveChangeRequestId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('changeRequest', key)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('change_requests')
    .select('id')
    .eq('change_reference', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveChangeRequestId', error.message)
  const id = data?.id || null
  if (id) cacheSet('changeRequest', key, id)
  return id
}

export async function resolveTeamId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('team', key)
  if (hit) return hit
  const { data, error } = await platformDb
    .from('teams')
    .select('id')
    .eq('team_code', key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveTeamId', error.message)
  const id = data?.id || null
  if (id) cacheSet('team', key, id)
  return id
}

export async function getProjectCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await platformDb
    .from('projects')
    .select('project_code')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getProjectCode', error.message)
  return data?.project_code?.trim() || null
}

export async function getProgrammeCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await platformDb
    .from('programmes')
    .select('programme_code')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getProgrammeCode', error.message)
  return data?.programme_code?.trim() || null
}

export async function getPortfolioCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await platformDb
    .from('portfolios')
    .select('portfolio_code')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getPortfolioCode', error.message)
  return data?.portfolio_code?.trim() || null
}

export async function getRiskCode(uuid, projectId) {
  const id = String(uuid || '').trim()
  const pid = String(projectId || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  let q = platformDb.from('risks').select('risk_code').eq('id', id).eq('is_deleted', false)
  if (pid) q = q.eq('project_id', pid)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getRiskCode', error.message)
  return data?.risk_code?.trim() || null
}

export async function getIssueCode(uuid, projectId) {
  const id = String(uuid || '').trim()
  const pid = String(projectId || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  let q = platformDb.from('issues').select('issue_code').eq('id', id).eq('is_deleted', false)
  if (pid) q = q.eq('project_id', pid)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getIssueCode', error.message)
  return data?.issue_code?.trim() || null
}

export async function getChangeRequestRef(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await platformDb
    .from('change_requests')
    .select('change_reference')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getChangeRequestRef', error.message)
  return data?.change_reference?.trim() || null
}

export async function getTeamCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await platformDb
    .from('teams')
    .select('team_code')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getTeamCode', error.message)
  return data?.team_code?.trim() || null
}

// --- Simulator ---

export async function resolveScenarioId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('scenario', key)
  if (hit) return hit
  const { data, error } = await simDb
    .from('scenarios')
    .select('id')
    .eq('scenario_code', key)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveScenarioId', error.message)
  const id = data?.id || null
  if (id) cacheSet('scenario', key, id)
  return id
}

export async function resolveSimRunId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('simRun', key)
  if (hit) return hit
  const { data, error } = await simDb
    .from('simulation_runs')
    .select('id')
    .eq('run_code', key)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolveSimRunId', error.message)
  const id = data?.id || null
  if (id) cacheSet('simRun', key, id)
  return id
}

export async function resolvePracticeProjectId(codeOrUuid) {
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (bypassLookup(key)) return key
  const hit = cacheGet('practiceProject', key)
  if (hit) return hit
  const { data, error } = await simDb
    .from('practice_projects')
    .select('id')
    .eq('practice_code', key)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('resolvePracticeProjectId', error.message)
  const id = data?.id || null
  if (id) cacheSet('practiceProject', key, id)
  return id
}

export async function getScenarioCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await simDb.from('scenarios').select('scenario_code').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getScenarioCode', error.message)
  return data?.scenario_code?.trim() || null
}

export async function getSimRunCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await simDb.from('simulation_runs').select('run_code').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getSimRunCode', error.message)
  return data?.run_code?.trim() || null
}

export async function getPracticeProjectCode(uuid) {
  const id = String(uuid || '').trim()
  if (!id) return null
  if (!bypassLookup(id)) return id
  const { data, error } = await simDb
    .from('practice_projects')
    .select('practice_code')
    .eq('id', id)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') console.warn('getPracticeProjectCode', error.message)
  return data?.practice_code?.trim() || null
}

/** @internal for tests */
export function __resetEntityResolverTestHooks() {
  /* noop — reserved for future mock injection */
}
