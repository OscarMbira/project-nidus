/**
 * GDPR Service — Simulator (v1108). Mirrors apps/platform/src/services/gdprService.js against the
 * sim schema (SQL/v1121_sim_gdpr_compliance_schema.sql), registry-driven from day one via
 * sim.practice_gdpr_export_registry (SQL/v1121).
 *
 * Identity note: sim.consent_logs/data_export_requests/data_deletion_requests/privacy_preferences'
 * user_id columns reference auth.users(id) DIRECTLY (sim.practice_projects' own convention — see
 * v1121's header comment) — so "userId" here is the raw Supabase auth uid, not public.users.id.
 * created_by/updated_by/processed_by/deleted_by still reference public.users(id) (shared role/
 * permission system only works through that table), resolved via getCurrentUserInternalUserId().
 * The Tier-1 registry itself is a further mix (some modules' owner columns reference auth.users
 * directly, others public.users) — each registry row's owner_identity_space says which.
 */
import { simDb } from '../supabaseClient'
import { getCurrentUserInternalUserId, getCurrentUserAccountId } from '../../utils/accountResolution'

async function fetchExportRegistry() {
  const { data, error } = await simDb
    .from('practice_gdpr_export_registry')
    .select('module_name, table_name, owner_columns, owner_identity_space')
    .eq('is_active', true)
  if (error) throw error
  return data || []
}

/**
 * @param {string} authUserId - raw auth.uid() for 'auth_user' rows
 * @param {string|null} internalUserId - resolved public.users.id for 'internal_user' rows
 */
function ownerIdForRow(row, authUserId, internalUserId) {
  return row.owner_identity_space === 'internal_user' ? internalUserId : authUserId
}

async function fetchModuleRowsForUser(tableName, ownerColumns, matchId) {
  if (!matchId) return []
  try {
    const orFilter = ownerColumns.map((col) => `${col}.eq.${matchId}`).join(',')
    const { data, error } = await simDb.from(tableName).select('*').or(orFilter).eq('is_deleted', false)
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn(`fetchModuleRowsForUser: skipping ${tableName} (${error.message})`)
    return []
  }
}

async function anonymizeModuleRowsForUser(tableName, ownerColumns, matchId) {
  if (!matchId) return 0
  let affected = 0
  for (const column of ownerColumns) {
    const { data, error } = await simDb.from(tableName).update({ [column]: null }).eq(column, matchId).select('id')
    if (error) {
      console.warn(`anonymizeModuleRowsForUser: skipping ${tableName}.${column} (${error.message})`)
      continue
    }
    affected += (data || []).length
  }
  return affected
}

/**
 * Record user consent
 * @param {string} authUserId - raw auth.uid() of the user this consent is about
 */
export async function recordConsent(authUserId, consentType, consentGiven, consentText, consentVersion = '1.0') {
  try {
    const [createdBy, accountId] = await Promise.all([getCurrentUserInternalUserId(), getCurrentUserAccountId()])

    const { data, error } = await simDb
      .from('consent_logs')
      .insert({
        user_id: authUserId,
        account_id: accountId,
        consent_type: consentType,
        consent_given: consentGiven,
        consent_text: consentText,
        consent_version: consentVersion,
        consent_method: 'explicit',
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Consent recorded successfully' }
  } catch (error) {
    console.error('Error recording consent:', error)
    return { success: false, message: error.message }
  }
}

export async function getConsentHistory(authUserId) {
  try {
    const { data, error } = await simDb
      .from('consent_logs')
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching consent history:', error)
    return { success: false, message: error.message, data: [] }
  }
}

export async function requestDataExport(authUserId, format = 'json') {
  try {
    const [createdBy, accountId] = await Promise.all([getCurrentUserInternalUserId(), getCurrentUserAccountId()])

    const { data, error } = await simDb
      .from('data_export_requests')
      .insert({
        user_id: authUserId,
        account_id: accountId,
        request_type: 'data_export',
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        export_format: format,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Data export request submitted' }
  } catch (error) {
    console.error('Error requesting data export:', error)
    return { success: false, message: error.message }
  }
}

export async function processDataExportRequest(requestId) {
  try {
    const currentUserId = await getCurrentUserInternalUserId()
    if (!currentUserId) throw new Error('User not authenticated')

    const { data: request, error: fetchError } = await simDb
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    if (fetchError) throw fetchError
    if (request.request_status !== 'pending') throw new Error('Request is not pending')

    await simDb
      .from('data_export_requests')
      .update({ request_status: 'processing', updated_at: new Date().toISOString(), updated_by: currentUserId })
      .eq('id', requestId)

    const exportData = await generateDataExportFile(request.user_id, request.export_format)
    const filePath = `/exports/${request.user_id}_${Date.now()}.${request.export_format}`

    const { data, error } = await simDb
      .from('data_export_requests')
      .update({
        request_status: 'completed',
        export_file_path: filePath,
        processed_at: new Date().toISOString(),
        processed_by: currentUserId,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId,
      })
      .eq('id', requestId)
      .select()
      .single()
    if (error) throw error

    return { success: true, data, export_data: exportData, message: 'Data export completed' }
  } catch (error) {
    console.error('Error processing data export request:', error)
    return { success: false, message: error.message }
  }
}

/**
 * @param {string} authUserId - raw auth.uid() the export is about
 */
async function generateDataExportFile(authUserId, format) {
  try {
    const [userData, registry] = await Promise.all([
      simDb.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle(),
      fetchExportRegistry(),
    ])
    const internalUserId = userData.data?.id || null

    const modules = {}
    for (const row of registry) {
      const matchId = ownerIdForRow(row, authUserId, internalUserId)
      modules[row.module_name] = await fetchModuleRowsForUser(row.table_name, row.owner_columns, matchId)
    }

    const exportData = {
      user: userData.data,
      modules,
      exported_at: new Date().toISOString(),
    }

    if (format === 'json') return JSON.stringify(exportData, null, 2)
    if (format === 'csv') return convertToCSV(exportData)
    throw new Error(`Unsupported format: ${format}`)
  } catch (error) {
    console.error('Error generating data export file:', error)
    throw error
  }
}

export async function requestDataDeletion(authUserId, reason = null) {
  try {
    const [createdBy, accountId] = await Promise.all([getCurrentUserInternalUserId(), getCurrentUserAccountId()])

    const { data, error } = await simDb
      .from('data_deletion_requests')
      .insert({
        user_id: authUserId,
        account_id: accountId,
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        scheduled_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        retention_exceptions: reason || null,
        created_by: createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, message: 'Data deletion request submitted' }
  } catch (error) {
    console.error('Error requesting data deletion:', error)
    return { success: false, message: error.message }
  }
}

export async function cancelDataDeletionRequest(requestId) {
  try {
    const currentUserId = await getCurrentUserInternalUserId()
    if (!currentUserId) throw new Error('User not authenticated')

    const { data: request, error: fetchError } = await simDb
      .from('data_deletion_requests')
      .select('request_status')
      .eq('id', requestId)
      .single()
    if (fetchError) throw fetchError
    if (request.request_status !== 'pending') throw new Error('Only a pending request can be cancelled')

    const { data, error } = await simDb
      .from('data_deletion_requests')
      .update({ request_status: 'rejected', updated_at: new Date().toISOString(), updated_by: currentUserId })
      .eq('id', requestId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data, message: 'Data deletion request cancelled' }
  } catch (error) {
    console.error('Error cancelling data deletion request:', error)
    return { success: false, message: error.message }
  }
}

export async function processDataDeletionRequest(requestId) {
  try {
    const currentUserId = await getCurrentUserInternalUserId()
    if (!currentUserId) throw new Error('User not authenticated')

    const { data: request, error: fetchError } = await simDb
      .from('data_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    if (fetchError) throw fetchError
    if (request.request_status !== 'pending') throw new Error('Request is not pending')

    await simDb
      .from('data_deletion_requests')
      .update({ request_status: 'processing', updated_at: new Date().toISOString(), updated_by: currentUserId })
      .eq('id', requestId)

    const deletionScope = await anonymizeUserData(request.user_id)

    const { data, error } = await simDb
      .from('data_deletion_requests')
      .update({
        request_status: 'completed',
        deletion_scope: deletionScope,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUserId,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId,
      })
      .eq('id', requestId)
      .select()
      .single()
    if (error) throw error

    return { success: true, data, message: 'Data deletion completed' }
  } catch (error) {
    console.error('Error processing data deletion request:', error)
    return { success: false, message: error.message }
  }
}

/**
 * @param {string} authUserId - raw auth.uid() being anonymized
 */
async function anonymizeUserData(authUserId) {
  try {
    const anonymizedId = `anonymized_${Date.now()}`
    const deletionScope = { user_id: authUserId, anonymized_id: anonymizedId, tables_affected: [] }

    const { data: userRow } = await simDb.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle()
    const internalUserId = userRow?.id || null

    if (internalUserId) {
      await simDb
        .from('users')
        .update({
          email: `${anonymizedId}@deleted.local`,
          full_name: 'Deleted User',
          first_name: null,
          last_name: null,
          phone_number: null,
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', internalUserId)
      deletionScope.tables_affected.push('users')
    }

    const registry = await fetchExportRegistry()
    for (const row of registry) {
      const matchId = ownerIdForRow(row, authUserId, internalUserId)
      const affected = await anonymizeModuleRowsForUser(row.table_name, row.owner_columns, matchId)
      if (affected > 0) {
        deletionScope.tables_affected.push(`${row.table_name} (${affected} row${affected === 1 ? '' : 's'})`)
      }
    }

    return deletionScope
  } catch (error) {
    console.error('Error anonymizing user data:', error)
    throw error
  }
}

export async function updatePrivacyPreferences(authUserId, preferences) {
  try {
    const [updatedBy, accountId] = await Promise.all([getCurrentUserInternalUserId(), getCurrentUserAccountId()])

    const { data, error } = await simDb
      .from('privacy_preferences')
      .upsert({
        user_id: authUserId,
        account_id: accountId,
        allow_marketing_emails: preferences.allow_marketing_emails !== undefined ? preferences.allow_marketing_emails : false,
        allow_analytics_tracking: preferences.allow_analytics_tracking !== undefined ? preferences.allow_analytics_tracking : false,
        allow_third_party_sharing: preferences.allow_third_party_sharing !== undefined ? preferences.allow_third_party_sharing : false,
        data_retention_preference: preferences.data_retention_preference || 'standard',
        communication_preferences: preferences.communication_preferences || {},
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, message: 'Privacy preferences updated' }
  } catch (error) {
    console.error('Error updating privacy preferences:', error)
    return { success: false, message: error.message }
  }
}

export async function getPrivacyPreferences(authUserId) {
  try {
    const { data, error } = await simDb
      .from('privacy_preferences')
      .select('*')
      .eq('user_id', authUserId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error fetching privacy preferences:', error)
    return { success: false, message: error.message }
  }
}

export async function createDataBreachRecord(breachData) {
  try {
    const [createdBy, accountId] = await Promise.all([getCurrentUserInternalUserId(), getCurrentUserAccountId()])
    if (!createdBy) throw new Error('User not authenticated')

    const breachNumber = `BR-SIM-${Date.now()}`

    const { data, error } = await simDb
      .from('data_breach_records')
      .insert({
        account_id: accountId,
        breach_number: breachNumber,
        breach_type: breachData.breach_type,
        severity: breachData.severity || 'medium',
        affected_users_count: breachData.affected_users?.length || 0,
        affected_users: breachData.affected_users || [],
        data_types_affected: breachData.data_types_affected || [],
        breach_detected_at: new Date().toISOString(),
        status: 'detected',
        created_by: createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, message: 'Data breach record created' }
  } catch (error) {
    console.error('Error creating data breach record:', error)
    return { success: false, message: error.message }
  }
}

export async function updateDataBreachRecord(breachId, updates) {
  try {
    const updatedBy = await getCurrentUserInternalUserId()
    if (!updatedBy) throw new Error('User not authenticated')

    const patch = { updated_at: new Date().toISOString(), updated_by: updatedBy }
    if (updates.status !== undefined) patch.status = updates.status
    if (updates.mitigation_steps !== undefined) patch.mitigation_steps = updates.mitigation_steps
    if (updates.breach_reported_at !== undefined) patch.breach_reported_at = updates.breach_reported_at
    if (updates.authority_notified_at !== undefined) patch.authority_notified_at = updates.authority_notified_at
    if (updates.users_notified_at !== undefined) patch.users_notified_at = updates.users_notified_at

    const { data, error } = await simDb.from('data_breach_records').update(patch).eq('id', breachId).select().single()
    if (error) throw error
    return { success: true, data, message: 'Data breach record updated' }
  } catch (error) {
    console.error('Error updating data breach record:', error)
    return { success: false, message: error.message }
  }
}

export async function getGdprDashboardData() {
  try {
    const [exports, deletions, consents, breaches, exportsCount, deletionsCount, consentsCount, breachesCount] =
      await Promise.all([
        simDb.from('data_export_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(20),
        simDb.from('data_deletion_requests').select('*').eq('is_deleted', false).in('request_status', ['pending', 'processing']).order('requested_at', { ascending: false }).limit(20),
        simDb.from('consent_logs').select('*').order('created_at', { ascending: false }).limit(20),
        simDb.from('data_breach_records').select('*').eq('is_deleted', false).neq('status', 'closed').order('breach_detected_at', { ascending: false }).limit(20),
        simDb.from('consent_logs').select('id', { count: 'exact', head: true }),
        simDb.from('data_export_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        simDb.from('data_deletion_requests').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('request_status', ['pending', 'processing']),
        simDb.from('data_breach_records').select('id', { count: 'exact', head: true }).eq('is_deleted', false).neq('status', 'closed'),
      ])

    return {
      success: true,
      data: {
        exportRequests: exports.data || [],
        deletionRequests: deletions.data || [],
        consentLogs: consents.data || [],
        breachRecords: breaches.data || [],
        stats: {
          totalConsents: consentsCount.count || 0,
          pendingExports: exportsCount.count || 0,
          pendingDeletions: deletionsCount.count || 0,
          activeBreaches: breachesCount.count || 0,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching GDPR dashboard data:', error)
    return { success: false, message: error.message, data: null }
  }
}

function convertToCSV(data) {
  return JSON.stringify(data)
}
