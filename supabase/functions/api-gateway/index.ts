/**
 * v1356 — Public API + SCIM gateway (D2).
 * Authenticates organisation API keys / SCIM tokens, applies scopes + rate limits,
 * audits every call, and queries as the key’s service account so RLS still applies.
 * Deploy with --no-verify-jwt (key auth replaces the user JWT gate).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { hashMatches, mintApiKey, mintScimToken, randomToken } from '../_shared/api/crypto.ts'
import { expandScopes, hasScope } from '../_shared/api/scopes.ts'
import { dayKey, decideRate, DEFAULT_RATE_LIMITS, minuteKey } from '../_shared/api/rate.ts'
import { problemResponse } from '../_shared/api/problem.ts'
import { mintServiceJwt } from '../_shared/api/jwt.ts'
import { buildOpenApi } from '../_shared/api/openapi.ts'
import { handleResource, serviceDb, userDb, RESOURCES } from '../_shared/api/handlers.ts'
import { handleScim } from '../_shared/api/scim.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, if-match, if-none-match, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD',
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(res.body, { status: res.status, headers })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const started = Date.now()
  const requestId = req.headers.get('x-request-id') || randomToken(8)
  const url = new URL(req.url)
  // Strip function prefix: /functions/v1/api-gateway/...
  let path = url.pathname
  const marker = '/api-gateway'
  const idx = path.indexOf(marker)
  if (idx >= 0) path = path.slice(idx + marker.length) || '/'
  if (!path.startsWith('/')) path = `/${path}`
  url.pathname = path

  const service = serviceDb()
  let accountId: string | null = null
  let credentialId: string | null = null
  let status = 500
  let errorCode: string | null = null

  try {
    // OpenAPI is public (no secrets)
    if (req.method === 'GET' && (path === '/v1/openapi.json' || path === '/openapi.json')) {
      status = 200
      return withCors(new Response(JSON.stringify(buildOpenApi(RESOURCES)), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors },
      }))
    }

    // Org-admin helpers (user JWT): create service account + mint key material for the UI
    if (path.startsWith('/org/')) {
      const res = await handleOrgAdmin(req, path, service)
      status = res.status
      return withCors(res)
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (!token) {
      status = 401
      errorCode = 'unauthenticated'
      return withCors(problemResponse(401, 'Unauthorized', 'Provide a Bearer API key or SCIM token.'))
    }

    if (path.startsWith('/scim/v2')) {
      const scim = await authenticateScim(service, token)
      if (!scim) {
        status = 401
        errorCode = 'unauthenticated'
        return withCors(problemResponse(401, 'Unauthorized', 'Invalid SCIM token.'))
      }
      accountId = scim.accountId
      const limited = await enforceRate(service, accountId, true)
      if (limited) {
        status = 429
        errorCode = 'rate_limited'
        return withCors(limited)
      }
      const res = await handleScim(req, url, service, scim)
      status = res.status
      return withCors(res)
    }

    if (!path.startsWith('/v1/')) {
      status = 404
      return withCors(problemResponse(404, 'Not found'))
    }

    const cred = await authenticateKey(service, token)
    if (!cred) {
      status = 401
      errorCode = 'unauthenticated'
      return withCors(problemResponse(401, 'Unauthorized', 'Invalid or expired API key.'))
    }
    accountId = cred.account_id
    credentialId = cred.credential_id

    const planOk = await planAllowsApi(service, accountId)
    if (!planOk) {
      status = 403
      errorCode = 'plan_disabled'
      return withCors(problemResponse(403, 'Forbidden', 'The public API is not enabled on this organisation’s plan.'))
    }

    const limited = await enforceRate(service, accountId, false)
    if (limited) {
      status = 429
      errorCode = 'rate_limited'
      return withCors(limited)
    }

    if (!cred.auth_user_id) {
      status = 500
      errorCode = 'service_account'
      return withCors(problemResponse(500, 'Misconfigured key', 'The service account has no auth user.'))
    }

    const jwt = await mintServiceJwt({
      authUserId: cred.auth_user_id,
      email: cred.email,
      expiresInSeconds: 300,
    })
    const db = userDb(jwt)
    const scopes = expandScopes(cred.scopes || [])

    if (path === '/v1/ping') {
      status = 200
      return withCors(new Response(JSON.stringify({ ok: true, request_id: requestId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors },
      }))
    }

    if (path === '/v1/me') {
      status = 200
      return withCors(new Response(JSON.stringify({
        account_id: accountId,
        credential_id: credentialId,
        scopes: [...scopes],
        service_account_user_id: cred.service_account_user_id,
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } }))
    }

    const res = await handleResource(req, url, db, service, {
      accountId,
      credentialId: credentialId!,
      scopes,
    })
    if (!res) {
      status = 404
      return withCors(problemResponse(404, 'Not found'))
    }
    status = res.status
    return withCors(res)
  } catch (err) {
    console.error('[api-gateway]', err)
    status = 500
    errorCode = 'internal'
    return withCors(problemResponse(500, 'Internal error', 'Something went wrong.'))
  } finally {
    if (accountId) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || ''
      await service.rpc('log_api_request', {
        p_account_id: accountId,
        p_credential_id: credentialId,
        p_request_id: requestId,
        p_method: req.method,
        p_path: path,
        p_status: status,
        p_duration_ms: Date.now() - started,
        p_ip: ip.slice(0, 64),
        p_user_agent: (req.headers.get('user-agent') || '').slice(0, 200),
        p_error_code: errorCode,
      }).catch((e) => console.error('[api-gateway] audit', e))
    }
  }
})

async function authenticateKey(service: ReturnType<typeof serviceDb>, plain: string) {
  const { data, error } = await service.rpc('lookup_api_credential', { p_plain_key: plain })
  if (error || !data?.length) return null
  const row = data[0]
  return {
    credential_id: row.credential_id as string,
    account_id: row.account_id as string,
    service_account_user_id: row.service_account_user_id as string,
    auth_user_id: row.auth_user_id as string,
    scopes: (row.scopes || []) as string[],
    email: row.email as string | null,
  }
}

async function authenticateScim(service: ReturnType<typeof serviceDb>, plain: string) {
  if (!plain.startsWith('nds_scim_')) return null
  const prefix = plain.slice(0, 16)
  const { data } = await service
    .from('scim_settings')
    .select('account_id, token_hash, token_prefix, enabled, welcome_email, block_manual_invites')
    .eq('token_prefix', prefix)
    .eq('enabled', true)
    .maybeSingle()
  if (!data?.token_hash) return null
  if (!(await hashMatches(plain, data.token_hash))) return null
  return {
    accountId: data.account_id as string,
    welcomeEmail: Boolean(data.welcome_email),
    blockManualInvites: Boolean(data.block_manual_invites),
  }
}

async function planAllowsApi(service: ReturnType<typeof serviceDb>, accountId: string): Promise<boolean> {
  const { data: account } = await service.from('accounts').select('subscription_plan_id, product_edition').eq('id', accountId).maybeSingle()
  if (!account?.subscription_plan_id) return true // allow during setup when plan link is missing
  const { data: plan } = await service
    .from('subscription_plans')
    .select('api_enabled')
    .eq('id', account.subscription_plan_id)
    .maybeSingle()
  if (!plan) return true
  return Boolean(plan.api_enabled)
}

async function enforceRate(service: ReturnType<typeof serviceDb>, accountId: string, scim: boolean): Promise<Response | null> {
  const limits = { ...DEFAULT_RATE_LIMITS }
  const { data: account } = await service.from('accounts').select('subscription_plan_id').eq('id', accountId).maybeSingle()
  if (account?.subscription_plan_id) {
    const { data: plan } = await service
      .from('subscription_plans')
      .select('api_rate_per_minute, api_rate_per_day, scim_rate_per_minute')
      .eq('id', account.subscription_plan_id)
      .maybeSingle()
    if (plan) {
      limits.perMinute = Number(plan.api_rate_per_minute) || limits.perMinute
      limits.perDay = Number(plan.api_rate_per_day) || limits.perDay
      limits.scimPerMinute = Number(plan.scim_rate_per_minute) || limits.scimPerMinute
    }
  }

  if (scim) {
    const count = await service.rpc('bump_api_rate', {
      p_account_id: accountId,
      p_kind: 'scim_minute',
      p_bucket_key: minuteKey(),
      p_limit: limits.scimPerMinute,
    })
    const n = typeof count.data === 'number' ? count.data : 0
    const decision = decideRate({ minuteCount: n, dayCount: 0, minuteLimit: limits.scimPerMinute, dayLimit: Number.MAX_SAFE_INTEGER })
    if (!decision.ok) {
      return problemResponse(429, 'Too many requests', 'SCIM rate limit exceeded.', {}, { 'Retry-After': String(decision.retryAfterSeconds) })
    }
    return null
  }

  const minute = await service.rpc('bump_api_rate', {
    p_account_id: accountId,
    p_kind: 'minute',
    p_bucket_key: minuteKey(),
    p_limit: limits.perMinute,
  })
  const day = await service.rpc('bump_api_rate', {
    p_account_id: accountId,
    p_kind: 'day',
    p_bucket_key: dayKey(),
    p_limit: limits.perDay,
  })
  const decision = decideRate({
    minuteCount: typeof minute.data === 'number' ? minute.data : 0,
    dayCount: typeof day.data === 'number' ? day.data : 0,
    minuteLimit: limits.perMinute,
    dayLimit: limits.perDay,
  })
  if (!decision.ok) {
    return problemResponse(429, 'Too many requests', `Rate limit exceeded (${decision.reason}).`, {}, {
      'Retry-After': String(decision.retryAfterSeconds),
    })
  }
  return null
}

/** Authenticated organisation-admin helpers for the Integrations UI. */
async function handleOrgAdmin(req: Request, path: string, service: ReturnType<typeof serviceDb>): Promise<Response> {
  const header = req.headers.get('authorization') || ''
  const jwt = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!jwt) return problemResponse(401, 'Unauthorized', 'Sign in to manage API keys.')

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) return problemResponse(401, 'Unauthorized')

  if (req.method === 'POST' && path === '/org/service-accounts') {
    const body = await req.json().catch(() => ({}))
    const accountId = body.account_id as string
    const name = (body.name as string) || 'API service account'
    if (!accountId) return problemResponse(400, 'Bad request', 'account_id is required.')

    const email = `svc.${randomToken(6)}@service.nidus.internal`
    const password = randomToken(24)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_service_account: true, full_name: name },
      app_metadata: { provider: 'service_account', disable_login: true },
    })
    if (created.error || !created.data.user) {
      return problemResponse(400, 'Bad request', created.error?.message || 'Could not create service account.')
    }
    const { data: userId, error } = await userClient.rpc('create_service_account_user', {
      p_account_id: accountId,
      p_name: name,
      p_auth_user_id: created.data.user.id,
      p_email: email,
    })
    if (error) return problemResponse(400, 'Bad request', error.message)
    return new Response(JSON.stringify({ id: userId, email, name }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'POST' && path === '/org/mint-key-material') {
    const minted = mintApiKey()
    return new Response(JSON.stringify(minted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'POST' && path === '/org/mint-scim-token') {
    const minted = mintScimToken()
    const hash = await (await import('../_shared/api/crypto.ts')).sha256Hex(minted.plain)
    return new Response(JSON.stringify({ ...minted, hash }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  void hasScope
  return problemResponse(404, 'Not found')
}
