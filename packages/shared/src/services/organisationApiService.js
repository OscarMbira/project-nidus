/**
 * v1356 — Organisation Integrations & Security (API keys, webhooks, SCIM, SSO).
 */
import { platformDb } from '@nidus/supabase'

const functionsUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL || ''
  return `${base.replace(/\/$/, '')}/functions/v1/api-gateway`
}

async function authHeader() {
  const { data } = await platformDb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in to manage integrations.')
  return { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
}

export async function listServiceAccounts() {
  const { data, error } = await platformDb
    .from('users')
    .select('id, email, full_name, is_active, created_at')
    .eq('is_service_account', true)
    .eq('is_deleted', false)
    .order('full_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createServiceAccount(accountId, name) {
  const headers = await authHeader()
  const res = await fetch(`${functionsUrl()}/org/service-accounts`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, name }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail || body.title || 'Could not create the service account.')
  return body
}

export async function listApiCredentials(accountId) {
  const { data, error } = await platformDb
    .from('api_credentials')
    .select('id, credential_reference, name, key_prefix, scopes, expires_at, revoked_at, last_used_at, service_account_user_id, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createApiCredential({ accountId, name, serviceAccountUserId, scopes, expiresAt }) {
  const headers = await authHeader()
  const mint = await fetch(`${functionsUrl()}/org/mint-key-material`, { method: 'POST', headers })
  const material = await mint.json()
  if (!mint.ok) throw new Error(material.detail || 'Could not mint a key.')

  const { data, error } = await platformDb.rpc('create_api_credential', {
    p_account_id: accountId,
    p_name: name,
    p_service_account_user_id: serviceAccountUserId,
    p_scopes: scopes,
    p_expires_at: expiresAt || null,
    p_plain_key: material.plain,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { ...row, plain_key: row?.plain_key || material.plain }
}

export async function revokeApiCredential(id) {
  const { error } = await platformDb.rpc('revoke_api_credential', { p_credential_id: id })
  if (error) throw error
}

export async function rotateApiCredential(id) {
  const headers = await authHeader()
  const mint = await fetch(`${functionsUrl()}/org/mint-key-material`, { method: 'POST', headers })
  const material = await mint.json()
  if (!mint.ok) throw new Error(material.detail || 'Could not mint a key.')
  const { data, error } = await platformDb.rpc('rotate_api_credential', {
    p_credential_id: id,
    p_plain_key: material.plain,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { ...row, plain_key: row?.plain_key || material.plain }
}

export async function listRequestUsage(accountId, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await platformDb
    .from('api_request_log')
    .select('id, method, path, status_code, duration_ms, created_at')
    .eq('account_id', accountId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

export async function listWebhookEndpoints(accountId) {
  const { data, error } = await platformDb
    .from('webhook_endpoints')
    .select('id, endpoint_reference, name, target_url, events, status, failure_count, last_success_at, last_failure_at, created_at')
    .eq('account_id', accountId)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveWebhookEndpoint(row) {
  const payload = {
    account_id: row.account_id,
    name: row.name,
    target_url: row.target_url,
    events: row.events || [],
    secret_hash: row.secret_hash,
    secret_encrypted: row.secret_encrypted,
    status: row.status || 'active',
  }
  if (row.id) {
    const { data, error } = await platformDb.from('webhook_endpoints').update(payload).eq('id', row.id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('webhook_endpoints').insert({ ...payload, endpoint_reference: '' }).select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function listWebhookDeliveries(endpointId) {
  const { data, error } = await platformDb
    .from('webhook_deliveries')
    .select('id, event_type, attempt_number, status, response_status, created_at, delivered_at')
    .eq('endpoint_id', endpointId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function loadScimSettings(accountId) {
  const { data, error } = await platformDb.from('scim_settings').select('*').eq('account_id', accountId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveScimSettings(accountId, patch) {
  const { data, error } = await platformDb
    .from('scim_settings')
    .upsert({ account_id: accountId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'account_id' })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function mintScimToken() {
  const headers = await authHeader()
  const res = await fetch(`${functionsUrl()}/org/mint-scim-token`, { method: 'POST', headers })
  const body = await res.json()
  if (!res.ok) throw new Error(body.detail || 'Could not mint a SCIM token.')
  return body
}

export async function listScimMappings(accountId) {
  const { data, error } = await platformDb
    .from('scim_group_mappings')
    .select('*')
    .eq('account_id', accountId)
    .order('idp_group_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveScimMapping(row) {
  if (row.id) {
    const { data, error } = await platformDb.from('scim_group_mappings').update(row).eq('id', row.id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('scim_group_mappings').insert(row).select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function listSsoConnections(accountId) {
  const { data, error } = await platformDb
    .from('sso_connections')
    .select('*')
    .eq('account_id', accountId)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveSsoConnection(row) {
  const payload = { ...row, connection_reference: row.connection_reference || '' }
  if (row.id) {
    const { data, error } = await platformDb.from('sso_connections').update(payload).eq('id', row.id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('sso_connections').insert(payload).select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function fetchOpenApi() {
  const res = await fetch(`${functionsUrl()}/v1/openapi.json`)
  if (!res.ok) throw new Error('Could not load the API reference.')
  return res.json()
}

/** Resolve SSO connection for an email domain (anon-safe RPC). */
export async function resolveSsoLoginDomain(email) {
  const { data, error } = await platformDb.rpc('sso_resolve_login_domain', { p_email: email })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row || null
}

/** Whether password login is allowed for this email (and optional user id). */
export async function ssoPasswordAllowed(email, userId = null) {
  const { data, error } = await platformDb.rpc('sso_password_allowed', {
    p_email: email,
    p_user_id: userId,
  })
  if (error) throw error
  return data === true
}

/**
 * Start IdP login for a resolved SSO connection.
 * Uses Supabase Auth SSO when provider_id is set; otherwise returns guidance.
 */
export async function initiateOrgSsoLogin(connection, options = {}) {
  if (!connection?.provider_id) {
    return {
      success: false,
      message: 'This SSO connection has no provider id yet. Add the IdP provider id on the SSO settings page.',
    }
  }
  const redirectTo = options.redirectTo || `${window.location.origin}/auth/callback`
  const { data, error } = await platformDb.auth.signInWithSSO({
    providerId: connection.provider_id,
    options: { redirectTo },
  })
  if (error) return { success: false, message: error.message }
  if (data?.url) {
    window.location.href = data.url
    return { success: true }
  }
  return { success: false, message: 'The identity provider did not return a login URL.' }
}

export const API_SCOPE_OPTIONS = [
  'projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'milestones:read', 'milestones:write',
  'risks:read', 'risks:write', 'issues:read', 'issues:write', 'changes:read', 'changes:write',
  'decisions:read', 'decisions:write', 'actions:read', 'stakeholders:read', 'stakeholders:write',
  'timesheets:read', 'timesheets:write', 'documents:read', 'documents:write', 'registers:read', 'registers:write',
  'users:read', 'portfolios:read', 'programmes:read', 'budgets:read', 'evm:read',
]

export const WEBHOOK_EVENT_OPTIONS = [
  'project.created', 'project.updated', 'task.created', 'task.updated',
  'risk.created', 'risk.status_changed', 'issue.created', 'issue.status_changed',
  'change.created', 'change.status_changed',
]
