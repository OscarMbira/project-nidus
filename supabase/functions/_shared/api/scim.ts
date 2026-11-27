/**
 * v1356 — SCIM 2.0 Users and Groups (D8, D9).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { problemResponse } from './problem.ts'
import { sha256Hex } from './crypto.ts'

type ScimCtx = {
  accountId: string
  welcomeEmail: boolean
  blockManualInvites: boolean
}

const SCIM_CONTENT = 'application/scim+json'

function scimJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': SCIM_CONTENT },
  })
}

function scimError(status: number, detail: string, scimType?: string): Response {
  return scimJson(status, {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    status: String(status),
    detail,
    ...(scimType ? { scimType } : {}),
  })
}

export async function handleScim(
  req: Request,
  url: URL,
  service: SupabaseClient,
  ctx: ScimCtx,
): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const method = req.method.toUpperCase()

  if (path === '/scim/v2/ServiceProviderConfig' && method === 'GET') {
    return scimJson(200, {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [{
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description: 'Organisation SCIM token (nds_scim_…)',
        specUri: 'https://www.rfc-editor.org/rfc/rfc6750',
        primary: true,
      }],
    })
  }

  if (path === '/scim/v2/Schemas' && method === 'GET') {
    return scimJson(200, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        { id: 'urn:ietf:params:scim:schemas:core:2.0:User', name: 'User' },
        { id: 'urn:ietf:params:scim:schemas:core:2.0:Group', name: 'Group' },
      ],
    })
  }

  if (path === '/scim/v2/ResourceTypes' && method === 'GET') {
    return scimJson(200, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'User', name: 'User', endpoint: '/scim/v2/Users', schema: 'urn:ietf:params:scim:schemas:core:2.0:User' },
        { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'Group', name: 'Group', endpoint: '/scim/v2/Groups', schema: 'urn:ietf:params:scim:schemas:core:2.0:Group' },
      ],
    })
  }

  if (path === '/scim/v2/Users' || path.startsWith('/scim/v2/Users/')) {
    return handleUsers(req, url, service, ctx, method, path)
  }
  if (path === '/scim/v2/Groups' || path.startsWith('/scim/v2/Groups/')) {
    return handleGroups(req, url, service, ctx, method, path)
  }

  return scimError(404, 'Not found')
}

async function handleUsers(
  req: Request,
  url: URL,
  service: SupabaseClient,
  ctx: ScimCtx,
  method: string,
  path: string,
): Promise<Response> {
  const id = path === '/scim/v2/Users' ? null : path.slice('/scim/v2/Users/'.length)

  if (method === 'GET' && !id) {
    const filter = url.searchParams.get('filter') || ''
    let email: string | null = null
    const m = filter.match(/userName\s+eq\s+"([^"]+)"/i)
    if (m) email = m[1].toLowerCase()

    let q = service.from('scim_identities').select('id, external_id, user_id, active, users(id, email, full_name, is_active)').eq('account_id', ctx.accountId)
    const { data, error } = await q
    if (error) return scimError(400, error.message)
    let rows = data || []
    if (email) rows = rows.filter((r) => String((r.users as { email?: string } | null)?.email || '').toLowerCase() === email)
    const resources = rows.map(toScimUser)
    return scimJson(200, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: resources.length,
      Resources: resources,
    })
  }

  if (method === 'GET' && id) {
    const { data } = await service
      .from('scim_identities')
      .select('id, external_id, user_id, active, users(id, email, full_name, is_active)')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${id},external_id.eq.${id}`)
      .maybeSingle()
    if (!data) return scimError(404, 'User not found')
    return scimJson(200, toScimUser(data))
  }

  if (method === 'POST' && !id) {
    const body = await req.json().catch(() => null)
    if (!body) return scimError(400, 'JSON required')
    const email = String(body.userName || body.emails?.[0]?.value || '').toLowerCase()
    const name = body.name?.formatted || body.displayName || email
    const externalId = String(body.externalId || email)
    if (!email) return scimError(400, 'userName (email) is required', 'invalidValue')

    const seat = await checkSeats(service, ctx.accountId)
    if (!seat.ok) return scimError(409, seat.detail, 'uniqueness')

    const existing = await service.from('users').select('id, email, full_name, is_active').ilike('email', email).maybeSingle()
    let userId = existing.data?.id as string | undefined
    if (!userId) {
      const { data: created, error } = await service.rpc('scim_provision_user', {
        p_account_id: ctx.accountId,
        p_email: email,
        p_full_name: name,
        p_external_id: externalId,
        p_welcome_email: ctx.welcomeEmail,
      })
      if (error) return scimError(400, error.message)
      userId = created as string
    } else {
      await service.rpc('scim_link_user', {
        p_account_id: ctx.accountId,
        p_user_id: userId,
        p_external_id: externalId,
        p_active: body.active !== false,
      })
    }

    const { data } = await service
      .from('scim_identities')
      .select('id, external_id, user_id, active, users(id, email, full_name, is_active)')
      .eq('account_id', ctx.accountId)
      .eq('user_id', userId!)
      .maybeSingle()
    return scimJson(201, toScimUser(data))
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json().catch(() => null)
    if (!body) return scimError(400, 'JSON required')
    const { data: ident } = await service
      .from('scim_identities')
      .select('id, user_id, active')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${id},external_id.eq.${id}`)
      .maybeSingle()
    if (!ident) return scimError(404, 'User not found')

    let active = ident.active
    if (method === 'PATCH' && Array.isArray(body.Operations)) {
      for (const op of body.Operations) {
        if (String(op.path || '').toLowerCase() === 'active' || op.path === undefined) {
          if (typeof op.value === 'boolean') active = op.value
          else if (op.value?.active !== undefined) active = Boolean(op.value.active)
        }
        if (op.path === 'name.formatted' && typeof op.value === 'string') {
          await service.from('users').update({ full_name: op.value }).eq('id', ident.user_id)
        }
      }
    } else if (method === 'PUT') {
      active = body.active !== false
      const name = body.name?.formatted || body.displayName
      if (name) await service.from('users').update({ full_name: name }).eq('id', ident.user_id)
    }

    await service.rpc('scim_set_active', {
      p_account_id: ctx.accountId,
      p_user_id: ident.user_id,
      p_active: active,
    })

    const { data } = await service
      .from('scim_identities')
      .select('id, external_id, user_id, active, users(id, email, full_name, is_active)')
      .eq('id', ident.id)
      .maybeSingle()
    return scimJson(200, toScimUser(data))
  }

  if (method === 'DELETE' && id) {
    const { data: ident } = await service
      .from('scim_identities')
      .select('user_id')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${id},external_id.eq.${id}`)
      .maybeSingle()
    if (!ident) return scimError(404, 'User not found')
    await service.rpc('scim_set_active', {
      p_account_id: ctx.accountId,
      p_user_id: ident.user_id,
      p_active: false,
    })
    return new Response(null, { status: 204 })
  }

  return scimError(405, 'Method not allowed')
}

async function handleGroups(
  req: Request,
  url: URL,
  service: SupabaseClient,
  ctx: ScimCtx,
  method: string,
  path: string,
): Promise<Response> {
  const id = path === '/scim/v2/Groups' ? null : path.slice('/scim/v2/Groups/'.length)

  if (method === 'GET' && !id) {
    const { data } = await service.from('scim_group_mappings').select('*').eq('account_id', ctx.accountId)
    const resources = (data || []).map(toScimGroup)
    return scimJson(200, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: resources.length,
      Resources: resources,
    })
  }

  if (method === 'GET' && id) {
    const { data } = await service
      .from('scim_group_mappings')
      .select('*')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${id},idp_group_id.eq.${id}`)
      .maybeSingle()
    if (!data) return scimError(404, 'Group not found')
    return scimJson(200, toScimGroup(data))
  }

  if (method === 'POST' && !id) {
    const body = await req.json().catch(() => null)
    if (!body?.displayName) return scimError(400, 'displayName required')
    const { data, error } = await service.from('scim_group_mappings').insert({
      account_id: ctx.accountId,
      idp_group_id: body.externalId || body.displayName,
      idp_group_name: body.displayName,
      role_name: null,
    }).select('*').maybeSingle()
    if (error) return scimError(400, error.message)
    return scimJson(201, toScimGroup(data))
  }

  if (method === 'PATCH' && id) {
    const body = await req.json().catch(() => null)
    const { data: group } = await service
      .from('scim_group_mappings')
      .select('*')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${id},idp_group_id.eq.${id}`)
      .maybeSingle()
    if (!group) return scimError(404, 'Group not found')
    if (Array.isArray(body?.Operations)) {
      for (const op of body.Operations) {
        if (String(op.path || '').toLowerCase() === 'members' && Array.isArray(op.value)) {
          for (const member of op.value) {
            await service.rpc('scim_apply_group_role', {
              p_account_id: ctx.accountId,
              p_group_mapping_id: group.id,
              p_user_external_id: member.value,
              p_add: op.op !== 'remove',
            }).catch(() => {})
          }
        }
      }
    }
    return scimJson(200, toScimGroup(group))
  }

  if (method === 'DELETE' && id) {
    await service.from('scim_group_mappings').delete().eq('account_id', ctx.accountId).or(`id.eq.${id},idp_group_id.eq.${id}`)
    return new Response(null, { status: 204 })
  }

  void url
  void sha256Hex
  return scimError(405, 'Method not allowed')
}

function toScimUser(row: Record<string, unknown> | null): Record<string, unknown> {
  const user = (row?.users || {}) as Record<string, unknown>
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: row?.id,
    externalId: row?.external_id,
    userName: user.email,
    name: { formatted: user.full_name },
    displayName: user.full_name,
    active: row?.active !== false && user.is_active !== false,
    emails: [{ value: user.email, primary: true }],
    meta: { resourceType: 'User' },
  }
}

function toScimGroup(row: Record<string, unknown> | null): Record<string, unknown> {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: row?.id,
    externalId: row?.idp_group_id,
    displayName: row?.idp_group_name,
    meta: { resourceType: 'Group' },
  }
}

async function checkSeats(service: SupabaseClient, accountId: string): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { data } = await service.rpc('scim_seat_available', { p_account_id: accountId })
  if (data === false) {
    return { ok: false, detail: 'Seat limit reached for this organisation. Ask the organisation admin to upgrade the plan.' }
  }
  return { ok: true }
}

// silence unused when problemResponse imported for future
void problemResponse
