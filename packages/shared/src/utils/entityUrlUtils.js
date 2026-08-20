/**
 * Async URL builders — resolve a code-or-UUID to the record's human code, then build the path.
 * Backed by the generic ENTITY_URL_REGISTRY resolver (v882) rather than one hand-written
 * function per entity type. See entityRouteParam.js and CLAUDE.md rule 16.1.
 */
import { isLikelyDatabaseUuid } from './isUuid'
import { resolveEntityId, getEntityCode } from './entityRouteParam'
import { platformProjectPath } from './projectRouteParam'

async function toCode(entityType, key, scopeId) {
  const k = String(key || '').trim()
  if (!k) return ''
  if (!isLikelyDatabaseUuid(k)) return k
  const c = await getEntityCode(entityType, k, scopeId)
  return (c && String(c).trim()) || k
}

/** @param {string} codeOrUuid @param {string} [subPath] */
export async function projectUrl(codeOrUuid, subPath) {
  const seg = await toCode('project', codeOrUuid)
  const base = platformProjectPath(seg)
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function programmeUrl(codeOrUuid, subPath) {
  const seg = await toCode('programme', codeOrUuid)
  const base = `/platform/programme/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function portfolioUrl(codeOrUuid, subPath) {
  const seg = await toCode('portfolio', codeOrUuid)
  const base = `/platform/strategy/portfolio/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

/**
 * Generic project-scoped entity URL builder — resolves both the project and entity segments
 * to their friendly codes, then builds `/platform/projects/<projectSeg>/<...subPath>/<entitySeg>`.
 * @param {string} entityType - key into ENTITY_URL_REGISTRY (must have scopeColumn: 'project_id')
 * @param {string} entityKey - entity id or code
 * @param {string} projectKey - project id or code
 * @param {...string} pathSegments - static path segments between project and entity (e.g. 'risks')
 */
export async function projectScopedEntityUrl(entityType, entityKey, projectKey, ...pathSegments) {
  const pk = String(projectKey || '').trim()
  const ek = String(entityKey || '').trim()
  if (!pk || !ek) return '/platform/projects'
  const projectUuid = isLikelyDatabaseUuid(pk) ? pk : await resolveEntityId('project', pk)
  if (!projectUuid) return '/platform/projects'
  const pSeg = await toCode('project', projectUuid)
  const eSeg = await toCode(entityType, ek, projectUuid)
  return platformProjectPath(pSeg, ...pathSegments, encodeURIComponent(eSeg))
}

export async function riskUrl(riskKey, projectKey) {
  return projectScopedEntityUrl('risk', riskKey, projectKey, 'risks')
}

export async function issueUrl(issueKey, projectKey) {
  return projectScopedEntityUrl('issue', issueKey, projectKey, 'issues')
}

export async function changeRequestUrl(changeRefOrUuid) {
  const seg = await toCode('changeRequest', changeRefOrUuid)
  return `/platform/change-requests/${encodeURIComponent(seg)}`
}

export async function projectQueryParam(codeOrUuid) {
  return toCode('project', codeOrUuid)
}

export async function scenarioUrl(codeOrUuid, subPath) {
  const seg = await toCode('scenario', codeOrUuid)
  const base = `/simulator/scenarios/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function simRunUrl(codeOrUuid, subPath) {
  const seg = await toCode('simRun', codeOrUuid)
  const base = `/simulator/runs/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function practiceProjectUrl(codeOrUuid, subPath) {
  const seg = await toCode('practiceProject', codeOrUuid)
  const base = `/simulator/practice-projects/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}
