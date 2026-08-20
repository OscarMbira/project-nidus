/**
 * Registration wizard step registry (v918, CLAUDE.md Phase 5). Step 1 "Your Account" is the
 * existing sign-up page (outside this folder) — the wizard shell below only renders steps 2-6.
 */
export const REGISTRATION_WIZARD_STEPS = [
  { id: 'account', label: 'Your Account' },
  { id: 'organisation', label: 'Your Organisation' },
  { id: 'industry', label: 'Industry' },
  { id: 'professional-role', label: 'Professional Role' },
  { id: 'review', label: 'Verify' },
  { id: 'workspace-setup', label: 'Workspace Setup' },
]
