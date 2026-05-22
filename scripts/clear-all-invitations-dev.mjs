/**
 * Dev reset: clear all invitation tables + accepted-invite side effects.
 * Uses VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY from .env
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile('.env')
loadEnvFile('.env.development')

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const platformDb = createClient(url, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false, autoRefreshToken: false },
})

const simDb = createClient(url, serviceKey, {
  db: { schema: 'sim' },
  auth: { persistSession: false, autoRefreshToken: false },
})

async function count(table, db = platformDb, { optional = false } = {}) {
  const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    const msg = error.message || error.code || JSON.stringify(error)
    if (optional || /does not exist|schema cache|relation|permission|not found/i.test(msg)) {
      return null
    }
    throw new Error(`${table}: ${msg}`)
  }
  return n ?? 0
}

/** Delete all rows (PostgREST requires a filter). */
async function deleteAll(table, db = platformDb, { optional = false } = {}) {
  const { error } = await db.from(table).delete().not('id', 'is', null)
  if (error) {
    const msg = error.message || error.code || String(error)
    if (optional || /does not exist|schema cache|relation|permission|not found/i.test(msg)) {
      console.warn(`Skip ${table}: ${msg}`)
      return false
    }
    throw new Error(`delete ${table}: ${msg}`)
  }
  return true
}

async function fetchAcceptedProjectInvites() {
  const { data, error } = await platformDb
    .from('project_invitations')
    .select('id, project_id, role_id, accepted_by_user_id, invited_user_id')
    .eq('invitation_status', 'accepted')
    .eq('is_deleted', false)
  if (error) throw error
  return (data || []).filter((r) => r.project_id)
}

async function fetchAcceptedOrgInvites() {
  const { data, error } = await platformDb
    .from('organisation_invitations')
    .select('id, role_id, accepted_by_user_id, invited_user_id')
    .eq('invitation_status', 'accepted')
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

async function removeProjectInviteMemberships(rows) {
  for (const pi of rows) {
    const userId = pi.accepted_by_user_id || pi.invited_user_id
    if (!userId || !pi.project_id) continue

    const { error: urErr } = await platformDb
      .from('user_roles')
      .delete()
      .eq('project_id', pi.project_id)
      .eq('role_id', pi.role_id)
      .eq('user_id', userId)
    if (urErr) throw new Error(`user_roles: ${urErr.message}`)

    const { error: pmErr } = await platformDb
      .from('project_memberships')
      .delete()
      .eq('project_id', pi.project_id)
      .eq('user_id', userId)
    if (pmErr) throw new Error(`project_memberships: ${pmErr.message}`)
  }
}

async function removeOrgInviteRoles(rows) {
  for (const oi of rows) {
    const userId = oi.accepted_by_user_id || oi.invited_user_id
    if (!userId) continue
    const { error } = await platformDb
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', oi.role_id)
      .is('project_id', null)
    if (error) throw new Error(`org user_roles: ${error.message}`)
  }
}

async function deleteInvitationEmailLogs() {
  const { data, error } = await platformDb
    .from('email_logs')
    .select('id, subject, body_html, body_text')
    .or(
      'subject.ilike.%invited to join%,subject.ilike.%invitation%,body_html.ilike.%/auth/invitation%,body_text.ilike.%/auth/invitation%',
    )
  if (error) throw error
  const ids = (data || [])
    .filter((row) => {
      const subj = (row.subject || '').toLowerCase()
      const html = (row.body_html || '').toLowerCase()
      const text = (row.body_text || '').toLowerCase()
      return (
        subj.includes('invited to join') ||
        subj.includes('invitation') ||
        html.includes('/auth/invitation') ||
        text.includes('/auth/invitation') ||
        html.includes('invitation expires') ||
        text.includes('invitation expires')
      )
    })
    .map((r) => r.id)
  if (ids.length === 0) return 0
  const { error: delErr } = await platformDb.from('email_logs').delete().in('id', ids)
  if (delErr) throw delErr
  return ids.length
}

async function recalcAllSeatAllocations() {
  const { data, error } = await platformDb
    .from('project_seat_allocations')
    .select('project_id')
  if (error) throw error
  const projectIds = [...new Set((data || []).map((r) => r.project_id).filter(Boolean))]
  for (const projectId of projectIds) {
    const { error: rpcErr } = await platformDb.rpc('calculate_project_seat_usage', {
      p_project_id: projectId,
    })
    if (rpcErr) console.warn(`Seat recalc ${projectId}:`, rpcErr.message)
  }
  return projectIds.length
}

async function main() {
  console.log('Invitation cleanup — counts BEFORE:')
  const simEntityCount = await count('entity_invitations', simDb, { optional: true })
  const simBulkCount = await count('bulk_invitations', simDb, { optional: true })
  const before = {
    project_invitations: await count('project_invitations'),
    organisation_invitations: await count('organisation_invitations'),
    bulk_invite_drafts: await count('bulk_invite_drafts'),
    sim_entity_invitations: simEntityCount,
    sim_bulk_invitations: simBulkCount,
  }
  console.log(before)

  const acceptedProject = await fetchAcceptedProjectInvites()
  const acceptedOrg = await fetchAcceptedOrgInvites()
  console.log(
    `Reverting ${acceptedProject.length} accepted project invite(s), ${acceptedOrg.length} accepted org invite(s)...`,
  )

  await removeProjectInviteMemberships(acceptedProject)
  await removeOrgInviteRoles(acceptedOrg)

  const emailDeleted = await deleteInvitationEmailLogs()
  console.log(`Deleted ${emailDeleted} invitation-related email_logs row(s).`)

  await deleteAll('bulk_invite_drafts')
  await deleteAll('organisation_invitations')
  await deleteAll('project_invitations')
  await deleteAll('entity_invitations', simDb, { optional: true })
  await deleteAll('bulk_invitations', simDb, { optional: true })

  const seatsRecalc = await recalcAllSeatAllocations()
  console.log(`Recalculated seat usage for ${seatsRecalc} project(s).`)

  console.log('\nCounts AFTER:')
  console.log({
    project_invitations: await count('project_invitations'),
    organisation_invitations: await count('organisation_invitations'),
    bulk_invite_drafts: await count('bulk_invite_drafts'),
    sim_entity_invitations: await count('entity_invitations', simDb, { optional: true }),
    sim_bulk_invitations: await count('bulk_invitations', simDb, { optional: true }),
  })
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
