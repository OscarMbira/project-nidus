import { isLikelyDatabaseUuid } from './isUuid.js'
import { platformProjectPath } from './projectRouteParam.js'

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

/**
 * List path — project-scoped when no work package is known.
 * @param {string} projectKeyDecoded - project_code or UUID (friendly URLs, v882)
 * @param {string} [workPackageId] - currently always a UUID; friendly wp_reference lands with
 *   the Work Packages family fix
 */
export function checkpointReportsListPath(projectKeyDecoded, workPackageId) {
  const wp = resolveCheckpointWorkPackageId(workPackageId)
  if (wp) return platformProjectPath(projectKeyDecoded, 'work-packages', wp, 'checkpoint-reports')
  return platformProjectPath(projectKeyDecoded, 'checkpoint-reports')
}

export function checkpointReportCreatePath(projectKeyDecoded, workPackageId) {
  return `${checkpointReportsListPath(projectKeyDecoded, workPackageId)}/create`
}

/** @param {string} reportKeyDecoded - document_ref or UUID (friendly URLs, v882) */
export function checkpointReportDetailPath(projectKeyDecoded, workPackageId, reportKeyDecoded) {
  return `${checkpointReportsListPath(projectKeyDecoded, workPackageId)}/${encodeURIComponent(reportKeyDecoded)}`
}

export function checkpointReportEditPath(projectKeyDecoded, workPackageId, reportKeyDecoded) {
  return `${checkpointReportDetailPath(projectKeyDecoded, workPackageId, reportKeyDecoded)}/edit`
}
