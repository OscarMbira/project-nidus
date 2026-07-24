import SimulatorRoleLayout from '../role/SimulatorRoleLayout';

export default function SimulatorProgrammeLayout({ children }) {
  return <SimulatorRoleLayout layoutScope="programme" backLinkClass="hover:text-orange-600 dark:hover:text-orange-400">{children}</SimulatorRoleLayout>;
}
