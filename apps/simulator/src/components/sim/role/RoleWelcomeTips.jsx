import { getSimulatorRoleById } from '@nidus/shared/constants/simulatorRoles';

const TIPS = {
  project_manager: 'Focus on delivery control: risks, issues, EVM, and stakeholder alignment each turn.',
  programme_manager: 'Watch cross-project dependencies and benefits realisation across tranches.',
  portfolio_manager: 'Balance strategic priorities against capacity and investment constraints.',
  pmo_analyst: 'Strengthen governance, reporting accuracy, and methodology compliance.',
  project_coordinator: 'Keep schedules, RAID logs, and communications current for the PM team.',
};

export default function RoleWelcomeTips({ roleId }) {
  const role = getSimulatorRoleById(roleId);
  const tip = TIPS[roleId];
  if (!role || !tip) return null;

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
      <strong>{role.label} tip:</strong> {tip}
    </div>
  );
}
