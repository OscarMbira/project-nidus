/**
 * Invitation Service
 * Handles project invitation email sending and management
 *
 * IMPORTANT: Platform specific - uses appDb (public schema)
 * Works with projectMembershipService for invitation workflow
 */

import { appDb } from './supabase/supabaseClient'
import { inviteUserToProject, getProjectInvitations } from './projectMembershipService'
import {
  escapeHtml,
  formatInvitationPersonalMessageHtml,
  formatInvitationPersonalMessagePlain,
  normalizeInvitationMessageOrganisation,
  wrapInvitationMessageCard,
} from '../utils/invitationMessageEmailFormat'
import { buildProjectInvitationUrls } from '../utils/invitationUrlUtils'
import {
  formatProjectContextBlockHtml,
  formatProjectContextBlockPlain,
} from '../utils/invitationEmailBlocks'
import { loadInvitationProjectContext } from './invitationProjectContextService'
import { resolveInvitationTemplatePlaceholders } from '../features/invitation-templates/utils/resolveInvitationTemplatePlaceholders'
import {
  personalizeInvitationMessage,
  resolveInviteeNamesForInvitation,
  resolveInviterDisplayNameFromUser,
} from '../utils/invitationInviteeFormat.js'

export { buildProjectInvitationUrls } from '../utils/invitationUrlUtils'

const SEND_EMAIL_TIMEOUT_MS = 12_000

function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

async function resolveProjectCodeForInvitation(projectId, projectCode) {
  const trimmed = String(projectCode ?? '').trim()
  if (trimmed) return trimmed
  if (!projectId) return ''
  const { data: proj } = await appDb
    .from('projects')
    .select('project_code')
    .eq('id', projectId)
    .maybeSingle()
  return proj?.project_code?.trim() || ''
}

export async function resolveOrganisationNameForProject(projectId, organisationName) {
  const trimmed = String(organisationName ?? '').trim()
  if (trimmed) return trimmed
  if (!projectId) return ''
  // Embedded join first; if that returns nothing, fall back to a direct accounts query
  const { data: proj } = await appDb
    .from('projects')
    .select('account_id, accounts(account_display_name, account_name, company_name)')
    .eq('id', projectId)
    .maybeSingle()
  const acc = proj?.accounts
  let org = (acc && (acc.account_display_name || acc.account_name || acc.company_name)) || ''
  if (!org && proj?.account_id) {
    const { data: accRow } = await appDb
      .from('accounts')
      .select('account_display_name, account_name, company_name')
      .eq('id', proj.account_id)
      .maybeSingle()
    org = (accRow && (accRow.account_display_name || accRow.account_name || accRow.company_name)) || ''
  }
  return org
}

/**
 * Planned dates for invitation accept UI (anon-safe via SECURITY DEFINER RPC).
 * @param {string} projectId
 * @param {{ planned_start_date?: string|null, planned_end_date?: string|null }} existing
 */
export async function resolveProjectPlannedDatesForProject(projectId, existing = {}) {
  const start = existing.planned_start_date ?? null
  const end = existing.planned_end_date ?? null
  if (start && end) {
    return { planned_start_date: start, planned_end_date: end }
  }
  if (!projectId) {
    return { planned_start_date: start, planned_end_date: end }
  }

  try {
    const { data, error } = await appDb.rpc('get_invitation_project_dates', {
      p_project_id: projectId,
    })
    if (error) {
      console.warn('[resolveProjectPlannedDatesForProject]', error.message)
      return { planned_start_date: start, planned_end_date: end }
    }
    const row = Array.isArray(data) ? data[0] : data
    return {
      planned_start_date: start || row?.planned_start_date || null,
      planned_end_date: end || row?.planned_end_date || null,
    }
  } catch (err) {
    console.warn('[resolveProjectPlannedDatesForProject]', err?.message)
    return { planned_start_date: start, planned_end_date: end }
  }
}

/**
 * Generate invitation token (uses database function)
 * @returns {Promise<{success: boolean, token: string|null, error: string|null}>}
 */
export async function generateInvitationToken() {
  try {
    const { data, error } = await appDb.rpc('generate_invitation_token')

    if (error) throw error

    return {
      success: true,
      token: data,
      error: null,
    }
  } catch (error) {
    console.error('Error generating invitation token:', error)
    // Fallback: generate token client-side
    const fallbackToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    return {
      success: true,
      token: fallbackToken,
      error: null,
    }
  }
}

/**
 * Send project invitation email
 * @param {string} email - Recipient email
 * @param {object} invitationData - Invitation details
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function sendProjectInvitation(email, invitationData) {
  try {
    const personalizedMessage = personalizeInvitationMessage(invitationData.message, {
      inviteeFirstName: invitationData.inviteeFirstName,
      inviteeLastName: invitationData.inviteeLastName,
    })

    const result = await inviteUserToProject(invitationData.projectId, {
      email: email,
      roleId: invitationData.roleId,
      message: personalizedMessage || null,
      expiryDays: invitationData.expiryDays,
      inviteeFirstName: invitationData.inviteeFirstName || null,
      inviteeLastName: invitationData.inviteeLastName || null,
    })

    if (!result.success) {
      return result
    }

    const invitationToken = result.data?.invitation_token
    // Invitation row is persisted — do not block UI on email edge function / context fetches.
    void dispatchProjectInvitationEmail(email, {
      ...invitationData,
      message: personalizedMessage || invitationData.message || null,
      invitationToken,
      appointmentTerms: invitationData.appointmentTerms || null,
    }).catch((err) => {
      console.warn('[sendProjectInvitation] Email dispatch failed:', err?.message)
    })

    return { success: true, data: result.data, error: null }
  } catch (error) {
    console.error('Error sending invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to send invitation',
    }
  }
}

/**
 * Send invitation email for an existing DB invitation row (non-blocking on failure).
 */
export async function dispatchProjectInvitationEmail(email, invitationData) {
  const projectName = invitationData.projectName || 'a project'
  const roleName = invitationData.roleName || 'team member'
  const inviterName = invitationData.inviterName || 'A team member'
  const inviterJobTitle = String(invitationData.inviterJobTitle ?? '').trim()
  const expiryDays = invitationData.expiryDays || 14
  const projectId = invitationData.projectId

  const hasOrg = Boolean(String(invitationData.organisationName ?? '').trim())
  const hasCode = Boolean(String(invitationData.projectCode ?? '').trim())
  const hasContext = Boolean(invitationData.projectContext)
  const hasTypeId = Boolean(invitationData.projectTypeId || invitationData.project_type_id)

  const [organisationName, projectCode, projectContext, projectTypeRow] = await Promise.all([
    hasOrg
      ? Promise.resolve(String(invitationData.organisationName).trim())
      : resolveOrganisationNameForProject(projectId, invitationData.organisationName),
    hasCode
      ? Promise.resolve(String(invitationData.projectCode).trim())
      : resolveProjectCodeForInvitation(projectId, invitationData.projectCode),
    hasContext
      ? Promise.resolve(invitationData.projectContext)
      : projectId
        ? loadInvitationProjectContext(projectId)
        : Promise.resolve(null),
    hasTypeId
      ? Promise.resolve(null)
      : projectId
        ? appDb.from('projects').select('project_type_id').eq('id', projectId).maybeSingle()
        : Promise.resolve({ data: null }),
  ])

  const { acceptUrl, declineUrl } = buildProjectInvitationUrls({
    projectCode,
    projectName,
    roleName,
    invitationToken: invitationData.invitationToken,
  })

  let personalMessage = invitationData.message || ''
  if (personalMessage) {
    personalMessage = resolveInvitationTemplatePlaceholders(personalMessage, {
      projectName,
      roleDisplayName: roleName,
      inviterName,
      organisationName,
      invitationExpiryDays: expiryDays,
      projectContext: projectContext || null,
      inviteeFirstName: invitationData.inviteeFirstName,
      inviteeLastName: invitationData.inviteeLastName,
    })
    // Project context is rendered as its own email section (see formatProjectContextBlockHtml).
    personalMessage = personalMessage.replace(/\{\{project_context_block\}\}\s*/gi, '').trim()
  }
  personalMessage = personalizeInvitationMessage(personalMessage, {
    inviteeFirstName: invitationData.inviteeFirstName,
    inviteeLastName: invitationData.inviteeLastName,
  })
  personalMessage = personalMessage
    ? normalizeInvitationMessageOrganisation(personalMessage, organisationName)
    : null

  const projectContextHtml = formatProjectContextBlockHtml(projectContext)
  const projectContextPlain = formatProjectContextBlockPlain(projectContext)

  const apptTerms = invitationData.appointmentTerms || null
  const appointmentTermsHtml = buildAppointmentTermsHtml(apptTerms)
  const appointmentTermsText = buildAppointmentTermsText(apptTerms)

  const projectTypeId =
    invitationData.projectTypeId ||
    invitationData.project_type_id ||
    projectTypeRow?.data?.project_type_id ||
    null

  try {
    const emailBody = {
      to: email,
      subject: `You've been invited to join ${projectName} on Project Nidus`,
      html: buildInvitationEmailHtml({
        email,
        projectName,
        roleName,
        inviterName,
        inviterJobTitle,
        organisationName,
        personalMessage,
        projectContextHtml,
        appointmentTermsHtml,
        invitationUrl: acceptUrl,
        declineUrl,
        expiryDays,
      }),
      text: buildInvitationEmailText({
        email,
        projectName,
        roleName,
        inviterName,
        inviterJobTitle,
        organisationName,
        personalMessage,
        projectContextPlain,
        appointmentTermsText,
        invitationUrl: acceptUrl,
        declineUrl,
        expiryDays,
      }),
      template_id: 'project_invitation',
    }
    if (projectTypeId) {
      emailBody.project_type_id = projectTypeId
    }

    const { error: emailError } = await withTimeout(
      appDb.functions.invoke('send-email', { body: emailBody }),
      SEND_EMAIL_TIMEOUT_MS,
      'send-email',
    )
    if (emailError) {
      console.warn('[dispatchProjectInvitationEmail] Email send failed:', emailError)
    }
  } catch (emailErr) {
    console.warn('[dispatchProjectInvitationEmail] Email function threw:', emailErr?.message)
  }
}

const APPT_FREQ_LABELS = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  as_required: 'As required',
}

function _fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

function _fmtAmount(n) {
  if (n == null || n === '') return ''
  const num = Number(n)
  if (isNaN(num)) return ''
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildAppointmentTermsHtml(terms) {
  if (!terms) return ''
  const {
    assignmentStartDate,
    assignmentEndDate,
    timeCommitmentPct,
    reportingToName,
    budgetAuthorityLimit,
    reportingFrequency,
    authorityNotes,
    knownConstraints,
    referenceDocument,
  } = terms

  const hasAny =
    assignmentStartDate ||
    assignmentEndDate ||
    timeCommitmentPct ||
    reportingToName ||
    budgetAuthorityLimit ||
    reportingFrequency ||
    authorityNotes ||
    knownConstraints ||
    referenceDocument
  if (!hasAny) return ''

  const tdLabel =
    'padding:8px 12px;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;width:170px;border-bottom:1px solid #dbeafe;'
  const tdValue =
    'padding:8px 12px;color:#1e293b;font-size:13px;font-weight:500;vertical-align:top;border-bottom:1px solid #dbeafe;'

  const row = (label, value) => {
    if (value === null || value === undefined || value === '') return ''
    const displayVal = escapeHtml(String(value)).replace(/\n/g, '<br>')
    return `<tr>
      <td style="${tdLabel}">${escapeHtml(label)}</td>
      <td style="${tdValue}">${displayVal}</td>
    </tr>`
  }

  const rows = [
    row('Assignment start', _fmtDate(assignmentStartDate)),
    row('Assignment end', _fmtDate(assignmentEndDate)),
    row('Time commitment', timeCommitmentPct != null ? `${timeCommitmentPct}%` : ''),
    row('Reporting to', reportingToName),
    row('Reporting frequency', APPT_FREQ_LABELS[reportingFrequency] || reportingFrequency || ''),
    row('Budget authority limit', _fmtAmount(budgetAuthorityLimit)),
    row('Authority notes', authorityNotes),
    row('Known constraints', knownConstraints),
    row('Reference document', referenceDocument),
  ]
    .filter(Boolean)
    .join('')

  if (!rows) return ''

  return `
  <div style="margin:28px 0;border:1px solid #bfdbfe;border-radius:8px;overflow:hidden;">
    <div style="background:#1e40af;padding:12px 20px;">
      <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
        Formal Appointment Terms
      </p>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:11px;">
        Please review these terms before accepting or declining.
      </p>
    </div>
    <div style="background:#eff6ff;">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>
  </div>`
}

function buildAppointmentTermsText(terms) {
  if (!terms) return ''
  const {
    assignmentStartDate,
    assignmentEndDate,
    timeCommitmentPct,
    reportingToName,
    budgetAuthorityLimit,
    reportingFrequency,
    authorityNotes,
    knownConstraints,
    referenceDocument,
  } = terms

  const lines = []
  const add = (label, value) => {
    if (value === null || value === undefined || value === '') return
    lines.push(`${label}: ${value}`)
  }

  add('Assignment start', _fmtDate(assignmentStartDate))
  add('Assignment end', _fmtDate(assignmentEndDate))
  add('Time commitment', timeCommitmentPct != null ? `${timeCommitmentPct}%` : '')
  add('Reporting to', reportingToName)
  add('Reporting frequency', APPT_FREQ_LABELS[reportingFrequency] || reportingFrequency || '')
  add('Budget authority limit', _fmtAmount(budgetAuthorityLimit))
  add('Authority notes', authorityNotes)
  add('Known constraints', knownConstraints)
  add('Reference document', referenceDocument)

  if (!lines.length) return ''

  return [
    '─── Formal Appointment Terms ───',
    'Please review these terms before accepting or declining.',
    ...lines,
    '────────────────────────────────',
  ].join('\n')
}

function buildInvitationEmailHtml({
  email,
  projectName,
  roleName,
  inviterName,
  inviterJobTitle = '',
  organisationName,
  personalMessage,
  projectContextHtml = '',
  appointmentTermsHtml = '',
  invitationUrl,
  expiryDays,
  declineUrl = null,
}) {
  const actionBlock =
    invitationUrl && declineUrl
      ? `<div style="text-align:center;margin:32px 0;">
         <table cellpadding="0" cellspacing="0" align="center" role="presentation">
           <tr>
             <td style="padding:0 8px 8px 8px;">
               <a href="${declineUrl}"
                  style="background:#ffffff;color:#dc2626;padding:14px 24px;border-radius:6px;
                         border:2px solid #dc2626;text-decoration:none;font-size:16px;font-weight:600;
                         display:inline-block;">
                 Decline Invitation
               </a>
             </td>
             <td style="padding:0 8px 8px 8px;">
               <a href="${invitationUrl}"
                  style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:6px;
                         text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
                 Accept Invitation
               </a>
             </td>
           </tr>
         </table>
       </div>
       <p style="color:#9ca3af;font-size:12px;text-align:center;margin:12px 0 0;">
         Button not working? <a href="${invitationUrl}" style="color:#2563eb;text-decoration:underline;font-weight:500;">Click here to accept your invitation</a>
       </p>`
      : invitationUrl
        ? `<div style="text-align:center;margin:32px 0;">
             <a href="${invitationUrl}"
                style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:6px;
                       text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
               Accept Invitation
             </a>
           </div>`
        : `<p style="color:#dc2626;">The invitation link could not be generated. Please contact your administrator.</p>`

  const messageInner = personalMessage
    ? formatInvitationPersonalMessageHtml(personalMessage, {
        skipRedundantIntro: true,
        organisationName,
      })
    : ''
  const messageBlock = messageInner ? wrapInvitationMessageCard(messageInner) : ''
  const apptBlock = appointmentTermsHtml || ''
  const contextBlock = projectContextHtml || ''

  const jobTitleRow = inviterJobTitle
    ? `<tr>
         <td style="padding:4px 0;color:#6b7280;font-size:13px;width:110px;">Job Title</td>
         <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500;">${escapeHtml(inviterJobTitle)}</td>
       </tr>`
    : ''

  const orgRow = organisationName
    ? `<tr>
         <td style="padding:4px 0;color:#6b7280;font-size:13px;width:110px;">Organisation</td>
         <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500;">${escapeHtml(organisationName)}</td>
       </tr>`
    : ''

  const senderBlock = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin:28px 0 0;">
      <p style="margin:0 0 10px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Invitation sent by</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;width:110px;">Name</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(inviterName)}</td>
        </tr>
        ${jobTitleRow}
        ${orgRow}
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;">Project</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;">${escapeHtml(projectName)}</td>
        </tr>
      </table>
    </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#1e40af;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Project Nidus</h1>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Project Management Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">You've been invited!</h2>
          <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
            <strong>${escapeHtml(inviterName)}</strong> has invited you to join
            <strong>${escapeHtml(projectName)}</strong> as a <strong>${escapeHtml(roleName)}</strong>.
          </p>
          ${messageBlock}
          ${apptBlock}
          ${contextBlock}
          ${actionBlock}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">
            This invitation expires in <strong>${expiryDays} days</strong>.
            If you didn't expect this email, you can safely ignore it.
          </p>
          ${senderBlock}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f3f4f6;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            &copy; ${new Date().getFullYear()} Project Nidus. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildInvitationEmailText({
  email,
  projectName,
  roleName,
  inviterName,
  inviterJobTitle = '',
  organisationName,
  personalMessage,
  projectContextPlain = '',
  appointmentTermsText = '',
  invitationUrl,
  declineUrl = null,
  expiryDays,
}) {
  const lines = [
    `You've been invited to join ${projectName} on Project Nidus`,
    '',
    `${inviterName} has invited you to join ${projectName} as a ${roleName}.`,
  ]
  if (personalMessage) {
    const formatted = formatInvitationPersonalMessagePlain(personalMessage, {
      skipRedundantIntro: true,
      organisationName,
    })
    if (formatted) {
      lines.push('', formatted)
    }
  }
  if (appointmentTermsText) {
    lines.push('', appointmentTermsText)
  }
  if (projectContextPlain) {
    lines.push('', projectContextPlain)
  }
  if (declineUrl) {
    lines.push('', 'Decline this invitation:', declineUrl)
  }
  if (invitationUrl) {
    lines.push('', 'Accept your invitation:', invitationUrl)
  }
  lines.push('', `This invitation expires in ${expiryDays} days.`)
  lines.push(
    '',
    '─────────────────────────────',
    'Invitation sent by',
    `Name:         ${inviterName}`,
  )
  if (inviterJobTitle) lines.push(`Job Title:    ${inviterJobTitle}`)
  if (organisationName) lines.push(`Organisation: ${organisationName}`)
  lines.push(`Project:      ${projectName}`)
  lines.push('─────────────────────────────')
  return lines.join('\n')
}

/**
 * Send invitation reminder email
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendInvitationReminder(invitationId) {
  try {
    // Get invitation details
    const { data: invitation, error: fetchError } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        role:roles(role_display_name, role_name),
        invited_by:users!project_invitations_invited_by_user_id_fkey(
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', invitationId)
      .single()

    if (fetchError) throw fetchError

    if (invitation.invitation_status !== 'pending') {
      return {
        success: false,
        error: 'Invitation is not pending',
      }
    }

    // Update reminder timestamp
    await appDb
      .from('project_invitations')
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    const expiresAt = invitation.invitation_expires_at
    let expiryDays = 14
    if (expiresAt) {
      const ms = new Date(expiresAt).getTime() - Date.now()
      expiryDays = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
    }

    await dispatchProjectInvitationEmail(invitation.invited_email, {
      projectId: invitation.project_id || invitation.project?.id,
      projectCode: invitation.project?.project_code,
      projectName: invitation.project?.project_name || 'a project',
      roleName:
        invitation.role?.role_display_name || invitation.role?.role_name || 'team member',
      inviterName:
        resolveInviterDisplayNameFromUser(invitation.invited_by || {}) || 'A team member',
      message: invitation.invitation_message || null,
      expiryDays,
      invitationToken: invitation.invitation_token,
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error sending invitation reminder:', error)
    return {
      success: false,
      error: error.message || 'Failed to send reminder',
    }
  }
}

/**
 * Send invitation accepted notification to project manager
 * @param {string} projectManagerId - Project manager user ID (internal)
 * @param {object} userData - New user data
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendInvitationAccepted(projectManagerId, userData) {
  try {
    // Get project manager email
    const { data: manager, error: managerError } = await appDb
      .from('users')
      .select('email, full_name')
      .eq('id', projectManagerId)
      .single()

    if (managerError) throw managerError

    // TODO: Send actual email
    console.log('Invitation accepted notification:', {
      managerEmail: manager.email,
      newUser: userData.full_name || userData.email,
      projectName: userData.projectName,
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error sending acceptance notification:', error)
    return {
      success: false,
      error: error.message || 'Failed to send notification',
    }
  }
}

/**
 * Validate invitation token
 * @param {string} token - Invitation token
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function validateInvitationToken(token) {
  try {
    const { data, error } = await appDb.rpc('validate_invitation_token', {
      p_token: token,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Invalid invitation token',
      }
    }

    const invitation = data[0]

    if (!invitation.is_valid) {
      return {
        success: false,
        data: invitation,
        error: 'Invitation has expired or is no longer valid',
      }
    }

    return {
      success: true,
      data: invitation,
      error: null,
    }
  } catch (error) {
    console.error('Error validating invitation token:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to validate invitation',
    }
  }
}

/**
 * Get invitation details by token
 * @param {string} token - Invitation token
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getInvitationByToken(token) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(
          id,
          project_name,
          project_code
        ),
        role:roles(
          id,
          role_name,
          role_display_name
        ),
        invited_by:users!project_invitations_invited_by_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('invitation_token', token)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch invitation',
    }
  }
}

/**
 * Enrich validate_invitation_token row for accept/decline display (names, org, dates).
 * @param {object} row
 */
async function enrichInvitationAcceptRow(row) {
  let organisationName = String(row.organisation_name ?? '').trim()

  if (!organisationName && row.project_id) {
    organisationName = await resolveOrganisationNameForProject(row.project_id, '')
  }

  const plannedDates = await resolveProjectPlannedDatesForProject(row.project_id, {
    planned_start_date: row.planned_start_date,
    planned_end_date: row.planned_end_date,
  })

  const inviterDisplayName =
    String(row.inviter_display_name ?? '').trim() ||
    String(row.invited_by_name ?? '').trim() ||
    ''

  let mergedRow = { ...row, organisation_name: organisationName, inviter_display_name: inviterDisplayName }

  const hasDbNames =
    String(mergedRow.invited_first_name ?? '').trim() ||
    String(mergedRow.invited_last_name ?? '').trim()
  if (!hasDbNames && mergedRow.invitation_id) {
    try {
      const { data: nameRow } = await appDb
        .from('project_invitations')
        .select('invited_first_name, invited_last_name, invitation_message')
        .eq('id', mergedRow.invitation_id)
        .maybeSingle()
      if (nameRow) {
        mergedRow = {
          ...mergedRow,
          invited_first_name: nameRow.invited_first_name ?? mergedRow.invited_first_name,
          invited_last_name: nameRow.invited_last_name ?? mergedRow.invited_last_name,
          invitation_message: nameRow.invitation_message ?? mergedRow.invitation_message,
        }
      }
    } catch (e) {
      console.warn('[enrichInvitationAcceptRow] invitee name fallback', e?.message)
    }
  }

  const inviteeNames = resolveInviteeNamesForInvitation(mergedRow)
  if (inviteeNames.first) mergedRow.invited_first_name = inviteeNames.first
  if (inviteeNames.last) mergedRow.invited_last_name = inviteeNames.last

  return {
    ...mergedRow,
    planned_start_date: plannedDates.planned_start_date,
    planned_end_date: plannedDates.planned_end_date,
  }
}

/**
 * Load invitation accept/decline page payload (token validation + organisation for trust display).
 * Returns display data even when the invitation is declined or expired so the details card can render.
 * @param {string} token
 */
export async function getInvitationAcceptContext(token) {
  const validation = await validateInvitationToken(token)
  const row = validation.data
  if (!row) {
    return {
      success: false,
      data: null,
      error: validation.error || 'Invalid invitation token',
    }
  }

  const enriched = await enrichInvitationAcceptRow(row)

  if (!validation.success) {
    return {
      success: false,
      data: enriched,
      error: validation.error || 'Invitation is no longer valid',
    }
  }

  return {
    success: true,
    data: enriched,
    error: null,
  }
}

export default {
  generateInvitationToken,
  sendProjectInvitation,
  dispatchProjectInvitationEmail,
  buildProjectInvitationUrls,
  sendInvitationReminder,
  sendInvitationAccepted,
  validateInvitationToken,
  getInvitationByToken,
  getInvitationAcceptContext,
  resolveOrganisationNameForProject,
  resolveProjectPlannedDatesForProject,
}

