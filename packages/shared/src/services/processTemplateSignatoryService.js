/**
 * Document-level, sequential, multi-signatory sign-off workflow for process_templates
 * documents (v868 PRD/plan; v873 is_mandatory; v880 scoped Org/Portfolio/Programme/Project
 * requirements with inherit / custom / none). Companion to processTemplateAttachmentService.js.
 *
 * Two concerns kept deliberately separate:
 *  - Requirements: ordered role-slot lists per (account, scope, document type), plus
 *    scope_policies for portfolio/programme/project overrides (custom | none; absence = inherit).
 *  - Document signatories: per-document signing instances (append-only rounds).
 *
 * Sequential turn-taking and "only the assigned signatory may sign" are enforced by RLS.
 */

export const PROCESS_TEMPLATE_SIGNATURES_BUCKET = 'process-template-signatures'
export const USER_SIGNATURES_BUCKET = 'user-signatures'
export const MAX_SIGNATURE_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const SIGNATURE_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

/** Treat missing/null as mandatory (pre-v873 rows and string-only slot payloads). */
export function slotIsMandatory(slot) {
  if (slot == null) return true
  if (typeof slot === 'string') return true
  return slot.is_mandatory !== false
}

/** TRUE when every mandatory slot is signed (optional may remain pending). */
export function areMandatorySlotsSigned(slots = []) {
  const mandatory = (slots || []).filter(slotIsMandatory)
  return mandatory.length > 0 && mandatory.every((row) => row.status === 'signed')
}

/** TRUE when every earlier mandatory slot (by slot_order) is signed. */
export function earlierMandatorySlotsSigned(slots = [], slotOrder) {
  return (slots || [])
    .filter((s) => s.slot_order < slotOrder && slotIsMandatory(s))
    .every((s) => s.status === 'signed')
}

/**
 * Normalize config slots: strings → { role_label, is_mandatory: true };
 * objects keep role_label + is_mandatory (default true). Drops blank labels.
 */
export function normalizeRequirementSlots(slots) {
  if (!Array.isArray(slots)) return []
  return slots
    .map((s) => {
      if (typeof s === 'string') {
        const role_label = s.trim()
        return role_label ? { role_label, is_mandatory: true } : null
      }
      const role_label = String(s?.role_label || s?.label || '').trim()
      if (!role_label) return null
      return { role_label, is_mandatory: s?.is_mandatory !== false }
    })
    .filter(Boolean)
}

export function validateSignatureFile(file) {
  if (!file) return 'No file selected.'
  if (!SIGNATURE_IMAGE_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not allowed — please upload an image.`
  }
  if (file.size > MAX_SIGNATURE_FILE_SIZE_BYTES) {
    return `File is too large — max ${(MAX_SIGNATURE_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
  }
  return null
}

function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const fromType = String(file?.type || '').split('/').pop()
  return fromType || 'png'
}

async function currentAuthUserId(db) {
  const { data, error } = await db.auth.getUser()
  if (error || !data?.user?.id) throw new Error('Not signed in.')
  return data.user.id
}

// ─────────────────────────────────────────────────────────────
// Requirements (scoped configuration — v880)
// ─────────────────────────────────────────────────────────────

export const SIGNATORY_SCOPE_TYPES = ['organisation', 'portfolio', 'programme', 'project']

/**
 * Pure resolver: walk levels (narrow → wide). First policy wins.
 * @param {Array<{ scopeType: string, scopeId: string|null, mode?: string|null, slots?: array }>} levels
 *   Pre-loaded: project/programme/portfolio entries with mode+slots if policy exists;
 *   final organisation entry with slots only (no mode).
 */
export function pickEffectiveSignatoryLevels(levels = []) {
  for (const level of levels) {
    if (!level) continue
    if (level.scopeType === 'organisation') {
      return {
        slots: level.slots || [],
        source: { scopeType: 'organisation', scopeId: null, mode: 'organisation' },
      }
    }
    if (level.mode === 'none') {
      return {
        slots: [],
        source: { scopeType: level.scopeType, scopeId: level.scopeId, mode: 'none' },
      }
    }
    if (level.mode === 'custom') {
      return {
        slots: level.slots || [],
        source: { scopeType: level.scopeType, scopeId: level.scopeId, mode: 'custom' },
      }
    }
    // no policy → inherit (continue)
  }
  return {
    slots: [],
    source: { scopeType: 'organisation', scopeId: null, mode: 'organisation' },
  }
}

/** Active, ordered requirement slots for one (account, scope, document type). Defaults to organisation. */
export async function getSignatoryRequirements(
  db,
  accountId,
  documentTable,
  { scopeType = 'organisation', scopeId = null } = {},
) {
  try {
    if (!db || !accountId || !documentTable) throw new Error('Database client, account id, and document table are required')
    const type = scopeType || 'organisation'
    let query = db
      .from('process_template_signatory_requirements')
      .select('*')
      .eq('account_id', accountId)
      .eq('document_table', documentTable)
      .eq('scope_type', type)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('slot_order', { ascending: true })
    if (type === 'organisation') {
      query = query.is('scope_id', null)
    } else {
      if (!scopeId) throw new Error('scopeId is required for non-organisation scopes')
      query = query.eq('scope_id', scopeId)
    }
    const { data, error } = await query
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Policy row for a non-org scope + document type (or null). */
export async function getSignatoryScopePolicy(db, { accountId, scopeType, scopeId, documentTable }) {
  try {
    if (!db || !accountId || !scopeType || !scopeId || !documentTable) {
      throw new Error('accountId, scopeType, scopeId, and documentTable are required')
    }
    if (scopeType === 'organisation') return ok(null)
    const { data, error } = await db
      .from('process_template_signatory_scope_policies')
      .select('*')
      .eq('account_id', accountId)
      .eq('scope_type', scopeType)
      .eq('scope_id', scopeId)
      .eq('document_table', documentTable)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    return ok(data || null)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Config view for the UI: mode inherit|none|custom + slots + human source label bits.
 */
export async function getScopedSignatoryConfig(db, { accountId, scopeType, scopeId, documentTable }) {
  try {
    const type = scopeType || 'organisation'
    if (type === 'organisation') {
      const slots = await getSignatoryRequirements(db, accountId, documentTable, { scopeType: 'organisation' })
      if (!slots.success) return slots
      return ok({
        mode: 'custom',
        slots: slots.data,
        source: { scopeType: 'organisation', scopeId: null, mode: 'organisation' },
      })
    }
    const [policyRes, slotsRes] = await Promise.all([
      getSignatoryScopePolicy(db, { accountId, scopeType: type, scopeId, documentTable }),
      getSignatoryRequirements(db, accountId, documentTable, { scopeType: type, scopeId }),
    ])
    if (!policyRes.success) return policyRes
    if (!slotsRes.success) return slotsRes
    if (!policyRes.data) {
      return ok({
        mode: 'inherit',
        slots: [],
        source: { scopeType: type, scopeId, mode: 'inherit' },
      })
    }
    return ok({
      mode: policyRes.data.mode,
      slots: policyRes.data.mode === 'custom' ? slotsRes.data : [],
      source: { scopeType: type, scopeId, mode: policyRes.data.mode },
    })
  } catch (error) {
    return fail(error)
  }
}

/**
 * Bulk signatory mode + slot count for a list of document tables at one scope — one pair of
 * queries instead of one getScopedSignatoryConfig() call per document type. Used to render
 * "defined / count" indicators next to a document-type picker.
 * @returns {Promise<{success:boolean,data?:Record<string,{mode:string,count:number|null}>}>}
 */
export async function getSignatoryCountsForDocumentTables(db, { accountId, scopeType, scopeId, documentTables }) {
  try {
    if (!db || !accountId || !Array.isArray(documentTables) || documentTables.length === 0) {
      throw new Error('Database client, account id, and documentTables are required')
    }
    const type = scopeType || 'organisation'
    const result = {}
    documentTables.forEach((t) => {
      result[t] = { mode: type === 'organisation' ? 'organisation' : 'inherit', count: type === 'organisation' ? 0 : null }
    })

    if (type === 'organisation') {
      const { data, error } = await db
        .from('process_template_signatory_requirements')
        .select('document_table')
        .eq('account_id', accountId)
        .eq('scope_type', 'organisation')
        .is('scope_id', null)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .in('document_table', documentTables)
      if (error) throw error
      ;(data || []).forEach((r) => {
        if (result[r.document_table]) result[r.document_table].count += 1
      })
      return ok(result)
    }

    if (!scopeId) return ok(result)

    const [policiesRes, slotsRes] = await Promise.all([
      db
        .from('process_template_signatory_scope_policies')
        .select('document_table, mode')
        .eq('account_id', accountId)
        .eq('scope_type', type)
        .eq('scope_id', scopeId)
        .eq('is_deleted', false)
        .in('document_table', documentTables),
      db
        .from('process_template_signatory_requirements')
        .select('document_table')
        .eq('account_id', accountId)
        .eq('scope_type', type)
        .eq('scope_id', scopeId)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .in('document_table', documentTables),
    ])
    if (policiesRes.error) throw policiesRes.error
    if (slotsRes.error) throw slotsRes.error

    const slotCounts = {}
    ;(slotsRes.data || []).forEach((r) => {
      slotCounts[r.document_table] = (slotCounts[r.document_table] || 0) + 1
    })
    ;(policiesRes.data || []).forEach((r) => {
      if (result[r.document_table]) result[r.document_table].mode = r.mode
    })
    documentTables.forEach((t) => {
      const mode = result[t].mode
      result[t].count = mode === 'inherit' ? null : (slotCounts[t] || 0)
    })
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

async function loadProjectAncestorIds(db, projectId) {
  // Platform link tables first (parallel); fall back to Simulator practice links if empty.
  const [port, prog] = await Promise.all([
    db.from('portfolio_projects').select('portfolio_id').eq('project_id', projectId).maybeSingle(),
    db.from('programme_projects').select('programme_id').eq('project_id', projectId).maybeSingle(),
  ])

  let portfolioId = (!port.error && port.data?.portfolio_id) || null
  let programmeId = (!prog.error && prog.data?.programme_id) || null

  if (portfolioId || programmeId) return { portfolioId, programmeId }

  const [simPort, simProg] = await Promise.all([
    db.from('practice_portfolio_projects').select('practice_portfolio_id').eq('practice_project_id', projectId).maybeSingle(),
    db.from('practice_programme_projects').select('practice_programme_id').eq('practice_project_id', projectId).maybeSingle(),
  ])
  if (!simPort.error) portfolioId = simPort.data?.practice_portfolio_id || null
  if (!simProg.error) programmeId = simProg.data?.practice_programme_id || null
  return { portfolioId, programmeId }
}

/**
 * Resolve effective slots for a document type (v880).
 * Prefer projectId (full chain). For config "copy parent" from programme/portfolio
 * scopes, pass programmeId / portfolioId without a project.
 */
export async function resolveEffectiveSignatoryRequirements(db, {
  accountId,
  documentTable,
  projectId = null,
  programmeId: programmeIdArg = null,
  portfolioId: portfolioIdArg = null,
}) {
  try {
    if (!db || !accountId || !documentTable) throw new Error('Database client, account id, and document table are required')

    let portfolioId = portfolioIdArg || null
    let programmeId = programmeIdArg || null
    const chainSpecs = []

    if (projectId) {
      const ancestors = await loadProjectAncestorIds(db, projectId)
      portfolioId = ancestors.portfolioId || portfolioId
      programmeId = ancestors.programmeId || programmeId
      chainSpecs.push({ scopeType: 'project', scopeId: projectId })
    }
    if (programmeId) {
      if (!portfolioId) {
        const { data: prog } = await db.from('programmes').select('portfolio_id').eq('id', programmeId).maybeSingle()
        portfolioId = prog?.portfolio_id || null
        if (!portfolioId) {
          const { data: simProg } = await db
            .from('practice_programmes')
            .select('practice_portfolio_id')
            .eq('id', programmeId)
            .maybeSingle()
          portfolioId = simProg?.practice_portfolio_id || null
        }
      }
      chainSpecs.push({ scopeType: 'programme', scopeId: programmeId })
    }
    if (portfolioId) {
      chainSpecs.push({ scopeType: 'portfolio', scopeId: portfolioId })
    }

    if (chainSpecs.length === 0) {
      const org = await getSignatoryRequirements(db, accountId, documentTable, { scopeType: 'organisation' })
      if (!org.success) return org
      return ok({
        slots: org.data,
        source: { scopeType: 'organisation', scopeId: null, mode: 'organisation' },
      })
    }

    const policyResults = await Promise.all(
      chainSpecs.map((spec) =>
        getSignatoryScopePolicy(db, {
          accountId,
          scopeType: spec.scopeType,
          scopeId: spec.scopeId,
          documentTable,
        }).then((policyRes) => ({ spec, policyRes })),
      ),
    )

    const levels = []
    for (const { spec, policyRes } of policyResults) {
      if (!policyRes.success) return policyRes
      let slots = []
      if (policyRes.data?.mode === 'custom') {
        const slotRes = await getSignatoryRequirements(db, accountId, documentTable, {
          scopeType: spec.scopeType,
          scopeId: spec.scopeId,
        })
        if (!slotRes.success) return slotRes
        slots = slotRes.data
      }
      levels.push({
        scopeType: spec.scopeType,
        scopeId: spec.scopeId,
        mode: policyRes.data?.mode || null,
        slots,
      })
      if (policyRes.data?.mode === 'none' || policyRes.data?.mode === 'custom') {
        return ok(pickEffectiveSignatoryLevels([
          ...levels,
          { scopeType: 'organisation', scopeId: null, slots: [] },
        ]))
      }
    }

    const org = await getSignatoryRequirements(db, accountId, documentTable, { scopeType: 'organisation' })
    if (!org.success) return org
    levels.push({ scopeType: 'organisation', scopeId: null, slots: org.data })

    return ok(pickEffectiveSignatoryLevels(levels))
  } catch (error) {
    return fail(error)
  }
}

/** All document types that currently have at least one active organisation requirement slot. */
export async function listConfiguredDocumentTables(db, accountId) {
  try {
    if (!db || !accountId) throw new Error('Database client and account id are required')
    const { data, error } = await db
      .from('process_template_signatory_requirements')
      .select('document_table')
      .eq('account_id', accountId)
      .eq('scope_type', 'organisation')
      .eq('is_deleted', false)
      .eq('is_active', true)
    if (error) throw error
    return ok([...new Set((data || []).map((r) => r.document_table))])
  } catch (error) {
    return fail(error)
  }
}

async function retireRequirementSlots(db, { accountId, documentTable, scopeType, scopeId }) {
  let query = db
    .from('process_template_signatory_requirements')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('document_table', documentTable)
    .eq('scope_type', scopeType)
    .eq('is_deleted', false)
  if (scopeType === 'organisation') query = query.is('scope_id', null)
  else query = query.eq('scope_id', scopeId)
  const { error } = await query
  if (error) throw error
}

async function upsertScopePolicy(db, { accountId, scopeType, scopeId, documentTable, mode, userId }) {
  const { data: existing, error: findError } = await db
    .from('process_template_signatory_scope_policies')
    .select('id')
    .eq('account_id', accountId)
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('document_table', documentTable)
    .eq('is_deleted', false)
    .maybeSingle()
  if (findError) throw findError

  if (existing?.id) {
    const { data, error } = await db
      .from('process_template_signatory_scope_policies')
      .update({ mode, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await db
    .from('process_template_signatory_scope_policies')
    .insert({
      account_id: accountId,
      scope_type: scopeType,
      scope_id: scopeId,
      document_table: documentTable,
      mode,
      is_deleted: false,
      created_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function clearScopePolicy(db, { accountId, scopeType, scopeId, documentTable }) {
  const { error } = await db
    .from('process_template_signatory_scope_policies')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('document_table', documentTable)
    .eq('is_deleted', false)
  if (error) throw error
}

/**
 * Replace the whole requirement list for one (account, organisation, document type).
 * Soft-deletes prior rows and inserts the new ordered list.
 */
export async function saveSignatoryRequirements(db, {
  accountId,
  documentTable,
  slots,
  userId = null,
  scopeType = 'organisation',
  scopeId = null,
}) {
  try {
    if (!db || !accountId || !documentTable) throw new Error('Database client, account id, and document table are required')
    if (!Array.isArray(slots)) throw new Error('slots must be an array of role labels or { role_label, is_mandatory } objects')
    const type = scopeType || 'organisation'
    if (type !== 'organisation' && !scopeId) throw new Error('scopeId is required for non-organisation scopes')

    const cleanSlots = normalizeRequirementSlots(slots)
    if (cleanSlots.length > 0 && !cleanSlots.some((s) => s.is_mandatory)) {
      throw new Error('At least one signatory slot must be mandatory.')
    }

    await retireRequirementSlots(db, { accountId, documentTable, scopeType: type, scopeId })

    if (cleanSlots.length === 0) return ok([])

    const rows = cleanSlots.map((slot, index) => ({
      account_id: accountId,
      document_table: documentTable,
      scope_type: type,
      scope_id: type === 'organisation' ? null : scopeId,
      slot_order: index + 1,
      role_label: slot.role_label,
      is_mandatory: slot.is_mandatory,
      is_active: true,
      is_deleted: false,
      created_by: userId,
    }))

    const { data, error } = await db
      .from('process_template_signatory_requirements')
      .insert(rows)
      .select('*')
    if (error) throw error
    return ok((data || []).sort((a, b) => a.slot_order - b.slot_order))
  } catch (error) {
    return fail(error)
  }
}

/**
 * Save scoped config: inherit | none | custom (v880).
 * Organisation always uses custom slot list (empty = no org signatories).
 */
export async function saveScopedSignatoryConfig(db, {
  accountId,
  documentTable,
  scopeType = 'organisation',
  scopeId = null,
  mode = 'custom',
  slots = [],
  userId = null,
}) {
  try {
    if (!db || !accountId || !documentTable) throw new Error('Database client, account id, and document table are required')
    const type = scopeType || 'organisation'

    if (type === 'organisation') {
      const saved = await saveSignatoryRequirements(db, {
        accountId,
        documentTable,
        slots,
        userId,
        scopeType: 'organisation',
      })
      if (!saved.success) return saved
      return ok({ mode: 'custom', slots: saved.data })
    }

    if (!scopeId) throw new Error('scopeId is required for non-organisation scopes')
    if (!['inherit', 'none', 'custom'].includes(mode)) throw new Error('mode must be inherit, none, or custom')

    if (mode === 'inherit') {
      await clearScopePolicy(db, { accountId, scopeType: type, scopeId, documentTable })
      await retireRequirementSlots(db, { accountId, documentTable, scopeType: type, scopeId })
      return ok({ mode: 'inherit', slots: [] })
    }

    if (mode === 'none') {
      await upsertScopePolicy(db, {
        accountId,
        scopeType: type,
        scopeId,
        documentTable,
        mode: 'none',
        userId,
      })
      await retireRequirementSlots(db, { accountId, documentTable, scopeType: type, scopeId })
      return ok({ mode: 'none', slots: [] })
    }

    // custom
    const saved = await saveSignatoryRequirements(db, {
      accountId,
      documentTable,
      slots,
      userId,
      scopeType: type,
      scopeId,
    })
    if (!saved.success) return saved
    if ((saved.data || []).length === 0) {
      throw new Error('Custom signatory list must include at least one slot (or choose No signatories / Use parent).')
    }
    await upsertScopePolicy(db, {
      accountId,
      scopeType: type,
      scopeId,
      documentTable,
      mode: 'custom',
      userId,
    })
    return ok({ mode: 'custom', slots: saved.data })
  } catch (error) {
    return fail(error)
  }
}

/**
 * Replace requirement lists for many document types (same mode/slots).
 */
export async function saveSignatoryRequirementsForTables(db, {
  accountId,
  documentTables,
  slots,
  userId = null,
  scopeType = 'organisation',
  scopeId = null,
  mode = 'custom',
}) {
  try {
    if (!db || !accountId) throw new Error('Database client and account id are required')
    const tables = [...new Set((documentTables || []).filter(Boolean))]
    if (tables.length === 0) throw new Error('Select at least one document type')

    const results = []
    for (const documentTable of tables) {
      const result = await saveScopedSignatoryConfig(db, {
        accountId,
        documentTable,
        scopeType,
        scopeId,
        mode: scopeType === 'organisation' ? 'custom' : mode,
        slots,
        userId,
      })
      if (!result.success) return result
      results.push({ documentTable, ...result.data })
    }
    return ok(results)
  } catch (error) {
    return fail(error)
  }
}

// ─────────────────────────────────────────────────────────────
// Document signing instances
// ─────────────────────────────────────────────────────────────

async function getCurrentRoundNumber(db, table, templateNodeId) {
  const { data, error } = await db
    .from(table)
    .select('signing_round')
    .eq('template_node_id', templateNodeId)
    .order('signing_round', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.signing_round || 0
}

/** Current round's slots for a document, ordered — empty array if signing hasn't started. */
export async function getDocumentSignatories(db, templateNodeId) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const table = 'process_template_document_signatories'
    const round = await getCurrentRoundNumber(db, table, templateNodeId)
    if (round === 0) return ok([])
    const { data, error } = await db
      .from(table)
      .select('*')
      .eq('template_node_id', templateNodeId)
      .eq('signing_round', round)
      .order('slot_order', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Every round's slots for a document, newest round first — for the audit/history view. */
export async function getSigningHistory(db, templateNodeId) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const { data, error } = await db
      .from('process_template_document_signatories')
      .select('*')
      .eq('template_node_id', templateNodeId)
      .order('signing_round', { ascending: false })
      .order('slot_order', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/**
 * Start signing round 1 from the configured requirements, if no round exists yet.
 * Idempotent: concurrent callers (e.g. React Strict Mode double-mount) that race
 * on the empty check may hit uq_ptds_slot — we treat that as success and return
 * the rows the winner already inserted.
 */
export async function initializeSigningRound(db, { templateNodeId, accountId, documentTable, projectId = null }) {
  try {
    if (!db || !templateNodeId || !accountId || !documentTable) {
      throw new Error('Database client, template node id, account id, and document table are required')
    }
    const existing = await getDocumentSignatories(db, templateNodeId)
    if (!existing.success) throw new Error(existing.message)
    if (existing.data.length > 0) return ok(existing.data)

    const reqResult = await resolveEffectiveSignatoryRequirements(db, {
      accountId,
      documentTable,
      projectId: projectId || null,
    })
    if (!reqResult.success) throw new Error(reqResult.message)
    const reqSlots = reqResult.data?.slots || []
    if (reqSlots.length === 0) return ok([])

    // Renumber 1..n so a corrupt requirements list can't insert duplicate slot_order.
    const rows = reqSlots.map((req, index) => ({
      template_node_id: templateNodeId,
      signing_round: 1,
      slot_order: index + 1,
      role_label: req.role_label,
      is_mandatory: req.is_mandatory !== false,
      status: 'pending',
    }))

    const { data, error } = await db
      .from('process_template_document_signatories')
      .insert(rows)
      .select('*')
    if (error) {
      const isDup =
        error.code === '23505' ||
        /uq_ptds_slot|duplicate key/i.test(String(error.message || ''))
      if (isDup) {
        const again = await getDocumentSignatories(db, templateNodeId)
        if (again.success && again.data.length > 0) return ok(again.data)
      }
      throw error
    }
    return ok((data || []).sort((a, b) => a.slot_order - b.slot_order))
  } catch (error) {
    return fail(error)
  }
}

/**
 * A losing racer in resyncPendingSigningRoundOrder's two-phase update hit uq_ptds_slot —
 * another concurrent call (or a fresh page load) got there first. Re-fetch rather than
 * surface the raw constraint error: if the round now matches the target order, that's a
 * genuine success (the other racer did the work); otherwise still return the current rows
 * as-is (self-heals next time this runs) rather than a scary error toast for what is, from
 * the user's point of view, nothing having gone wrong.
 */
async function recheckAfterRaceOrThrow(db, templateNodeId, originalError) {
  const again = await getDocumentSignatories(db, templateNodeId)
  if (again.success && again.data.length > 0) return ok(again.data)
  throw originalError
}

/**
 * Re-sync a document's signing-round slot order with the latest configured requirements,
 * so a re-ordered signatory chain (v893) is reflected on documents that haven't started
 * signing yet — not just on newly initialised ones. Deliberately conservative: only
 * touches a round where every slot is still 'pending' (no one has signed or declined),
 * and only when the *set* of role labels is unchanged (a pure re-order) — role_label is
 * matched to preserve each slot's assigned_user_id. Anything else (a role added/removed,
 * or signing already underway) is left untouched.
 */
export async function resyncPendingSigningRoundOrder(db, { templateNodeId, accountId, documentTable, projectId = null }) {
  try {
    if (!db || !templateNodeId || !accountId || !documentTable) {
      throw new Error('Database client, template node id, account id, and document table are required')
    }
    const existing = await getDocumentSignatories(db, templateNodeId)
    if (!existing.success) throw new Error(existing.message)
    const currentSlots = existing.data
    if (currentSlots.length === 0) return ok(currentSlots)
    if (currentSlots.some((s) => s.status !== 'pending')) return ok(currentSlots)

    const reqResult = await resolveEffectiveSignatoryRequirements(db, {
      accountId,
      documentTable,
      projectId: projectId || null,
    })
    if (!reqResult.success) throw new Error(reqResult.message)
    const reqSlots = reqResult.data?.slots || []
    if (reqSlots.length === 0) return ok(currentSlots)

    const sameSet = (a, b) => {
      if (a.length !== b.length) return false
      const sorted = (list) => [...list].sort()
      const sa = sorted(a)
      const sb = sorted(b)
      return sa.every((label, i) => label === sb[i])
    }
    const currentLabels = currentSlots.map((s) => s.role_label)
    const reqLabels = reqSlots.map((s) => s.role_label)
    if (!sameSet(currentLabels, reqLabels)) return ok(currentSlots)

    const alreadyInOrder = currentSlots.length === reqSlots.length
      && currentSlots.every((s, i) => s.role_label === reqSlots[i].role_label && s.slot_order === i + 1)
    if (alreadyInOrder) return ok(currentSlots)

    // Match by role_label (consumed one-at-a-time) so a slot's assigned_user_id follows its role.
    const pool = [...currentSlots]
    const updates = reqSlots.map((req, index) => {
      const poolIndex = pool.findIndex((s) => s.role_label === req.role_label)
      const match = pool.splice(poolIndex, 1)[0]
      return { id: match.id, slot_order: index + 1, is_mandatory: req.is_mandatory !== false }
    })

    // Two-phase: uq_ptds_slot (template_node_id, signing_round, slot_order) rejects any
    // update that would put a row's new slot_order where another row in this round still
    // sits. Stage every touched row onto a temporary out-of-range value first — chk_ptds_slot_order
    // requires slot_order >= 1, so a large positive offset (never realistic as a real signing
    // position) is used rather than a negative — then assign the real final positions once
    // none of the rows occupy 1..n any more.
    //
    // Two overlapping callers (e.g. React StrictMode's deliberate double-mount, or two tabs
    // open on the same document) can race on that same constraint. Each individual update
    // here is its own auto-committed statement, not one transaction, so a losing racer can't
    // be rolled back — instead, on any uq_ptds_slot hit, re-fetch and trust whichever caller
    // won: if the round already matches the target order, treat that as success.
    const STAGING_OFFSET = 100000
    const isDupKeyError = (error) =>
      error?.code === '23505' || /uq_ptds_slot|duplicate key/i.test(String(error?.message || ''))

    const staged = await Promise.all(
      currentSlots.map((slot, index) =>
        db
          .from('process_template_document_signatories')
          .update({ slot_order: STAGING_OFFSET + index + 1 })
          .eq('id', slot.id)
          .select('id')
          .single(),
      ),
    )
    const failedStage = staged.find((r) => r.error)
    if (failedStage) {
      if (isDupKeyError(failedStage.error)) return await recheckAfterRaceOrThrow(db, templateNodeId, failedStage.error)
      throw failedStage.error
    }

    const updated = await Promise.all(
      updates.map(({ id, slot_order, is_mandatory }) =>
        db
          .from('process_template_document_signatories')
          .update({ slot_order, is_mandatory, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single(),
      ),
    )
    const failedUpdate = updated.find((r) => r.error)
    if (failedUpdate) {
      if (isDupKeyError(failedUpdate.error)) return await recheckAfterRaceOrThrow(db, templateNodeId, failedUpdate.error)
      throw failedUpdate.error
    }
    return ok(updated.map((r) => r.data).sort((a, b) => a.slot_order - b.slot_order))
  } catch (error) {
    return fail(error)
  }
}

/** Assign (or reassign) who fills a still-pending slot in the current round. */
export async function assignSignatory(db, { templateNodeId, slotOrder, assignedUserId }) {
  try {
    if (!db || !templateNodeId || !slotOrder) throw new Error('Database client, template node id, and slot order are required')
    const round = await getCurrentRoundNumber(db, 'process_template_document_signatories', templateNodeId)
    if (round === 0) throw new Error('Signing has not been initialised for this document yet.')

    const { data, error } = await db
      .from('process_template_document_signatories')
      .update({ assigned_user_id: assignedUserId || null, updated_at: new Date().toISOString() })
      .eq('template_node_id', templateNodeId)
      .eq('signing_round', round)
      .eq('slot_order', slotOrder)
      .eq('status', 'pending')
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Sign a slot — uploads the signature image (freshly provided, or the caller's saved
 * one) into the document's own signature storage, then flips the row to 'signed'.
 * RLS independently enforces both "only the assigned signatory" and "only in turn" —
 * this function's own turn-check below exists purely to fail with a clear message
 * before attempting a network round-trip, not as the actual security boundary.
 */
export async function signSlot(db, { templateNodeId, slotOrder, file = null, mode = 'platform' }) {
  try {
    if (!db || !templateNodeId || !slotOrder) throw new Error('Database client, template node id, and slot order are required')

    const round = await getCurrentRoundNumber(db, 'process_template_document_signatories', templateNodeId)
    if (round === 0) throw new Error('Signing has not been initialised for this document yet.')

    let sourceFile = file
    if (!sourceFile) {
      const saved = await getSavedSignature(db)
      if (!saved.success || !saved.data) throw new Error('No saved signature found — please upload one.')
      const download = await db.storage.from(USER_SIGNATURES_BUCKET).download(saved.data.storage_path)
      if (download.error) throw download.error
      sourceFile = new File([download.data], saved.data.file_name, { type: saved.data.mime_type })
    } else {
      const validationError = validateSignatureFile(sourceFile)
      if (validationError) throw new Error(validationError)
    }

    const ext = fileExt(sourceFile)
    const storagePath = `${mode === 'sim' ? 'sim' : 'platform'}/${templateNodeId}/${round}/${slotOrder}/signature.${ext}`

    const { error: uploadError } = await db.storage
      .from(PROCESS_TEMPLATE_SIGNATURES_BUCKET)
      .upload(storagePath, sourceFile, { cacheControl: '3600', upsert: true, contentType: sourceFile.type })
    if (uploadError) throw uploadError

    const { data, error } = await db
      .from('process_template_document_signatories')
      .update({
        status: 'signed',
        storage_bucket: PROCESS_TEMPLATE_SIGNATURES_BUCKET,
        storage_path: storagePath,
        file_name: sourceFile.name,
        mime_type: sourceFile.type,
        file_size: sourceFile.size,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('template_node_id', templateNodeId)
      .eq('signing_round', round)
      .eq('slot_order', slotOrder)
      .eq('status', 'pending')
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Decline a slot in place of signing — halts the chain, requires a reason. */
export async function declineSlot(db, { templateNodeId, slotOrder, reason }) {
  try {
    if (!db || !templateNodeId || !slotOrder) throw new Error('Database client, template node id, and slot order are required')
    if (!reason || !reason.trim()) throw new Error('A reason is required to decline.')

    const round = await getCurrentRoundNumber(db, 'process_template_document_signatories', templateNodeId)
    if (round === 0) throw new Error('Signing has not been initialised for this document yet.')

    const { data, error } = await db
      .from('process_template_document_signatories')
      .update({
        status: 'declined',
        decline_reason: reason.trim(),
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('template_node_id', templateNodeId)
      .eq('signing_round', round)
      .eq('slot_order', slotOrder)
      .eq('status', 'pending')
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Full restart after a decline — new round, same assigned people, everyone re-signs. */
export async function restartSigningChain(db, { templateNodeId }) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const table = 'process_template_document_signatories'
    const round = await getCurrentRoundNumber(db, table, templateNodeId)
    if (round === 0) throw new Error('Signing has not been initialised for this document yet.')

    const { data: priorRows, error: priorError } = await db
      .from(table)
      .select('*')
      .eq('template_node_id', templateNodeId)
      .eq('signing_round', round)
      .order('slot_order', { ascending: true })
    if (priorError) throw priorError

    const nextRound = round + 1
    const rows = (priorRows || []).map((r) => ({
      template_node_id: templateNodeId,
      signing_round: nextRound,
      slot_order: r.slot_order,
      role_label: r.role_label,
      is_mandatory: r.is_mandatory !== false,
      assigned_user_id: r.assigned_user_id,
      status: 'pending',
    }))

    const { data, error } = await db.from(table).insert(rows).select('*')
    if (error) throw error
    return ok((data || []).sort((a, b) => a.slot_order - b.slot_order))
  } catch (error) {
    return fail(error)
  }
}

/** TRUE once every mandatory slot in the current round is signed (v873). */
export async function isDocumentFullySigned(db, templateNodeId) {
  const result = await getDocumentSignatories(db, templateNodeId)
  if (!result.success) return false
  return areMandatorySlotsSigned(result.data)
}

// ─────────────────────────────────────────────────────────────
// Personal saved signature (public.user_signature_images — owner-only, shared
// between Platform and Simulator since it belongs to the person, not the app)
// ─────────────────────────────────────────────────────────────

export async function getSavedSignature(db) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = await currentAuthUserId(db)
    const { data, error } = await db
      .from('user_signature_images')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (error) throw error
    return ok(data || null)
  } catch (error) {
    return fail(error)
  }
}

export async function saveSignatureImage(db, file, accountId) {
  try {
    if (!db || !file) throw new Error('Database client and file are required')
    const validationError = validateSignatureFile(file)
    if (validationError) throw new Error(validationError)

    const authUserId = await currentAuthUserId(db)
    const ext = fileExt(file)
    const storagePath = `${authUserId}/signature.${ext}`

    const { error: uploadError } = await db.storage
      .from(USER_SIGNATURES_BUCKET)
      .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data, error } = await db
      .from('user_signature_images')
      .upsert({
        auth_user_id: authUserId,
        account_id: accountId,
        storage_bucket: USER_SIGNATURES_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'auth_user_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Remove the current user's saved signature (storage object + user_signature_images row). */
export async function deleteSavedSignature(db) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = await currentAuthUserId(db)
    const existing = await getSavedSignature(db)
    if (!existing.success) throw new Error(existing.message)
    if (!existing.data) return ok(null)

    const { error: removeError } = await db.storage
      .from(existing.data.storage_bucket || USER_SIGNATURES_BUCKET)
      .remove([existing.data.storage_path])
    if (removeError) throw removeError

    const { error } = await db
      .from('user_signature_images')
      .delete()
      .eq('auth_user_id', authUserId)
    if (error) throw error
    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

// ─────────────────────────────────────────────────────────────
// Signed URLs + export resolution
// ─────────────────────────────────────────────────────────────

export async function getSignatureSignedUrl(db, storagePath, expiresInSeconds = 3600, bucket = PROCESS_TEMPLATE_SIGNATURES_BUCKET) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error) throw error
    return ok(data.signedUrl)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Resolve a document's current-round slots for export — mirrors
 * resolveDocumentAttachmentsForExport (v867). Signed slots include signature URLs;
 * pending optional / declined slots appear as text status lines (v873).
 * Returns { textValues: string[], assets: [...] } for ExportRecordMenu.
 */
export async function resolveDocumentSignaturesForExport(db, templateNodeId, userLabelResolver = null) {
  try {
    if (!db || !templateNodeId) throw new Error('Database client and template node id are required')
    const listResult = await getDocumentSignatories(db, templateNodeId)
    if (!listResult.success) throw new Error(listResult.message)

    const textValues = []
    const assets = []

    for (const row of listResult.data) {
      const signerLabel = userLabelResolver ? await userLabelResolver(row.assigned_user_id) : row.assigned_user_id
      if (row.status === 'signed') {
        const urlResult = row.storage_path ? await getSignatureSignedUrl(db, row.storage_path) : { success: false }
        const asset = {
          role_label: row.role_label,
          signer_label: signerLabel || '',
          signed_at: row.signed_at,
          display_id: row.display_id || '',
          is_mandatory: row.is_mandatory !== false,
          url: urlResult.success ? urlResult.data : null,
        }
        assets.push(asset)
        const label = `${row.role_label}: ${asset.signer_label} — signed ${row.signed_at ? new Date(row.signed_at).toLocaleString() : ''}`
        textValues.push(asset.url ? `${label} - ${asset.url}` : label)
      } else if (row.status === 'declined') {
        textValues.push(`${row.role_label}: Declined${row.decline_reason ? ` — ${row.decline_reason}` : ''}`)
      } else if (!slotIsMandatory(row)) {
        textValues.push(`${row.role_label}: Optional — not signed`)
      } else {
        textValues.push(`${row.role_label}: Pending`)
      }
    }

    return ok({ textValues, assets })
  } catch (error) {
    return fail(error)
  }
}
