/**
 * Restore invitation_message_templates for all accounts (idempotent).
 * Does not touch sent invitations. Run: node scripts/restore-invitation-message-templates.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  DEFAULT_INVITATION_MESSAGES_BY_ROLE,
  INVITATION_TEMPLATE_ROLE_NAMES,
} from '../src/features/invitation-templates/constants/defaultInvitationMessages.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false },
})

const { count: before } = await db
  .from('invitation_message_templates')
  .select('*', { count: 'exact', head: true })

const { data: accounts, error: accErr } = await db
  .from('accounts')
  .select('id')
  .eq('is_deleted', false)
if (accErr) throw accErr

let inserted = 0
for (const { id: accountId } of accounts || []) {
  const { data: existing } = await db
    .from('invitation_message_templates')
    .select('role_name')
    .eq('account_id', accountId)
  const have = new Set((existing || []).map((r) => r.role_name))
  const rows = []
  for (const role_name of INVITATION_TEMPLATE_ROLE_NAMES) {
    if (have.has(role_name)) continue
    const seed = DEFAULT_INVITATION_MESSAGES_BY_ROLE[role_name]
    if (!seed) continue
    rows.push({
      account_id: accountId,
      role_name,
      template_label: seed.template_label,
      subject_line: seed.subject_line || null,
      message_body: seed.message_body,
      is_active: true,
    })
  }
  if (rows.length === 0) continue
  const { error } = await db.from('invitation_message_templates').insert(rows)
  if (error) throw error
  inserted += rows.length
}

const { count: after } = await db
  .from('invitation_message_templates')
  .select('*', { count: 'exact', head: true })

console.log(`invitation_message_templates: ${before ?? 0} → ${after ?? 0} (inserted ${inserted} missing role rows)`)
console.log('Done. Hard-refresh Send Role Invitations / invite forms.')
