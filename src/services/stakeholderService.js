import { platformDb } from './supabaseClient'
import { buildGapSummary } from '../utils/stakeholderSEAMUtils'

/**
 * Stakeholder Service - API functions for Stakeholder Management module
 * Uses platformDb (public schema) for consistency with Platform app.
 */

/** Matches platformDb auth.storageKey in supabase/supabaseClient.js */
const AUTH_STORAGE_KEY = 'project-nidus-auth'
const INTERNAL_USER_CACHE_PREFIX = 'nidus-internal-user-id'

/** Max time to wait for auth user read when storage has no session (avoids indefinite hang). */
const AUTH_SESSION_TIMEOUT_MS = 15000
/** Max time to wait for a single stakeholders table write (avoids stuck "Saving..."). */
const STAKEHOLDER_WRITE_TIMEOUT_MS = 45000

/**
 * Reject if promise does not settle in time (UI can always recover).
 */
function withTimeout(promise, ms, label) {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} took longer than ${Math.round(ms / 1000)}s. Check your network or VPN, then try again.`
          )
        ),
      ms
    )
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer))
}

/**
 * Only public.stakeholders columns — strips nested/junk keys from spread form state
 * (drafts, accidental merges) that can confuse PostgREST or bloat the payload.
 */
const STAKEHOLDER_WRITE_KEYS = new Set([
  'project_id',
  'user_id',
  'stakeholder_reference',
  'stakeholder_name',
  'stakeholder_title',
  'stakeholder_organization',
  'stakeholder_department',
  'stakeholder_type',
  'stakeholder_category',
  'stakeholder_role',
  'email',
  'phone',
  'mobile',
  'emails',
  'phones',
  'mobiles',
  'office_location',
  'preferred_contact_method',
  'reports_to_stakeholder_id',
  'organization_level',
  'project_role',
  'is_decision_maker',
  'is_influencer',
  'is_powerful',
  'is_negatively_affected',
  'is_positively_affected',
  'is_affected_by_project',
  'availability_hours_per_week',
  'time_zone',
  'availability_constraints',
  'stakeholder_status',
  'status_date',
  'notes',
  'special_requirements',
  'expectations',
  'tags',
  'identification_source',
  'identification_date',
])

const UUID_LIKE_KEYS = new Set(['project_id', 'user_id', 'reports_to_stakeholder_id'])

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function pickStakeholderWritePayload(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of STAKEHOLDER_WRITE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    let v = raw[key]
    if (UUID_LIKE_KEYS.has(key) && v === '') v = null
    if (key === 'time_zone' && typeof v === 'string' && v.length > 100) {
      v = v.slice(0, 100)
    }
    if (v !== undefined) out[key] = v
  }
  return out
}

/**
 * Read auth user id from sessionStorage (same key as platformDb). Avoids getSession() hangs
 * when GoTrue is refreshing or simDb auth sync is in flight.
 */
function readStoredAuthUserId() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.user?.id) return data.user.id
    if (data?.currentSession?.user?.id) return data.currentSession.user.id
    if (Array.isArray(data)) {
      for (const entry of data) {
        const id = entry?.user?.id ?? entry?.currentSession?.user?.id
        if (id) return id
      }
    }
    return null
  } catch {
    return null
  }
}

let _authUserIdInFlight = null

/**
 * Supabase Auth user id (auth.users / session).
 */
async function getAuthSessionUserId() {
  const stored = readStoredAuthUserId()
  if (stored) return stored

  if (!_authUserIdInFlight) {
    _authUserIdInFlight = (async () => {
      const { data: { user }, error } = await withTimeout(
        platformDb.auth.getUser(),
        AUTH_SESSION_TIMEOUT_MS,
        'Loading your session'
      )
      if (error) throw error
      if (!user?.id) throw new Error('User not authenticated')
      return user.id
    })().finally(() => {
      _authUserIdInFlight = null
    })
  }
  return _authUserIdInFlight
}

/** Cache: auth uid -> public.users.id (FK targets use the latter, not auth uid). */
let _platformUserCache = { authId: null, platformUserId: null }
let _platformUserIdInFlight = null

/**
 * public.users.id for audit/FK columns (created_by, updated_by, analyzed_by, …).
 * Must match users.id — not the same as auth.users id when users.id is a separate PK.
 */
async function getPlatformUserId() {
  const authId = await getAuthSessionUserId()
  if (_platformUserCache.authId === authId && _platformUserCache.platformUserId) {
    return _platformUserCache.platformUserId
  }

  let cachedPlatformId = null
  try {
    cachedPlatformId = sessionStorage.getItem(`${INTERNAL_USER_CACHE_PREFIX}:${authId}`)
  } catch {
    /* ignore */
  }
  if (cachedPlatformId) {
    _platformUserCache = { authId, platformUserId: cachedPlatformId }
    return cachedPlatformId
  }

  if (_platformUserIdInFlight) {
    return _platformUserIdInFlight
  }

  _platformUserIdInFlight = (async () => {
    const { data: row } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authId)
      .eq('is_deleted', false)
      .maybeSingle()

    const platformUserId = row?.id ?? null
    _platformUserCache = { authId, platformUserId }
    if (platformUserId) {
      try {
        sessionStorage.setItem(`${INTERNAL_USER_CACHE_PREFIX}:${authId}`, platformUserId)
      } catch {
        /* ignore */
      }
    }
    return platformUserId
  })().finally(() => {
    _platformUserIdInFlight = null
  })

  return _platformUserIdInFlight
}

// ================================================
// STAKEHOLDERS
// ================================================

/**
 * Get all stakeholders. Uses RPC get_stakeholders_list (v304.4) when available
 * so the list loads regardless of RLS; falls back to table select otherwise.
 */
export async function getStakeholders(filters = {}) {
  const limit = filters.limit != null && filters.limit > 0 ? filters.limit : 50
  const { data: rpcData, error: rpcError } = await platformDb.rpc('get_stakeholders_list', {
    p_project_id: filters.project_id || null,
    p_limit: limit,
    p_stakeholder_type: filters.stakeholder_type || null,
    p_stakeholder_status: filters.stakeholder_status || null,
    p_search: filters.search || null,
  })

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData
  }

  // Fallback if RPC not deployed (e.g. v304.4 not run)
  let query = platformDb
    .from('stakeholders')
    .select('*')
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_type) {
    query = query.eq('stakeholder_type', filters.stakeholder_type)
  }

  if (filters.stakeholder_status) {
    query = query.eq('stakeholder_status', filters.stakeholder_status)
  }

  if (filters.search) {
    query = query.or(`stakeholder_name.ilike.%${filters.search}%,stakeholder_reference.ilike.%${filters.search}%,stakeholder_organization.ilike.%${filters.search}%`)
  }

  query = query.order('stakeholder_name', { ascending: true })

  if (filters.limit != null && filters.limit > 0) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

/**
 * Get a single stakeholder by ID
 */
export async function getStakeholder(stakeholderId) {
  const { data, error } = await platformDb
    .from('stakeholders')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      user:user_id (id, email, full_name),
      reports_to:reports_to_stakeholder_id (id, stakeholder_name, stakeholder_reference)
    `)
    .eq('id', stakeholderId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a stakeholder
 */
export async function saveStakeholder(stakeholderData, stakeholderId = null) {
  const platformUserId = await getPlatformUserId()

  const cleaned = pickStakeholderWritePayload(stakeholderData)
  const updateData = { ...cleaned }
  if (platformUserId) {
    updateData.updated_by = platformUserId
    if (!stakeholderId) {
      updateData.created_by = platformUserId
    }
  }

  if (stakeholderId) {
    const { data, error } = await withTimeout(
      platformDb
        .from('stakeholders')
        .update(updateData)
        .eq('id', stakeholderId)
        .select()
        .single(),
      STAKEHOLDER_WRITE_TIMEOUT_MS,
      'Saving stakeholder'
    )

    if (error) throw error
    return data
  }
  const { data, error } = await withTimeout(
    platformDb.from('stakeholders').insert(updateData).select().single(),
    STAKEHOLDER_WRITE_TIMEOUT_MS,
    'Saving stakeholder'
  )

  if (error) throw error
  return data
}

/**
 * Delete a stakeholder (soft delete)
 */
export async function deleteStakeholder(stakeholderId) {
  const platformUserId = await getPlatformUserId()

  const patch = {
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }
  if (platformUserId) {
    patch.deleted_by = platformUserId
    patch.updated_by = platformUserId
  }

  const { data, error } = await platformDb
    .from('stakeholders')
    .update(patch)
    .eq('id', stakeholderId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Bulk import stakeholders from an array of row objects.
 * @param {Array<object>} rows - Array of row objects (e.g. from CSV parse) with stakeholder_name and optional fields
 * @param {{ projectId?: string }} options - Optional projectId to assign all imported stakeholders to
 * @returns {{ created: object[], failed: Array<{ row: object, error: string }> }}
 */
export async function importStakeholders(rows, options = {}) {
  const { projectId = null } = options
  const created = []
  const failed = []
  for (const row of rows) {
    const name = (row.stakeholder_name || row.name || '').trim()
    if (!name) {
      failed.push({ row, error: 'Missing stakeholder_name' })
      continue
    }
    try {
      const payload = {
        project_id: projectId,
        stakeholder_name: name,
        stakeholder_reference: (row.stakeholder_reference || '').trim() || null,
        stakeholder_title: (row.stakeholder_title || row.title || '').trim() || null,
        stakeholder_organization: (row.stakeholder_organization || row.organization || '').trim() || null,
        stakeholder_department: (row.stakeholder_department || row.department || '').trim() || null,
        email: (row.email || '').trim() || null,
        phone: (row.phone || '').trim() || null,
        mobile: (row.mobile || '').trim() || null,
        stakeholder_type: (row.stakeholder_type || row.type || 'internal').trim() || 'internal',
        stakeholder_category: (row.stakeholder_category || row.category || 'individual').trim() || null,
        project_role: (row.project_role || row.role || '').trim() || null,
        stakeholder_status: (row.stakeholder_status || row.status || 'active').trim() || 'active',
        notes: (row.notes || '').trim() || null,
        special_requirements: (row.special_requirements || '').trim() || null,
        expectations: (row.expectations || '').trim() || null,
      }
      const saved = await saveStakeholder(payload, null)
      created.push(saved)
    } catch (err) {
      failed.push({ row, error: err?.message || String(err) })
    }
  }
  return { created, failed }
}

// ================================================
// STAKEHOLDER ASSESSMENT MATRIX (SEAM)
// ================================================

const ASSESSMENT_MATRIX_WRITE_KEYS = new Set([
  'project_id',
  'stakeholder_id',
  'assessment_date',
  'current_level',
  'desired_level',
  'gap_summary',
  'notes',
])

/**
 * @param {Record<string, unknown>} raw
 */
export function pickAssessmentMatrixWritePayload(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of ASSESSMENT_MATRIX_WRITE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    if (raw[key] !== undefined) out[key] = raw[key]
  }
  if (!out.gap_summary && out.current_level && out.desired_level) {
    out.gap_summary = buildGapSummary(String(out.current_level), String(out.desired_level))
  }
  return out
}

export async function getStakeholderAssessmentMatrix(filters = {}) {
  let query = platformDb
    .from('stakeholder_assessment_matrix')
    .select(`
      *,
      stakeholder:stakeholder_id (
        id,
        stakeholder_name,
        stakeholder_reference,
        stakeholder_type
      ),
      project:project_id (
        id,
        project_name,
        project_code
      )
    `)
    .eq('is_deleted', false)

  if (filters.project_id) query = query.eq('project_id', filters.project_id)
  if (filters.stakeholder_id) query = query.eq('stakeholder_id', filters.stakeholder_id)

  const { data, error } = await query.order('assessment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getStakeholderAssessmentMatrixById(id) {
  const { data, error } = await platformDb
    .from('stakeholder_assessment_matrix')
    .select(`
      *,
      stakeholder:stakeholder_id (id, stakeholder_name, stakeholder_reference),
      project:project_id (id, project_name, project_code)
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function saveStakeholderAssessmentMatrix(matrixData, matrixId = null) {
  const platformUserId = await getPlatformUserId()
  const cleaned = pickAssessmentMatrixWritePayload(matrixData)
  const updateData = { ...cleaned }
  if (platformUserId) updateData.updated_by = platformUserId
  if (!updateData.assessment_date) {
    updateData.assessment_date = new Date().toISOString().split('T')[0]
  }

  if (matrixId) {
    const { data, error } = await platformDb
      .from('stakeholder_assessment_matrix')
      .update(updateData)
      .eq('id', matrixId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const projectId = updateData.project_id
  const stakeholderId = updateData.stakeholder_id
  if (projectId && stakeholderId) {
    const { data: existing } = await platformDb
      .from('stakeholder_assessment_matrix')
      .select('id')
      .eq('project_id', projectId)
      .eq('stakeholder_id', stakeholderId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (existing?.id) {
      return saveStakeholderAssessmentMatrix(updateData, existing.id)
    }
  }

  if (platformUserId) updateData.created_by = platformUserId
  const { data, error } = await platformDb
    .from('stakeholder_assessment_matrix')
    .insert(updateData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStakeholderAssessmentMatrix(matrixId) {
  const platformUserId = await getPlatformUserId()
  const patch = { is_deleted: true, deleted_at: new Date().toISOString() }
  if (platformUserId) {
    patch.deleted_by = platformUserId
    patch.updated_by = platformUserId
  }
  const { data, error } = await platformDb
    .from('stakeholder_assessment_matrix')
    .update(patch)
    .eq('id', matrixId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Get stakeholder analysis records
 */
export async function getStakeholderAnalysis(filters = {}) {
  let query = platformDb
    .from('stakeholder_analysis')
    .select(`
      *,
      stakeholder:stakeholder_id (
        id,
        stakeholder_name,
        stakeholder_reference,
        stakeholder_type
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      analyzed_by_user:analyzed_by (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_id) {
    query = query.eq('stakeholder_id', filters.stakeholder_id)
  }

  if (filters.matrix_quadrant) {
    query = query.eq('matrix_quadrant', filters.matrix_quadrant)
  }

  const { data, error } = await query.order('analysis_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update stakeholder analysis
 */
export async function saveStakeholderAnalysis(analysisData, analysisId = null) {
  const platformUserId = await getPlatformUserId()

  const updateData = {
    ...analysisData,
  }
  if (platformUserId) {
    updateData.updated_by = platformUserId
  }

  if (analysisId) {
    const { data, error } = await platformDb
      .from('stakeholder_analysis')
      .update(updateData)
      .eq('id', analysisId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    if (platformUserId) {
      updateData.created_by = platformUserId
      if (!updateData.analyzed_by) {
        updateData.analyzed_by = platformUserId
      }
    }
    if (!updateData.analysis_date) {
      updateData.analysis_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('stakeholder_analysis')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ================================================
// STAKEHOLDER ENGAGEMENT
// ================================================

/**
 * Get stakeholder engagement records
 */
export async function getStakeholderEngagement(filters = {}) {
  let query = platformDb
    .from('stakeholder_engagement')
    .select(`
      *,
      stakeholder:stakeholder_id (
        id,
        stakeholder_name,
        stakeholder_reference
      ),
      project:project_id (
        id,
        project_name,
        project_code
      )
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_id) {
    query = query.eq('stakeholder_id', filters.stakeholder_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update stakeholder engagement
 */
export async function saveStakeholderEngagement(engagementData, engagementId = null) {
  const platformUserId = await getPlatformUserId()

  const updateData = {
    ...engagementData,
  }
  if (platformUserId) {
    updateData.updated_by = platformUserId
  }

  if (engagementId) {
    const { data, error } = await platformDb
      .from('stakeholder_engagement')
      .update(updateData)
      .eq('id', engagementId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    if (platformUserId) {
      updateData.created_by = platformUserId
    }
    const { data, error } = await platformDb
      .from('stakeholder_engagement')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete stakeholder analysis (soft delete)
 */
export async function deleteStakeholderAnalysis(analysisId) {
  const platformUserId = await getPlatformUserId()
  const patch = { is_deleted: true, deleted_at: new Date().toISOString() }
  if (platformUserId) {
    patch.deleted_by = platformUserId
    patch.updated_by = platformUserId
  }
  const { data, error } = await platformDb
    .from('stakeholder_analysis')
    .update(patch)
    .eq('id', analysisId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// STAKEHOLDER COMMUNICATIONS (log)
// ================================================

/**
 * Get stakeholder communications log
 */
export async function getStakeholderCommunications(filters = {}) {
  let query = platformDb
    .from('stakeholder_communications')
    .select(`
      *,
      project:project_id (id, project_name, project_code),
      plan:communication_plan_id (id, plan_name)
    `)
    .eq('is_deleted', false)
  if (filters.project_id) query = query.eq('project_id', filters.project_id)
  if (filters.communication_plan_id) query = query.eq('communication_plan_id', filters.communication_plan_id)
  const { data, error } = await query.order('actual_date', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Create or update stakeholder communication log entry
 */
export async function saveStakeholderCommunication(logData, logId = null) {
  const platformUserId = await getPlatformUserId()
  const updateData = { ...logData }
  if (platformUserId) {
    updateData.updated_by = platformUserId
  }
  if (logId) {
    const { data, error } = await platformDb.from('stakeholder_communications').update(updateData).eq('id', logId).select().single()
    if (error) throw error
    return data
  }
  if (platformUserId) {
    updateData.created_by = platformUserId
  }
  const { data, error } = await platformDb.from('stakeholder_communications').insert(updateData).select().single()
  if (error) throw error
  return data
}

// ================================================
// COMMUNICATION PLANS
// ================================================

/**
 * Get communication plans
 */
export async function getCommunicationPlans(filters = {}) {
  let query = platformDb
    .from('communication_plans')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      owner:communication_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update communication plan
 */
export async function saveCommunicationPlan(planData, planId = null) {
  const platformUserId = await getPlatformUserId()

  const updateData = {
    ...planData,
  }
  if (platformUserId) {
    updateData.updated_by = platformUserId
  }

  if (planId) {
    const { data, error } = await platformDb
      .from('communication_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    if (platformUserId) {
      updateData.created_by = platformUserId
      if (!updateData.communication_owner_user_id) {
        updateData.communication_owner_user_id = platformUserId
      }
    }
    const { data, error } = await platformDb
      .from('communication_plans')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ================================================
// ENGAGEMENT ACTIONS (per-stakeholder action plan)
// ================================================

/**
 * Get engagement actions for a project, optionally filtered by stakeholder
 */
export async function getEngagementActions(filters = {}) {
  let query = platformDb
    .from('stakeholder_engagement_actions')
    .select(`
      *,
      stakeholder:stakeholder_id (id, stakeholder_name, stakeholder_reference),
      owner:owner_user_id (id, full_name, email)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }
  if (filters.stakeholder_id) {
    query = query.eq('stakeholder_id', filters.stakeholder_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

/**
 * Create or update an engagement action
 */
export async function saveEngagementAction(actionData, actionId = null) {
  const platformUserId = await getPlatformUserId()

  const payload = {
    project_id: actionData.project_id,
    stakeholder_id: actionData.stakeholder_id,
    action_description: actionData.action_description,
    owner_user_id: actionData.owner_user_id || null,
    due_date: actionData.due_date || null,
    status: actionData.status || 'open',
    action_type: actionData.action_type || 'other',
    priority: actionData.priority || 'medium',
    completion_date: actionData.completion_date || null,
    outcome_notes: actionData.outcome_notes || null,
  }
  if (platformUserId) {
    payload.updated_by = platformUserId
  }

  if (actionId) {
    const { data, error } = await platformDb
      .from('stakeholder_engagement_actions')
      .update(payload)
      .eq('id', actionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  if (platformUserId) {
    payload.created_by = platformUserId
  }
  const { data, error } = await platformDb
    .from('stakeholder_engagement_actions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete an engagement action
 */
export async function deleteEngagementAction(actionId) {
  const platformUserId = await getPlatformUserId()

  const patch = {
    is_deleted: true,
    updated_at: new Date().toISOString(),
  }
  if (platformUserId) {
    patch.updated_by = platformUserId
  }

  const { data, error } = await platformDb
    .from('stakeholder_engagement_actions')
    .update(patch)
    .eq('id', actionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// STAKEHOLDER RELATIONSHIPS
// ================================================

/**
 * Get stakeholder relationships for a project, optionally filtered by stakeholder (from or to)
 */
export async function getStakeholderRelationships(filters = {}) {
  let query = platformDb
    .from('stakeholder_relationships')
    .select(`
      *,
      from_stakeholder:from_stakeholder_id (id, stakeholder_name, stakeholder_reference),
      to_stakeholder:to_stakeholder_id (id, stakeholder_name, stakeholder_reference)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) query = query.eq('project_id', filters.project_id)
  if (filters.stakeholder_id) {
    query = query.or(`from_stakeholder_id.eq.${filters.stakeholder_id},to_stakeholder_id.eq.${filters.stakeholder_id}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Create or update a stakeholder relationship
 */
export async function saveStakeholderRelationship(relData, relId = null) {
  const platformUserId = await getPlatformUserId()

  const payload = {
    project_id: relData.project_id,
    from_stakeholder_id: relData.from_stakeholder_id,
    to_stakeholder_id: relData.to_stakeholder_id,
    relationship_type: relData.relationship_type,
    relationship_strength: relData.relationship_strength ?? null,
    notes: relData.notes || null,
  }
  if (platformUserId) {
    payload.updated_by = platformUserId
  }

  if (relId) {
    const { data, error } = await platformDb.from('stakeholder_relationships').update(payload).eq('id', relId).select().single()
    if (error) throw error
    return data
  }
  if (platformUserId) {
    payload.created_by = platformUserId
  }
  const { data, error } = await platformDb.from('stakeholder_relationships').insert(payload).select().single()
  if (error) throw error
  return data
}

/**
 * Soft-delete a stakeholder relationship
 */
export async function deleteStakeholderRelationship(relId) {
  const platformUserId = await getPlatformUserId()

  const patch = { is_deleted: true, updated_at: new Date().toISOString() }
  if (platformUserId) {
    patch.updated_by = platformUserId
  }

  const { data, error } = await platformDb
    .from('stakeholder_relationships')
    .update(patch)
    .eq('id', relId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get stakeholder management dashboard stats
 */
export async function getStakeholderManagementStats(filters = {}) {
  try {
    const [stakeholders, analysis, engagement] = await Promise.all([
      getStakeholders(filters),
      getStakeholderAnalysis(filters),
      getStakeholderEngagement(filters),
    ])

    const stats = {
      totalStakeholders: stakeholders.length,
      activeStakeholders: stakeholders.filter(s => s.stakeholder_status === 'active').length,
      internalStakeholders: stakeholders.filter(s => s.stakeholder_type === 'internal').length,
      externalStakeholders: stakeholders.filter(s => s.stakeholder_type === 'external').length,
      totalAnalysis: analysis.length,
      byQuadrant: {
        'manage-closely': analysis.filter(a => a.matrix_quadrant === 'manage-closely').length,
        'keep-satisfied': analysis.filter(a => a.matrix_quadrant === 'keep-satisfied').length,
        'monitor': analysis.filter(a => a.matrix_quadrant === 'monitor').length,
        'keep-informed': analysis.filter(a => a.matrix_quadrant === 'keep-informed').length,
      },
      byAttitude: {
        'champion': analysis.filter(a => a.current_attitude === 'champion').length,
        'supporter': analysis.filter(a => a.current_attitude === 'supporter').length,
        'neutral': analysis.filter(a => a.current_attitude === 'neutral').length,
        'critic': analysis.filter(a => a.current_attitude === 'critic').length,
        'blocker': analysis.filter(a => a.current_attitude === 'blocker').length,
      },
      totalEngagement: engagement.length,
    }

    return stats
  } catch (error) {
    console.error('Error getting stakeholder management stats:', error)
    throw error
  }
}

export default {
  // Stakeholders
  getStakeholders,
  getStakeholder,
  saveStakeholder,
  deleteStakeholder,
  importStakeholders,
  
  // Stakeholder Assessment Matrix
  getStakeholderAssessmentMatrix,
  getStakeholderAssessmentMatrixById,
  saveStakeholderAssessmentMatrix,
  deleteStakeholderAssessmentMatrix,
  pickAssessmentMatrixWritePayload,

  // Stakeholder Analysis
  getStakeholderAnalysis,
  saveStakeholderAnalysis,
  deleteStakeholderAnalysis,
  
  // Stakeholder Communications (log)
  getStakeholderCommunications,
  saveStakeholderCommunication,
  
  // Stakeholder Engagement
  getStakeholderEngagement,
  saveStakeholderEngagement,
  
  // Communication Plans
  getCommunicationPlans,
  saveCommunicationPlan,
  
  // Engagement Actions
  getEngagementActions,
  saveEngagementAction,
  deleteEngagementAction,
  
  // Stakeholder Relationships
  getStakeholderRelationships,
  saveStakeholderRelationship,
  deleteStakeholderRelationship,
  
  // Dashboard
  getStakeholderManagementStats,
}

