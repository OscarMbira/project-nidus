import { isLikelyDatabaseUuid } from './isUuid.js'

/**
 * First valid UUID among candidates, else null.
 * Rejects null/undefined and the literal strings "undefined"/"null" that end up in
 * URLs when template strings interpolate a missing route param.
 */
export function resolveCheckpointWorkPackageId(...candidates) {
  for (const id of candidates) {
    if (isLikelyDatabaseUuid(id)) return id
  }
  return null
}

/** List path — project-scoped when no work package is known. */
export function checkpointReportsListPath(projectId, workPackageId) {
  const wp = resolveCheckpointWorkPackageId(workPackageId)
  if (wp) return `/app/projects/${projectId}/work-packages/${wp}/checkpoint-reports`
  return `/app/projects/${projectId}/checkpoint-reports`
}

export function checkpointReportCreatePath(projectId, workPackageId) {
  return `${checkpointReportsListPath(projectId, workPackageId)}/create`
}

export function checkpointReportDetailPath(projectId, workPackageId, reportId) {
  return `${checkpointReportsListPath(projectId, workPackageId)}/${reportId}`
}

export function checkpointReportEditPath(projectId, workPackageId, reportId) {
  return `${checkpointReportDetailPath(projectId, workPackageId, reportId)}/edit`
}
