/**
 * PostgREST helpers for project invitation RPC (`insert_project_invitation_as_pmo_admin`).
 */

/**
 * Build RPC args so `JSON.stringify` never drops keys (`undefined` values are omitted by JSON,
 * which can prevent PostgREST from matching the DB function overload).
 *
 * @param {string} projectId
 * @param {string} invitationRoleId
 * @param {{ email?: string, message?: string|null }} invitationData
 * @param {string} invitationExpiresAtIso ISO 8601 timestamptz string
 */
export function buildInvitationRpcPayload(
  projectId,
  invitationRoleId,
  invitationData,
  invitationExpiresAtIso,
) {
  const rawMsg = invitationData?.message
  const trimmedMsg =
    rawMsg != null && String(rawMsg).trim() !== '' ? String(rawMsg) : null
  return {
    p_project_id: String(projectId),
    p_invited_email: String(invitationData?.email ?? '').trim(),
    p_role_id: String(invitationRoleId),
    p_invitation_message: trimmedMsg,
    p_invitation_expires_at: invitationExpiresAtIso,
  }
}

/**
 * DEV diagnostics: fetch PostgREST OpenAPI (`GET /rest/v1/`) and see if an RPC path is listed.
 * If Postgres has the function + grants but `rpcListed` is false, PostgREST schema cache/API is stale
 * or the app `baseUrl` points at a different project than SQL Editor.
 *
 * @param {string} baseUrl
 * @param {string} anonKey
 * @param {string} rpcFunctionName function name only (no schema)
 * @param {string|null|undefined} userAccessToken optional JWT for Authorization retry after 401
 */
export async function probePostgrestRpcListedInOpenApi(
  baseUrl,
  anonKey,
  rpcFunctionName,
  userAccessToken,
) {
  const base = String(baseUrl || '').replace(/\/$/, '')
  if (!base || !anonKey || !rpcFunctionName) {
    return {
      ok: false,
      reason: 'missing_args',
      openApiStatus: null,
      rpcListed: false,
      rpcPaths: [],
      pathCount: 0,
    }
  }

  const needle = `/rpc/${rpcFunctionName}`

  async function fetchSpec(authBearer) {
    const url = `${base}/rest/v1/`
    return fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/openapi+json, application/json',
        apikey: anonKey,
        Authorization: `Bearer ${authBearer}`,
      },
    })
  }

  try {
    let res = await fetchSpec(anonKey)
    let status = res.status
    let text = await res.text()

    if (status === 401 && userAccessToken) {
      res = await fetchSpec(userAccessToken)
      status = res.status
      text = await res.text()
    }

    let paths = {}
    try {
      const spec = JSON.parse(text)
      paths = spec.paths && typeof spec.paths === 'object' ? spec.paths : {}
    } catch {
      return {
        ok: false,
        reason: 'openapi_parse_error',
        openApiStatus: status,
        rpcListed: false,
        rpcPaths: [],
        pathCount: 0,
        bodySnippet: text.slice(0, 240),
      }
    }

    const pathKeys = Object.keys(paths)
    const rpcPaths = pathKeys.filter(
      (p) => p.startsWith('/rpc/') && p.includes(rpcFunctionName),
    )
    const rpcListed = pathKeys.some((p) => p === needle)

    return {
      ok: status >= 200 && status < 300,
      reason: status >= 200 && status < 300 ? null : `http_${status}`,
      openApiStatus: status,
      rpcListed,
      rpcPaths,
      pathCount: pathKeys.length,
    }
  } catch (e) {
    return {
      ok: false,
      reason: e?.message || 'fetch_error',
      openApiStatus: null,
      rpcListed: false,
      rpcPaths: [],
      pathCount: 0,
    }
  }
}

/**
 * PostgREST “RPC missing” varies by version (PGRST202, HTTP 404 with empty/minimal JSON body, etc.).
 * Always pass `httpStatus` from the RPC response (`const res = await db.rpc(...); res.status`) —
 * `rpcError` alone often omits status.
 *
 * @param {object|null|undefined} rpcError
 * @param {number|string|undefined|null} httpStatus
 */
export function isInvitationRpcMissingOrUnreachable(rpcError, httpStatus) {
  const n =
    typeof httpStatus === 'number' && !Number.isNaN(httpStatus)
      ? httpStatus
      : typeof httpStatus === 'string'
        ? Number(httpStatus)
        : NaN
  if (n === 404) return true
  if (!rpcError) return false
  const errStatus = rpcError.status ?? rpcError.statusCode
  const statusNum = typeof errStatus === 'string' ? Number(errStatus) : errStatus
  const http404 = statusNum === 404 || rpcError.code === '404'
  const blob = [rpcError.code, rpcError.message, rpcError.details, rpcError.hint, errStatus]
    .filter((x) => x !== undefined && x !== null && x !== '')
    .join(' ')
  return (
    http404 ||
    rpcError.code === 'PGRST202' ||
    rpcError.code === '42883' ||
    /could not find the function|does not exist|no matches were found|schema cache|requested route/i.test(
      blob,
    ) ||
    /\b404\b/.test(blob)
  )
}

/** Helps ops verify migrations ran on the same Supabase project as this build. */
export function invitationRpcSetupSuffix() {
  let out = ''
  try {
    const base =
      typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined
    if (base && typeof base === 'string') {
      const host = new URL(base.trim()).hostname
      out += ` Verify Supabase Dashboard → Settings → API → Project URL hostname matches "${host}".`
    }
  } catch {
    /* ignore */
  }
  out +=
    ' Or from this repo: `supabase link` then `supabase db push` (migration `20260510120000_pmo_invitation_rpc_v553.sql`).'
  out +=
    " If `select proname from pg_proc where proname = 'insert_project_invitation_as_pmo_admin'` returns a row but REST still returns 404, run in SQL Editor: `NOTIFY pgrst, 'reload schema';` wait ~30s and retry (PostgREST schema cache)."
  out +=
    ' If v555 shows EXECUTE for `authenticated` but REST stays 404: confirm this hostname matches the SQL Editor project, check `overload_count` in v555 is 1, then pause/resume the Supabase project (restarts PostgREST).'
  out +=
    ' Stuck? Run `SQL/v555_diag_invitation_rpc.sql` in SQL Editor and compare output to this repo.'
  return out
}
