/**
 * Fill missing task-owner role labels from invitation records.
 * Membership roles stay first. Invitations only fill blanks.
 * Preference: this project's invitation, then an organisation invitation,
 * then any other project invitation. Accepted beats pending.
 */

const USABLE_STATUS = new Set(['accepted', 'pending', ''])

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function invitationRoleLabel(row) {
  const role = row?.role || row?.roles
  const fromJoin = role?.role_display_name || role?.role_name || ''
  return String(fromJoin || row?.role_name || '').trim()
}

export function userMatchesInvitation(user, row) {
  if (!user || !row) return false
  if (row.invited_user_id && row.invited_user_id === user.id) return true
  if (row.accepted_by_user_id && row.accepted_by_user_id === user.id) return true
  const email = String(user.email || '').trim().toLowerCase()
  const invited = String(row.invited_email || '').trim().toLowerCase()
  return Boolean(email && invited && email === invited)
}

function statusRank(status) {
  if (status === 'accepted') return 0
  if (!status || status === 'pending') return 1
  return 9
}

/**
 * @param {{ id: string, email?: string }} user
 * @param {Array} invitations rows tagged with _scopeRank (0 = this project, 1 = organisation, 2 = other project)
 */
export function bestInvitationRole(user, invitations) {
  const matches = (invitations || []).filter((row) => {
    if (!userMatchesInvitation(user, row)) return false
    const status = row.invitation_status || ''
    if (status && !USABLE_STATUS.has(status)) return false
    return Boolean(invitationRoleLabel(row))
  })
  matches.sort((a, b) => {
    const byScope = (a._scopeRank ?? 9) - (b._scopeRank ?? 9)
    if (byScope !== 0) return byScope
    const byStatus = statusRank(a.invitation_status) - statusRank(b.invitation_status)
    if (byStatus !== 0) return byStatus
    return String(b.invitation_sent_at || b.created_at || '').localeCompare(
      String(a.invitation_sent_at || a.created_at || ''),
    )
  })
  return matches.length ? invitationRoleLabel(matches[0]) : ''
}

const PROJECT_INVITE_SELECT = `
  project_id,
  invited_user_id,
  accepted_by_user_id,
  invited_email,
  invitation_status,
  invitation_sent_at,
  role:roles ( role_display_name, role_name )
`

const ORG_INVITE_SELECT = `
  invited_user_id,
  accepted_by_user_id,
  invited_email,
  invitation_status,
  invitation_sent_at,
  role_name,
  role:roles ( role_display_name, role_name )
`

async function selectInvitations(db, table, select, filters) {
  let query = db.from(table).select(select).eq('is_deleted', false)
  for (const [key, value] of Object.entries(filters.eq || {})) {
    query = query.eq(key, value)
  }
  if (filters.in) {
    query = query.in(filters.in.column, filters.in.values)
  }
  const result = await query
  if (result.error) return []
  return result.data || []
}

async function invitationsForPeople(db, table, select, { ids, emails }) {
  const rows = []
  for (const idsChunk of chunk(ids, 60)) {
    if (!idsChunk.length) continue
    rows.push(...await selectInvitations(db, table, select, { in: { column: 'invited_user_id', values: idsChunk } }))
    rows.push(...await selectInvitations(db, table, select, { in: { column: 'accepted_by_user_id', values: idsChunk } }))
  }
  for (const emailChunk of chunk(emails, 60)) {
    if (!emailChunk.length) continue
    rows.push(...await selectInvitations(db, table, select, { in: { column: 'invited_email', values: emailChunk } }))
  }
  return rows
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ projectId?: string|null, users: Array<{id: string, email?: string}>, roleByUserId: Map<string, string> }} args
 * @returns {Promise<Map<string, string>>}
 */
export async function fillOwnerRolesFromInvitations(db, { projectId, users, roleByUserId }) {
  const roles = new Map(roleByUserId || [])
  const people = users || []
  if (!people.length) return roles

  const collected = []

  if (projectId) {
    const projectRows = await selectInvitations(db, 'project_invitations', PROJECT_INVITE_SELECT, {
      eq: { project_id: projectId },
    })
    for (const row of projectRows) collected.push({ ...row, _scopeRank: 0 })
  }

  const stillMissing = () => people.filter((user) => user?.id && !roles.get(user.id))

  const apply = (rows) => {
    for (const user of stillMissing()) {
      const label = bestInvitationRole(user, rows)
      if (label) roles.set(user.id, label)
    }
  }

  apply(collected)

  const missingAfterProject = stillMissing()
  if (missingAfterProject.length) {
    const ids = missingAfterProject.map((user) => user.id)
    const emails = [...new Set(missingAfterProject.map((user) => String(user.email || '').trim()).filter(Boolean))]
    const orgRows = await invitationsForPeople(db, 'organisation_invitations', ORG_INVITE_SELECT, { ids, emails })
    const otherRows = await invitationsForPeople(db, 'project_invitations', PROJECT_INVITE_SELECT, { ids, emails })
    apply([
      ...orgRows.map((row) => ({ ...row, _scopeRank: 1 })),
      ...otherRows.map((row) => ({ ...row, _scopeRank: row.project_id && row.project_id === projectId ? 0 : 2 })),
    ])
  }

  return roles
}
