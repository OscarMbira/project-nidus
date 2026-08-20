/**
 * v862 — multi-select helpers for Organisational / Project Templates lists.
 * Federated modules alias @nidus/shared/utils → apps shell utils — keep in sync with
 * packages/shared/src/utils/orgTemplateBulkSelection.js
 */

/** True when the row is already this project's own copy. */
export function isAlreadyProjectOwnTemplate(row, entityId) {
  return Boolean(row?.tier === 'project' && entityId && row?.scope_entity_id === entityId)
}

/** Copy-down is only offered in project-scoped org lists for non–project-own rows. */
export function canCopyDownOrgTemplate(row, { isProjectScoped, entityId } = {}) {
  return Boolean(isProjectScoped && entityId && !isAlreadyProjectOwnTemplate(row, entityId))
}

/**
 * Retire/customise mirrors single-row actions:
 * - flat org / PMO list: all rows
 * - project-scoped: only project-own rows
 */
export function canRetireOrgTemplate(row, { isProjectScoped, entityId } = {}) {
  return Boolean(!isProjectScoped || isAlreadyProjectOwnTemplate(row, entityId))
}

export function toggleIdInSelection(selectedIds, id) {
  const next = new Set(selectedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** Select all filtered ids, or clear if every filtered id is already selected. */
export function toggleSelectAllFiltered(selectedIds, filteredIds) {
  const ids = Array.isArray(filteredIds) ? filteredIds : []
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  if (allSelected) return new Set()
  return new Set(ids)
}

/** Drop selected ids that are no longer in the filtered set. */
export function pruneSelectionToFiltered(selectedIds, filteredIds) {
  const allowed = new Set(Array.isArray(filteredIds) ? filteredIds : [])
  const next = new Set()
  for (const id of selectedIds) {
    if (allowed.has(id)) next.add(id)
  }
  return next
}

export function partitionSelectedTemplateRows(rows, selectedIds, ctx) {
  const selected = (rows || []).filter((r) => selectedIds.has(r.id))
  return {
    selected,
    copyEligible: selected.filter((r) => canCopyDownOrgTemplate(r, ctx)),
    retireEligible: selected.filter((r) => canRetireOrgTemplate(r, ctx)),
  }
}

export function formatBulkActionSummary(verbPast, { ok = 0, skipped = 0, failed = 0 } = {}) {
  const parts = [`${verbPast} ${ok}`]
  if (skipped) parts.push(`skipped ${skipped}`)
  if (failed) parts.push(`failed ${failed}`)
  return parts.join('; ')
}
