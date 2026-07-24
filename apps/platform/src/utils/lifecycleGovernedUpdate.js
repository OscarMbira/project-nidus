/**
 * Defer-apply helpers for governed record lifecycle updates.
 * @see projectplan/v752_record_lifecycle_defer_apply_plan.md
 */

export const LIFECYCLE_UPDATE_BLOCKED_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'record_status',
  'root_record_id',
  'record_version',
  'parent_record_id',
  'authorised_by',
  'authorised_at',
  'archived_by',
  'archived_at',
  'moved_to_history_at',
  'is_deleted',
  'deleted_at',
  'deleted_by',
])

function valuesDiffer(before, after) {
  if (before === after) return false
  if (before == null && after == null) return false
  return JSON.stringify(before) !== JSON.stringify(after)
}

/**
 * Build proposed_changes JSONB payload (new values only) from a current row and update patch.
 */
export function buildProposedLifecycleChanges(currentRow, updates) {
  const proposed = {}
  if (!currentRow || !updates) return proposed

  for (const [key, value] of Object.entries(updates)) {
    if (LIFECYCLE_UPDATE_BLOCKED_COLUMNS.has(key)) continue
    if (value === undefined) continue
    if (valuesDiffer(currentRow[key], value)) {
      proposed[key] = value
    }
  }
  return proposed
}

async function resolveLifecycleScope(db, row, { projectTable = 'projects', projectIdField = 'project_id' } = {}) {
  let accountId = row?.account_id ?? null
  let projectId = row?.[projectIdField] ?? row?.project_id ?? row?.practice_project_id ?? null

  if (!accountId && projectId) {
    const { data } = await db
      .from(projectTable)
      .select('account_id')
      .eq('id', projectId)
      .maybeSingle()
    accountId = data?.account_id ?? null
  }

  return { accountId, projectId }
}

async function isGovernanceActive(db, { accountId, projectId, tableName, useDirectConfig = false }) {
  if (useDirectConfig) {
    const { data: cfg, error: cfgErr } = await db
      .from('record_lifecycle_config')
      .select('approval_enabled')
      .eq('table_name', tableName)
      .eq('is_active', true)
      .maybeSingle()
    if (cfgErr) return false

    const { count, error: countErr } = await db
      .from('record_authorisers')
      .select('id', { count: 'exact', head: true })
      .eq('table_name', tableName)
      .eq('is_active', true)
    if (countErr) return false

    return Boolean(cfg?.approval_enabled ?? true) && Number(count) > 0
  }

  if (!accountId && !projectId) return false

  const { data: cfg, error: cfgErr } = await db.rpc('get_lifecycle_config', {
    p_account_id: accountId,
    p_project_id: projectId,
    p_table_name: tableName,
  })
  if (cfgErr) return false

  const { data: count, error: countErr } = await db.rpc('get_authoriser_count', {
    p_account_id: accountId,
    p_project_id: projectId,
    p_table_name: tableName,
  })
  if (countErr) return false

  return Boolean(cfg?.approvalEnabled ?? cfg?.approval_enabled ?? true) && Number(count) > 0
}

/**
 * When lifecycle governance is active, stage proposed field changes via submit_for_authorisation
 * without writing them to the live row. Returns { deferred: true, row, batchId } when staged.
 */
export async function tryGovernedLifecycleUpdate({
  db,
  tableName,
  recordId,
  currentRow,
  updates,
  notes = 'Record change submitted for authorisation',
  scopeOptions,
  submitRpc = 'submit_for_authorisation',
  physicalTable = tableName,
  useDirectConfig = false,
}) {
  if (!currentRow?.record_status) {
    return { deferred: false }
  }

  if (currentRow.record_status === 'unauthorised') {
    throw new Error('Record is locked pending authorisation')
  }

  const proposedChanges = buildProposedLifecycleChanges(currentRow, updates)
  if (!Object.keys(proposedChanges).length) {
    return { deferred: false }
  }

  const scope = await resolveLifecycleScope(db, currentRow, scopeOptions)
  const active = await isGovernanceActive(db, { ...scope, tableName, useDirectConfig })
  if (!active) {
    return { deferred: false }
  }

  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: batchId, error } = await db.rpc(submitRpc, {
    p_table_name: tableName,
    p_record_id: recordId,
    p_root_record_id: currentRow.root_record_id || recordId,
    p_submitted_by: user.id,
    p_notes: notes,
    p_proposed_changes: proposedChanges,
  })
  if (error) throw error

  const { data: row, error: rowErr } = await db
    .from(physicalTable)
    .select('*')
    .eq('id', recordId)
    .single()
  if (rowErr) throw rowErr

  return { deferred: true, row, batchId, proposedChanges }
}

export default {
  LIFECYCLE_UPDATE_BLOCKED_COLUMNS,
  buildProposedLifecycleChanges,
  tryGovernedLifecycleUpdate,
}
