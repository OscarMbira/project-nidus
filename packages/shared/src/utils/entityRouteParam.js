/**
 * Generic UUID <-> human-code resolver, driven by ENTITY_URL_REGISTRY (v882).
 *
 * Replaces the old pattern of one hand-written resolveXId()/getXCode() function pair per
 * entity type (apps/platform/src/services/entityResolverService.js and its Simulator
 * duplicate) — adding a new friendly-URL family is now a registry entry, not new resolver
 * code. See CLAUDE.md rule 16.1 and projectplan/v882_friendly_urls_systemwide_plan.md.
 */
import { platformDb, simDb } from '@nidus/supabase'
import { isLikelyDatabaseUuid } from './isUuid'
import { ENTITY_URL_REGISTRY } from '../config/entityUrlRegistry'

const CACHE_PREFIX = 'entity_url_v2_'
const TTL_MS = 10 * 60 * 1000

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!raw) return null
    const row = JSON.parse(raw)
    if (!row?.exp || Date.now() > row.exp) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return null
    }
    return row.value
  } catch {
    return null
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ value, exp: Date.now() + TTL_MS }))
  } catch {
    /* ignore quota */
  }
}

function dbFor(schema) {
  return schema === 'sim' ? simDb : platformDb
}

function getConfig(entityType) {
  const cfg = ENTITY_URL_REGISTRY[entityType]
  if (!cfg) throw new Error(`entityRouteParam: unknown entity type "${entityType}"`)
  return cfg
}

/**
 * Resolve a route segment (code or UUID) to the record's real UUID.
 * @param {string} entityType - key into ENTITY_URL_REGISTRY
 * @param {string} codeOrUuid - decoded route segment
 * @param {string} [scopeId] - parent UUID (e.g. project id), required when the entity is scoped
 * @returns {Promise<string|null>}
 */
export async function resolveEntityId(entityType, codeOrUuid, scopeId) {
  const cfg = getConfig(entityType)
  const key = String(codeOrUuid || '').trim()
  if (!key) return null
  if (isLikelyDatabaseUuid(key)) return key
  if (cfg.scopeColumn && !scopeId) return null

  const cacheKey = scopeId ? `${entityType}:${scopeId}:${key}` : `${entityType}:${key}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  const db = dbFor(cfg.schema)
  const tryMatch = async (column) => {
    let q = db.from(cfg.table).select('id').eq(column, key)
    if (cfg.scopeColumn && scopeId) q = q.eq(cfg.scopeColumn, scopeId)
    if (!cfg.noSoftDelete) q = q.eq('is_deleted', false)
    const { data, error } = await q.maybeSingle()
    if (error && error.code !== 'PGRST116') {
      console.warn(`resolveEntityId(${entityType}.${column})`, error.message)
    }
    return data?.id || null
  }

  let id = await tryMatch(cfg.codeColumn)
  if (!id && cfg.altCodeColumn) id = await tryMatch(cfg.altCodeColumn)
  if (id) cacheSet(cacheKey, id)
  return id
}

/**
 * Resolve a record's UUID to its human code (pass-through if already a code / not a UUID).
 * @param {string} entityType - key into ENTITY_URL_REGISTRY
 * @param {string} uuidOrCode
 * @param {string} [scopeId] - parent UUID, used to double-check scope when provided
 * @returns {Promise<string|null>}
 */
export async function getEntityCode(entityType, uuidOrCode, scopeId) {
  const cfg = getConfig(entityType)
  const id = String(uuidOrCode || '').trim()
  if (!id) return null
  if (!isLikelyDatabaseUuid(id)) return id

  const cacheKey = `${entityType}:code:${id}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  const db = dbFor(cfg.schema)
  let q = db.from(cfg.table).select(cfg.codeColumn).eq('id', id)
  if (cfg.scopeColumn && scopeId) q = q.eq(cfg.scopeColumn, scopeId)
  if (!cfg.noSoftDelete) q = q.eq('is_deleted', false)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.warn(`getEntityCode(${entityType})`, error.message)
  }
  const code = data?.[cfg.codeColumn]?.trim() || null
  if (code) cacheSet(cacheKey, code)
  return code
}

export { isLikelyDatabaseUuid }
