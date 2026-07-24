import SimulatorRoleLayout from '../role/SimulatorRoleLayout';

export default function SimulatorCoordinatorLayout({ children }) {
  return <SimulatorRoleLayout layoutScope="coordinator" backLinkClass="hover:text-green-600 dark:hover:text-green-400">{children}</SimulatorRoleLayout>;
}
