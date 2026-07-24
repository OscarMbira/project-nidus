import { isLikelyDatabaseUuid } from './isUuid'
import {
  getProjectCode,
  getProgrammeCode,
  getPortfolioCode,
  getRiskCode,
  getIssueCode,
  getChangeRequestRef,
  getScenarioCode,
  getSimRunCode,
  getPracticeProjectCode,
  resolveProjectId,
} from '../services/entityResolverService'
import { platformProjectPath } from './projectRouteParam'

async function toCode(getter, key) {
  const k = String(key || '').trim()
  if (!k) return ''
  if (!isLikelyDatabaseUuid(k)) return k
  const c = await getter(k)
  return (c && String(c).trim()) || k
}

/** @param {string} codeOrUuid @param {string} [subPath] */
export async function projectUrl(codeOrUuid, subPath) {
  const seg = await toCode(getProjectCode, codeOrUuid)
  const base = platformProjectPath(seg)
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function programmeUrl(codeOrUuid, subPath) {
  const seg = await toCode(getProgrammeCode, codeOrUuid)
  const base = `/platform/programme/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function portfolioUrl(codeOrUuid, subPath) {
  const seg = await toCode(getPortfolioCode, codeOrUuid)
  const base = `/platform/strategy/portfolio/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function riskUrl(riskKey, projectKey) {
  const pk = String(projectKey || '').trim()
  const rk = String(riskKey || '').trim()
  if (!pk || !rk) return '/platform/projects'
  const projectUuid = isLikelyDatabaseUuid(pk) ? pk : await resolveProjectId(pk)
  if (!projectUuid) return '/platform/projects'
  const pSeg = await toCode(getProjectCode, projectUuid)
  let rSeg = rk
  if (isLikelyDatabaseUuid(rk)) {
    const c = await getRiskCode(rk, projectUuid)
    rSeg = (c && String(c).trim()) || rk
  }
  return `${platformProjectPath(pSeg)}/risks/${encodeURIComponent(rSeg)}`
}

export async function issueUrl(issueKey, projectKey) {
  const pk = String(projectKey || '').trim()
  const ik = String(issueKey || '').trim()
  if (!pk || !ik) return '/platform/projects'
  const projectUuid = isLikelyDatabaseUuid(pk) ? pk : await resolveProjectId(pk)
  if (!projectUuid) return '/platform/projects'
  const pSeg = await toCode(getProjectCode, projectUuid)
  let iSeg = ik
  if (isLikelyDatabaseUuid(ik)) {
    const c = await getIssueCode(ik, projectUuid)
    iSeg = (c && String(c).trim()) || ik
  }
  return `${platformProjectPath(pSeg)}/issues/${encodeURIComponent(iSeg)}`
}

export async function changeRequestUrl(changeRefOrUuid) {
  const seg = await toCode(getChangeRequestRef, changeRefOrUuid)
  return `/platform/change-requests/${encodeURIComponent(seg)}`
}

export async function projectQueryParam(codeOrUuid) {
  return toCode(getProjectCode, codeOrUuid)
}

export async function scenarioUrl(codeOrUuid, subPath) {
  const seg = await toCode(getScenarioCode, codeOrUuid)
  const base = `/simulator/scenarios/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function simRunUrl(codeOrUuid, subPath) {
  const seg = await toCode(getSimRunCode, codeOrUuid)
  const base = `/simulator/runs/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}

export async function practiceProjectUrl(codeOrUuid, subPath) {
  const seg = await toCode(getPracticeProjectCode, codeOrUuid)
  const base = `/simulator/practice-projects/${encodeURIComponent(seg)}`
  if (!subPath) return base
  const p = String(subPath).replace(/^\/+/, '')
  return p ? `${base}/${p}` : base
}
