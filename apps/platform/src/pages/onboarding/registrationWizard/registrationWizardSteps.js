/**
 * Registration wizard step registry (v918, CLAUDE.md Phase 5). Step 1 "Your Account" is the
 * existing sign-up page (outside this folder) — the wizard shell below only renders steps 2-6.
 * `path` is used for stepper navigation; `null` means the step is display-only once complete
 * (account signup is already done by the time the shell renders).
 */
export const REGISTRATION_WIZARD_STEPS = [
  { id: 'account', label: 'Your Account', path: null },
  { id: 'organisation', label: 'Your Organisation', path: '/onboarding/organisation-setup' },
  { id: 'industry', label: 'Industry', path: '/onboarding/industry-selection' },
  { id: 'professional-role', label: 'Professional Role', path: '/onboarding/professional-role' },
  { id: 'email-verification', label: 'Email Verification', path: '/onboarding/email-verification' },
  { id: 'review', label: 'Review', path: '/onboarding/review' },
  { id: 'workspace-setup', label: 'Workspace Setup', path: '/onboarding/workspace-setup' },
]

/**
 * Whether the stepper may jump to a step given the wizard location.state accumulated so far.
 * Prevents skipping ahead to steps that would immediately redirect for missing prerequisites.
 */
export function isRegistrationWizardStepReachable(stepId, wizardState = {}) {
  const { orgFormData, industrySelection, professionalRoleId } = wizardState || {}
  switch (stepId) {
    case 'account':
      return false
    case 'organisation':
      return true
    case 'industry':
      return Boolean(orgFormData)
    case 'professional-role':
      return Boolean(orgFormData && industrySelection)
    case 'email-verification':
    case 'review':
    case 'workspace-setup':
      return Boolean(orgFormData && industrySelection && professionalRoleId)
    default:
      return false
  }
}
