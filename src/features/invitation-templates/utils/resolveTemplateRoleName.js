/**
 * Map public.roles.role_name to invitation_message_templates.role_name keys.
 */
const ROLE_TEMPLATE_ALIASES = {
  pm_team_member: 'team_member',
  pm_team_manager: 'team_manager',
  pm_project_assurance: 'project_assurance',
  pm_quality_assurance: 'quality_assurance',
  pm_change_authority: 'change_authority',
}

export function resolveTemplateRoleName(roleName) {
  const key = String(roleName || '').trim()
  if (!key) return ''
  return ROLE_TEMPLATE_ALIASES[key] || key
}
