import SimulatorRoleLayout from '../role/SimulatorRoleLayout';

export default function SimulatorPortfolioLayout({ children }) {
  return <SimulatorRoleLayout layoutScope="portfolio" backLinkClass="hover:text-indigo-600 dark:hover:text-indigo-400">{children}</SimulatorRoleLayout>;
}
