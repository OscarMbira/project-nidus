/**
 * Phase 13 — Seed default bodies per project_roles.role_name (must match SQL v531/v602).
 * Used for reset-to-default, first-time account initialisation, and invitee emails.
 *
 * Email layout (invitationService.buildInvitationEmailHtml) always adds:
 * - Project Nidus header, “You've been invited!” summary
 * - This message body (personalised card)
 * - Project context card (description, type, methodology, timeline, hierarchy)
 * - Accept / Decline buttons and accept link
 * - Expiry reminder footer + “Invitation sent by” block
 */

export const INVITATION_TEMPLATE_ROLE_NAMES = [
  'project_board_member',
  'project_sponsor',
  'programme_manager',
  'project_manager',
  'team_manager',
  'project_assurance',
  'quality_assurance',
  'change_authority',
  'team_member',
]

/**
 * Standard invitee message card — matches the personal message block in invitation emails.
 * @param {string} roleSpecificSentence
 */
export function buildStandardInvitationBody(roleSpecificSentence) {
  return `Dear {{invitee_name}},

You have been invited to join **{{project_name}}** as **{{role_name}}**. ${roleSpecificSentence}

{{invitation_expiry_note}}`
}

export const DEFAULT_INVITATION_MESSAGES_BY_ROLE = {
  project_board_member: {
    template_label: 'Project Board Member',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution.',
    ),
  },
  project_sponsor: {
    template_label: 'Project Sponsor',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative.',
    ),
  },
  programme_manager: {
    template_label: 'Programme Manager',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you.',
    ),
  },
  project_manager: {
    template_label: 'Project Manager',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.',
    ),
  },
  team_manager: {
    template_label: 'Team Manager',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      "You will coordinate and lead your team's work packages and contribute to successful project delivery. Looking forward to collaborating with you.",
    ),
  },
  project_assurance: {
    template_label: 'Project Assurance',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement.',
    ),
  },
  quality_assurance: {
    template_label: 'Quality Assurance',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard.',
    ),
  },
  change_authority: {
    template_label: 'Change Authority',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation.',
    ),
  },
  team_member: {
    template_label: 'Team Member',
    subject_line: '',
    message_body: buildStandardInvitationBody(
      'Your contributions will be an important part of delivering this project successfully. Welcome to the team!',
    ),
  },
}
