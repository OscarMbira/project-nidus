/**
 * Phase 13 — Seed default bodies per project_roles.role_name (must match SQL v531).
 * Used for reset-to-default and first-time account initialisation.
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

const EXPIRY_SUFFIX = '\n\n{{invitation_expiry_note}}'
const SENDER_SUFFIX = '\n\nKind regards,\n**{{sender_name}}**\n{{sender_organisation}}'

export const DEFAULT_INVITATION_MESSAGES_BY_ROLE = {
  project_board_member: {
    template_label: 'Project Board Member',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as a **{{role_name}}**. In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  project_sponsor: {
    template_label: 'Project Sponsor',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  programme_manager: {
    template_label: 'Programme Manager',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  project_manager: {
    template_label: 'Project Manager',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  team_manager: {
    template_label: 'Team Manager',
    subject_line: '',
    message_body:
      "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will coordinate and lead your team's work packages and contribute to successful project delivery. Looking forward to collaborating with you." +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  project_assurance: {
    template_label: 'Project Assurance',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  quality_assurance: {
    template_label: 'Quality Assurance',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  change_authority: {
    template_label: 'Change Authority',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation.' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
  team_member: {
    template_label: 'Team Member',
    subject_line: '',
    message_body:
      'You have been invited to join **{{project_name}}** as a **{{role_name}}**. Your contributions will be an important part of delivering this project successfully. Welcome to the team!' +
      EXPIRY_SUFFIX + SENDER_SUFFIX,
  },
}
