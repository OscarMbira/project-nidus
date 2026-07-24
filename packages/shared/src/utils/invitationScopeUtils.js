/**
 * Distinguish project-scoped vs organisation-scoped invitation accept flows.
 */

/** @param {{ project_id?: string | null } | null | undefined} invitation */
export function isOrganisationScopeInvitation(invitation) {
  return Boolean(invitation) && !invitation.project_id
}

/** @param {{ project_id?: string | null, project_name?: string | null, organisation_name?: string | null } | null | undefined} invitation */
export function getInvitationTargetLabel(invitation) {
  if (!invitation) return 'the project'
  if (isOrganisationScopeInvitation(invitation)) {
    return (
      String(invitation.organisation_name || invitation.project_name || '').trim() ||
      'the organisation'
    )
  }
  return String(invitation.project_name || '').trim() || 'the project'
}

/** @param {{ project_id?: string | null } | null | undefined} invitation */
export function getInvitationScopeHeading(invitation) {
  return isOrganisationScopeInvitation(invitation) ? 'Organisation invitation' : 'Project invitation'
}

/** @param {{ project_id?: string | null } | null | undefined} invitation */
export function getInvitationScopeIntro(invitation) {
  return isOrganisationScopeInvitation(invitation)
    ? 'Review the details below, then accept to join the organisation or decline if this was not expected.'
    : 'Review the details below, then accept to join the project or decline if this was not expected.'
}

/** @param {{ project_id?: string | null } | null | undefined} invitation */
export function getInvitationDeclinedMessage(invitation) {
  return isOrganisationScopeInvitation(invitation)
    ? 'You have declined this organisation invitation. Your account was not granted access to the organisation.'
    : 'You have declined this project invitation. Your account was not added to the project.'
}
