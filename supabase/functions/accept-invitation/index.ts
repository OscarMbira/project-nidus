/**
 * accept-invitation Edge Function
 *
 * Handles new-user invitation acceptance entirely server-side so the browser
 * never calls GoTrue directly (avoids AuthRetryableFetchError).
 *
 * Uses direct fetch() to Supabase REST + GoTrue admin endpoints (same pattern
 * as the send-email function).  No Supabase JS client — avoids session
 * interference inside Edge Functions.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function fail(error: string, status = 400, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify({ success: false, error, ...extra }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function restGet(base: string, key: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function restPost(base: string, key: string, path: string, payload: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function restPatch(base: string, key: string, path: string, payload: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url  = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  const key  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!url || !key) {
    console.error('[accept-invitation] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return fail('Server configuration error — missing env vars', 500);
  }

  const rest = `${url}/rest/v1`;
  const auth = `${url}/auth/v1`;

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { return fail('Invalid JSON body'); }

  const { invitation_token, password, email } = body;
  if (!invitation_token || !password || !email) {
    return fail('invitation_token, password, and email are required');
  }

  try {
    // ── 1. Validate token using SECURITY DEFINER RPC ─────────────────────────
    // validate_invitation_token is SECURITY DEFINER so it always bypasses RLS.
    // This is the same RPC the browser uses — guaranteed to find the invitation
    // if it exists, regardless of any RLS or column-name surprises.
    const validRes = await restPost(rest, key, '/rpc/validate_invitation_token', {
      p_token: invitation_token,
    });

    console.log('[accept-invitation] validate_invitation_token status:', validRes.status, JSON.stringify(validRes.body));

    if (!validRes.ok) {
      return fail(`Token validation failed (${validRes.status}): ${validRes.body?.message ?? ''}`, 400);
    }

    // The RPC returns an array (RETURNS TABLE); first row is the invitation.
    const rows = Array.isArray(validRes.body) ? validRes.body : [];
    if (rows.length === 0) {
      return fail('Invitation not found. The link may have expired or already been used.', 404);
    }

    const inv = rows[0];
    if (!inv.is_valid) {
      return fail('This invitation has expired or has already been accepted.', 410);
    }
    if (inv.invited_email?.toLowerCase() !== email.toLowerCase()) {
      return fail('Email address does not match this invitation.', 403);
    }

    // ── 2. Create auth user via GoTrue admin REST API ─────────────────────────
    let authUserId = '';

    const createRes = await fetch(`${auth}/admin/users`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const createBody = await createRes.json().catch(() => ({}));

    console.log('[accept-invitation] createUser status:', createRes.status, JSON.stringify(createBody));

    if (createRes.ok && createBody?.id) {
      authUserId = createBody.id;
    } else {
      const errMsg = (createBody?.msg || createBody?.message || createBody?.error || '').toLowerCase();
      const alreadyExists =
        createRes.status === 422 ||
        errMsg.includes('already registered') ||
        errMsg.includes('already been registered') ||
        errMsg.includes('user already exists');

      if (alreadyExists) {
        // Fast path: look up from public.users by email
        const luRes = await restGet(rest, key, `/users?email=eq.${encodeURIComponent(email)}&select=auth_user_id&limit=1`);
        if (luRes.ok && Array.isArray(luRes.body) && luRes.body[0]?.auth_user_id) {
          authUserId = luRes.body[0].auth_user_id;
        } else {
          // Slow path: scan GoTrue admin user list
          const listRes = await restGet(auth, key, `/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=10`);
          const found = (listRes.body?.users ?? []).find(
            (u: { email: string; id: string }) => u.email?.toLowerCase() === email.toLowerCase(),
          );
          if (found?.id) {
            authUserId = found.id;
          } else {
            return fail('Account already exists but could not be located. Please sign in.', 409);
          }
        }
      } else {
        return fail(`Account creation failed (${createRes.status}): ${errMsg || 'unknown'}`, 500);
      }
    }

    console.log('[accept-invitation] auth user id:', authUserId);

    // ── 3. Ensure public.users row (idempotent) ───────────────────────────────
    // Priority 1: find by auth_user_id (the normal path for new users)
    const checkByAuthRes = await restGet(rest, key, `/users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id&limit=1`);
    let existingId: string | null =
      checkByAuthRes.ok && Array.isArray(checkByAuthRes.body) ? (checkByAuthRes.body[0]?.id ?? null) : null;

    if (!existingId) {
      // Priority 2: find by email — handles the case where a users row was created
      // without an auth_user_id (e.g. admin-created, legacy import, or prior partial signup).
      const checkByEmailRes = await restGet(rest, key, `/users?email=eq.${encodeURIComponent(email)}&select=id,auth_user_id&limit=1`);
      const emailRow = checkByEmailRes.ok && Array.isArray(checkByEmailRes.body) ? checkByEmailRes.body[0] : null;

      if (emailRow?.id) {
        existingId = emailRow.id;
        // Backfill auth_user_id so future lookups work correctly
        if (!emailRow.auth_user_id || emailRow.auth_user_id !== authUserId) {
          const patchRes = await restPatch(rest, key, `/users?id=eq.${encodeURIComponent(existingId)}`, {
            auth_user_id: authUserId,
            is_active: true,
            is_verified: true,
          });
          console.log('[accept-invitation] backfill auth_user_id status:', patchRes.status);
        }
      }
    }

    if (!existingId) {
      // Truly new — insert
      const insRes = await restPost(rest, key, '/users', {
        auth_user_id: authUserId,
        email,
        full_name: email.split('@')[0],
        is_active: true,
        is_verified: true,
      });
      console.log('[accept-invitation] users insert status:', insRes.status, JSON.stringify(insRes.body));
      if (!insRes.ok) {
        return fail(`Failed to create user record (${insRes.status}): ${insRes.body?.message ?? ''}`, 500);
      }
    }

    // Re-fetch canonical users.id (covers all three paths above)
    const uRes = await restGet(rest, key, `/users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id&limit=1`);
    const userId: string | null =
      uRes.ok && Array.isArray(uRes.body) ? (uRes.body[0]?.id ?? null) : null;

    if (!userId) return fail('Could not retrieve user record after insert', 500);
    console.log('[accept-invitation] public.users id:', userId);

    // ── 4. Accept the invitation ──────────────────────────────────────────────
    const acceptRes = await restPost(rest, key, '/rpc/accept_project_invitation', {
      p_token: invitation_token,
      p_accepting_user_id: userId,
    });

    console.log('[accept-invitation] accept_project_invitation status:', acceptRes.status, JSON.stringify(acceptRes.body));

    if (!acceptRes.ok) {
      const msg = (acceptRes.body?.message || acceptRes.body?.hint || '').toString();
      if (msg.toLowerCase().includes('seat')) {
        return fail('No available seats in this project', 409, { code: 'SEAT_LIMIT_EXCEEDED' });
      }
      return fail(`Could not accept invitation: ${msg || acceptRes.status}`, 500);
    }

    // RPC returns BOOLEAN: false means token invalid/expired/already used
    if (acceptRes.body === false) {
      return fail('The invitation could not be accepted — it may have already been used or has expired.', 410);
    }

    // ── 5. Sign in server-side → return tokens ───────────────────────────────
    // Browser will call supabase.auth.setSession() with these tokens.
    // setSession() is LOCAL when the token is fresh (no GoTrue network call).
    const signInRes = await fetch(`${auth}/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const signInBody = await signInRes.json().catch(() => ({}));

    console.log('[accept-invitation] server-side sign-in status:', signInRes.status);

    if (!signInRes.ok || !signInBody?.access_token) {
      // Membership is created — just can't establish session. Redirect to login.
      return ok({ success: true, session: null, project_id: inv.project_id });
    }

    return ok({
      success: true,
      session: { access_token: signInBody.access_token, refresh_token: signInBody.refresh_token },
      project_id: inv.project_id,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[accept-invitation] unhandled error:', msg);
    return fail(msg, 500);
  }
});
