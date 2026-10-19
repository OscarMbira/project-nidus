/**
 * v1272 — caller identity for AI edge functions (PRD story 1, D2).
 *
 * Every AI function calls requireUser(): it verifies the Bearer JWT with Supabase Auth and returns
 *   - userDb(schema):  a client that acts AS the signed-in user (RLS applies — rule 42)
 *   - adminDb(schema): a service-role client, used only for audit rows, the credit ledger and
 *                      reading global settings (never for answering questions)
 * Requests without a valid session get 401.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './http.ts'

export type AiApp = 'platform' | 'simulator' | 'planner'
export type DbSchema = 'public' | 'sim'

export function schemaForApp(app: AiApp): DbSchema {
  return app === 'simulator' ? 'sim' : 'public'
}

export function normaliseApp(value: unknown): AiApp {
  return value === 'simulator' || value === 'planner' ? value : 'platform'
}

export interface UserContext {
  userId: string
  email: string | null
  token: string
  userDb: (schema?: DbSchema) => SupabaseClient
  adminDb: (schema?: DbSchema) => SupabaseClient
}

const url = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export async function requireUser(req: Request): Promise<UserContext> {
  const header = req.headers.get('authorization') || ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token || token === anonKey) throw new HttpError(401, 'unauthenticated', 'Please sign in to use AI features.')

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data?.user) throw new HttpError(401, 'unauthenticated', 'Your session has expired. Please sign in again.')

  const userClients: Partial<Record<DbSchema, SupabaseClient>> = {}
  const adminClients: Partial<Record<DbSchema, SupabaseClient>> = {}
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    token,
    userDb: (schema: DbSchema = 'public') =>
      (userClients[schema] ??= createClient(url, anonKey, {
        db: { schema },
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })),
    adminDb: (schema: DbSchema = 'public') =>
      (adminClients[schema] ??= createClient(url, serviceKey, {
        db: { schema },
        auth: { persistSession: false, autoRefreshToken: false },
      })),
  }
}

/** Service-role client for cron-triggered jobs (no user). */
export function serviceDb(schema: DbSchema = 'public'): SupabaseClient {
  return createClient(url, serviceKey, { db: { schema }, auth: { persistSession: false, autoRefreshToken: false } })
}

/** For cron jobs: the request must carry x-ai-cron-secret equal to the AI_CRON_SECRET edge secret. */
export function requireCronSecret(req: Request): void {
  const expected = Deno.env.get('AI_CRON_SECRET') || ''
  if (!expected || req.headers.get('x-ai-cron-secret') !== expected) {
    throw new HttpError(401, 'unauthenticated', 'Not allowed')
  }
}
