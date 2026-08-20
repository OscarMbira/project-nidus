/**
 * Creation-time PM field-template inheritance (v783 / SQL v784).
 * Opt-in from create forms — creates a tier node + assignment under the parent
 * (or PMO default), then optionally writes resolved default values onto the record.
 */

import {
  resolveEffectiveFields,
  resolveStartNodeId,
} from './pmTemplateInheritanceService.js'
import {
  createTierFieldTemplateNode,
  getOrCreateEntityAssignment,
  upsertFieldLink,
} from './pmTemplateNodeService.js'

/**
 * Tier for a new entity given optional parent entity type.
 * Portfolio under a Portfolio → sub_portfolio.
 */
export function resolveTierForCreate(entityType, parentEntityType = null) {
  if (entityType === 'portfolio' && parentEntityType === 'portfolio') return 'sub_portfolio'
  return entityType
}

/**
 * Pick parent for inheritance: Programme preferred over Portfolio for projects.
 */
export function pickCreateParentLink({
  programmeId = null,
  portfolioId = null,
  parentPortfolioId = null,
} = {}) {
  if (programmeId) return { parentEntityType: 'programme', parentEntityId: programmeId }
  if (portfolioId) return { parentEntityType: 'portfolio', parentEntityId: portfolioId }
  if (parentPortfolioId) return { parentEntityType: 'portfolio', parentEntityId: parentPortfolioId }
  return { parentEntityType: null, parentEntityId: null }
}

function coerceDefaultForJson(value) {
  if (value == null) return null
  if (typeof value === 'object') return value
  return value
}

/**
 * Write resolved default values onto the new record.
 * - project → custom_field_values rows
 * - portfolio / programme → custom_fields JSONB keyed by field_code
 */
export async function applyResolvedFieldDefaults(db, {
  accountId,
  entityType,
  entityId,
  projectIdForValues = null,
  fields = [],
  userId = null,
}) {
  if (!db || !accountId || !entityId || !fields.length) {
    return { written: 0 }
  }

  const withDefaults = fields.filter((f) => f?.enabled !== false && f?.default_value != null)
  if (!withDefaults.length) return { written: 0 }

  const defIds = withDefaults.map((f) => f.custom_field_definition_id)
  const { data: defs, error: defErr } = await db
    .from('custom_field_definitions')
    .select('id, field_code, field_type')
    .in('id', defIds)
  if (defErr) throw defErr
  const defById = new Map((defs || []).map((d) => [d.id, d]))

  if (entityType === 'project') {
    const pid = projectIdForValues || entityId
    let written = 0
    for (const f of withDefaults) {
      const def = defById.get(f.custom_field_definition_id)
      if (!def) continue
      const row = {
        account_id: accountId,
        project_id: pid,
        entity_type: 'project',
        entity_id: entityId,
        field_definition_id: def.id,
        updated_by: userId,
        value_text: null,
        value_number: null,
        value_boolean: null,
        value_date: null,
        value_timestamptz: null,
        value_json: null,
      }
      const v = f.default_value
      if (typeof v === 'boolean' || def.field_type === 'boolean') {
        row.value_boolean = Boolean(v)
      } else if (typeof v === 'number' || def.field_type === 'number' || def.field_type === 'integer') {
        row.value_number = Number(v)
      } else if (def.field_type === 'date') {
        row.value_date = String(v).slice(0, 10)
      } else if (def.field_type === 'datetime') {
        row.value_timestamptz = String(v)
      } else if (def.field_type === 'json' || def.field_type === 'multi_select' || typeof v === 'object') {
        row.value_json = typeof v === 'object' ? v : JSON.parse(String(v))
      } else {
        row.value_text = String(v)
      }
      const { error } = await db
        .from('custom_field_values')
        .upsert(row, { onConflict: 'field_definition_id,entity_type,entity_id' })
      if (error) throw error
      written += 1
    }
    return { written }
  }

  if (entityType === 'portfolio' || entityType === 'programme' || entityType === 'sub_portfolio') {
    const table = entityType === 'programme' ? 'programmes' : 'portfolios'
    const bag = {}
    for (const f of withDefaults) {
      const def = defById.get(f.custom_field_definition_id)
      if (!def?.field_code) continue
      bag[def.field_code] = coerceDefaultForJson(f.default_value)
    }
    if (!Object.keys(bag).length) return { written: 0 }

    const { data: existing, error: readErr } = await db
      .from(table)
      .select('custom_fields')
      .eq('id', entityId)
      .maybeSingle()
    if (readErr) throw readErr
    const merged = { ...(existing?.custom_fields && typeof existing.custom_fields === 'object' ? existing.custom_fields : {}), ...bag }
    const { error: writeErr } = await db
      .from(table)
      .update({ custom_fields: merged, updated_at: new Date().toISOString() })
      .eq('id', entityId)
    if (writeErr) throw writeErr
    return { written: Object.keys(bag).length }
  }

  return { written: 0 }
}

/**
 * After insert: attach a fields-domain template node under the parent chain
 * and optionally apply default values onto the new record.
 *
 * @returns {{ ok: true, nodeId: string|null, startNodeId: string|null, fieldsApplied: number, skipped?: string }
 *          |{ ok: false, error: string }}
 */
export async function applyFieldTemplateInheritanceOnCreate(db, {
  accountId,
  entityType,
  entityId,
  entityName = null,
  parentEntityType = null,
  parentEntityId = null,
  userId = null,
  applyDefaults = true,
} = {}) {
  try {
    if (!db || !accountId || !entityType || !entityId) {
      return { ok: false, error: 'accountId, entityType, and entityId are required' }
    }

    let parentNodeId = null
    if (parentEntityType && parentEntityId) {
      parentNodeId = await resolveStartNodeId(db, parentEntityType, parentEntityId, 'fields', { accountId })
    }
    if (!parentNodeId) {
      // Standalone → PMO default (resolveStartNodeId with no assignment uses account PMO)
      parentNodeId = await resolveStartNodeId(db, entityType, entityId, 'fields', { accountId })
    }

    const tier = resolveTierForCreate(entityType, parentEntityType)
    const scopeEntityType = entityType === 'sub_portfolio' ? 'portfolio' : entityType

    const node = await createTierFieldTemplateNode(db, {
      accountId,
      tier,
      scopeEntityType,
      scopeEntityId: entityId,
      name: `${entityName || entityType} field template`,
      parentNodeId,
      userId,
    })

    await getOrCreateEntityAssignment(db, {
      accountId,
      entityType: scopeEntityType,
      entityId,
      domain: 'fields',
      nodeId: node.id,
    })

    let fieldsApplied = 0
    if (applyDefaults) {
      const resolved = await resolveEffectiveFields(db, scopeEntityType, entityId, { accountId })
      const applied = await applyResolvedFieldDefaults(db, {
        accountId,
        entityType: scopeEntityType,
        entityId,
        projectIdForValues: scopeEntityType === 'project' ? entityId : null,
        fields: resolved.fields || [],
        userId,
      })
      fieldsApplied = applied.written
    }

    return {
      ok: true,
      nodeId: node.id,
      startNodeId: parentNodeId,
      fieldsApplied,
    }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

/**
 * Create an instance-local field definition and link it to the entity's tier node.
 * Does not touch the shared LDE catalog (scope_entity_* set).
 */
export async function createInstanceLocalField(db, {
  accountId,
  entityType,
  entityId,
  fieldCode,
  label,
  fieldType = 'text',
  nodeId,
  userId = null,
} = {}) {
  if (!db || !accountId || !entityType || !entityId || !fieldCode || !label || !nodeId) {
    throw new Error('accountId, entityType, entityId, fieldCode, label, and nodeId are required')
  }
  const code = String(fieldCode).trim()
  const { data: def, error } = await db
    .from('custom_field_definitions')
    .insert({
      account_id: accountId,
      field_code: code,
      label: String(label).trim(),
      field_type: fieldType || 'text',
      workflow_status: 'published',
      scope_entity_type: entityType,
      scope_entity_id: entityId,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  await upsertFieldLink(db, {
    node_id: nodeId,
    custom_field_definition_id: def.id,
    is_local: true,
    enabled: true,
    // Persist display name on the link so resolveEffectiveFields shows it even
    // before definition hydration runs (and matches PMO-seeded label_override rows).
    label_override: String(label).trim(),
  })
  return def
}
