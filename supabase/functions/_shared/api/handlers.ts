/**
 * v1356 — resource list/get/write helpers used by the gateway.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { decodeCursor, nextCursorFromRows, parsePagination } from './pagination.ts'
import { etagFromUpdatedAt, ifMatchOk } from './etag.ts'
import { problemResponse } from './problem.ts'
import { sha256Hex } from './crypto.ts'
import { RESOURCES, type TableResource, resourceByPath } from './resources/catalog.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function userDb(token: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  return createClient(url, anon, {
    db: { schema: 'public' },
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function serviceDb(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } })
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function resolveRowId(db: SupabaseClient, resource: TableResource, id: string): Promise<string | null> {
  if (UUID_RE.test(id)) return id
  if (!resource.displayIdColumn) return null
  let q = db.from(resource.table).select('id').eq(resource.displayIdColumn, id).limit(1)
  if (resource.softDelete) q = q.eq('is_deleted', false)
  const { data } = await q.maybeSingle()
  return data?.id || null
}

export async function handleResource(
  req: Request,
  url: URL,
  db: SupabaseClient,
  service: SupabaseClient,
  opts: { accountId: string; credentialId: string; scopes: Set<string> },
): Promise<Response | null> {
  const parts = url.pathname.replace(/^\/+/, '').split('/')
  // paths: v1/<resource>[/<id>]
  if (parts[0] !== 'v1' || !parts[1]) return null
  const resource = resourceByPath(parts[1])
  if (!resource) return null

  const idPart = parts[2] || null
  const method = req.method.toUpperCase()
  const needWrite = method !== 'GET' && method !== 'HEAD'
  const scope = needWrite ? resource.scopeWrite : resource.scopeRead
  if (!scope || !opts.scopes.has(scope)) {
    return problemResponse(403, 'Forbidden', `This key needs the ${scope || 'matching'} scope.`)
  }
  if (needWrite && (resource.readOnly || !resource.write)) {
    return problemResponse(405, 'Method not allowed', `${resource.name} is read-only on the public API.`)
  }

  if (method === 'GET' && !idPart) return listResource(req, url, db, resource)
  if ((method === 'GET' || method === 'HEAD') && idPart) return getResource(req, db, resource, idPart)
  if (method === 'POST' && !idPart) return createResource(req, db, service, resource, opts)
  if (method === 'PATCH' && idPart) return patchResource(req, db, resource, idPart)
  if (method === 'DELETE' && idPart) return deleteResource(db, resource, idPart)
  return problemResponse(405, 'Method not allowed')
}

async function listResource(req: Request, url: URL, db: SupabaseClient, resource: TableResource): Promise<Response> {
  const page = parsePagination(url)
  const cursor = decodeCursor(page.cursor)
  let q = db.from(resource.table).select(resource.select)
  if (resource.softDelete) q = q.eq('is_deleted', false)
  const status = url.searchParams.get('status')
  if (status && resource.select.includes('status')) q = q.eq('status', status)
  const updatedSince = url.searchParams.get('updated_since')
  if (updatedSince && resource.select.includes('updated_at')) q = q.gte('updated_at', updatedSince)
  const projectId = url.searchParams.get('project_id')
  if (projectId && resource.projectColumn) q = q.eq(resource.projectColumn, projectId)
  const registerKey = url.searchParams.get('register_key')
  if (registerKey && resource.name === 'register_records') {
    const { data: reg } = await db.from('local_registers').select('id').eq('register_key', registerKey).maybeSingle()
    if (!reg) return json(200, { data: [], next_cursor: null })
    q = q.eq('register_id', reg.id)
  }
  if (cursor) {
    q = q.or(`updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`)
  }
  if (resource.select.includes('updated_at')) q = q.order('updated_at', { ascending: false })
  q = q.order('id', { ascending: false }).limit(page.limit)

  const { data, error } = await q
  if (error) return problemResponse(400, 'Bad request', error.message)
  const rows = (data || []) as Record<string, unknown>[]
  const mapped = rows.map((r) => resource.mapRow(r))
  const next = nextCursorFromRows(
    rows.map((r) => ({ id: String(r.id || r.action_id), updated_at: String(r.updated_at || '') })),
    page.limit,
  )
  return json(200, { data: mapped, next_cursor: next })
}

async function getResource(req: Request, db: SupabaseClient, resource: TableResource, id: string): Promise<Response> {
  const rowId = resource.idColumn === 'action_id'
    ? (UUID_RE.test(id) ? id : null)
    : await resolveRowId(db, resource, id)
  if (!rowId) return problemResponse(404, 'Not found')
  let q = db.from(resource.table).select(resource.select).eq(resource.idColumn === 'action_id' ? 'action_id' : 'id', rowId)
  if (resource.softDelete) q = q.eq('is_deleted', false)
  const { data, error } = await q.maybeSingle()
  if (error) return problemResponse(400, 'Bad request', error.message)
  if (!data) return problemResponse(404, 'Not found')
  const tag = etagFromUpdatedAt((data as Record<string, unknown>).updated_at as string)
  const inm = req.headers.get('if-none-match')
  if (inm && (inm === tag || inm === tag.replaceAll('"', ''))) {
    return new Response(null, { status: 304, headers: { ETag: tag } })
  }
  return json(200, resource.mapRow(data as Record<string, unknown>), { ETag: tag })
}

async function createResource(
  req: Request,
  db: SupabaseClient,
  service: SupabaseClient,
  resource: TableResource,
  opts: { accountId: string; credentialId: string },
): Promise<Response> {
  const idem = req.headers.get('idempotency-key')
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return problemResponse(400, 'Bad request', 'JSON body required.')
  }
  if (idem) {
    const hash = await sha256Hex(JSON.stringify(body))
    const { data: existing } = await service
      .from('api_idempotency_keys')
      .select('response_status, response_body')
      .eq('account_id', opts.accountId)
      .eq('idempotency_key', idem)
      .maybeSingle()
    if (existing) {
      return json(existing.response_status || 200, existing.response_body)
    }
    // stash hash for insert after success (table may not exist until slice 3)
    ;(req as unknown as { __idem?: { key: string; hash: string } }).__idem = { key: idem, hash }
  }

  const insert = mapWriteBody(resource, body, true)
  const { data, error } = await db.from(resource.table).insert(insert).select(resource.select).maybeSingle()
  if (error) return problemResponse(400, 'Bad request', error.message)
  const mapped = resource.mapRow(data as Record<string, unknown>)
  const idemMeta = (req as unknown as { __idem?: { key: string; hash: string } }).__idem
  if (idemMeta) {
    await service.from('api_idempotency_keys').insert({
      account_id: opts.accountId,
      credential_id: opts.credentialId,
      idempotency_key: idemMeta.key,
      request_hash: idemMeta.hash,
      response_status: 201,
      response_body: mapped,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }).then(() => {}).catch(() => {})
  }
  return json(201, mapped, { ETag: etagFromUpdatedAt((data as Record<string, unknown>).updated_at as string) })
}

async function patchResource(req: Request, db: SupabaseClient, resource: TableResource, id: string): Promise<Response> {
  const rowId = await resolveRowId(db, resource, id)
  if (!rowId) return problemResponse(404, 'Not found')
  const { data: current } = await db.from(resource.table).select('updated_at').eq('id', rowId).maybeSingle()
  if (!current) return problemResponse(404, 'Not found')
  if (!ifMatchOk(req.headers.get('if-match'), current.updated_at)) {
    return problemResponse(412, 'Precondition failed', 'If-Match does not match the current ETag.')
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return problemResponse(400, 'Bad request', 'JSON body required.')
  }
  const patch = mapWriteBody(resource, body, false)
  const { data, error } = await db.from(resource.table).update(patch).eq('id', rowId).select(resource.select).maybeSingle()
  if (error) return problemResponse(400, 'Bad request', error.message)
  return json(200, resource.mapRow(data as Record<string, unknown>), {
    ETag: etagFromUpdatedAt((data as Record<string, unknown>).updated_at as string),
  })
}

async function deleteResource(db: SupabaseClient, resource: TableResource, id: string): Promise<Response> {
  const rowId = await resolveRowId(db, resource, id)
  if (!rowId) return problemResponse(404, 'Not found')
  if (resource.softDelete) {
    const { error } = await db.from(resource.table).update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', rowId)
    if (error) return problemResponse(400, 'Bad request', error.message)
  } else {
    const { error } = await db.from(resource.table).delete().eq('id', rowId)
    if (error) return problemResponse(400, 'Bad request', error.message)
  }
  return new Response(null, { status: 204 })
}

function mapWriteBody(resource: TableResource, body: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const map: Record<string, Record<string, string>> = {
    projects: { name: 'project_name', start_date: 'planned_start_date', end_date: 'planned_end_date', status_id: 'status_id' },
    tasks: { name: 'task_name', start_date: 'planned_start_date', finish_date: 'planned_end_date', status_id: 'status_id', project_id: 'project_id' },
    milestones: { name: 'milestone_name', due_date: 'target_date', status: 'status', project_id: 'project_id' },
    risks: { title: 'risk_title', status: 'status', project_id: 'project_id' },
    issues: { title: 'issue_title', status: 'status', project_id: 'project_id' },
    changes: { title: 'change_title', status: 'status', project_id: 'project_id' },
    decisions: { title: 'decision_title', status: 'status', project_id: 'project_id' },
    stakeholders: { name: 'stakeholder_name', role: 'stakeholder_role', project_id: 'project_id' },
    timesheet_entries: { project_id: 'project_id', user_id: 'user_id', entry_date: 'entry_date', hours_worked: 'hours_worked', status: 'status', is_billable: 'is_billable' },
    documents: { project_id: 'project_id', file_name: 'file_name', document_type_id: 'document_type_id', status: 'status' },
    register_records: { register_id: 'register_id', project_id: 'project_id', field_values: 'field_values', status: 'status' },
  }
  const fields = map[resource.name] || {}
  for (const [from, to] of Object.entries(fields)) {
    if (body[from] !== undefined) out[to] = body[from]
  }
  if (isCreate && resource.name === 'projects' && !out.project_code) out.project_code = ''
  return out
}

export { RESOURCES }
