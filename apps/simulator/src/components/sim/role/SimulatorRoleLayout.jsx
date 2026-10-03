import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../Sidebar';
import SimulatorAppHeader from '../../headers/SimulatorAppHeader';
import PracticeDashboardSwitcher from '../ui/PracticeDashboardSwitcher';
import { BrandingProvider } from '../../../context/BrandingContext';
import { MenuProvider } from '../../../hooks/useMenu';
import { mainContentSidebarOffsetClass, useSidebarCollapsed } from '@nidus/shared/hooks/useSidebarCollapsed';

/**
 * Generic layout for v734 role dashboards (portfolio, programme, coordinator).
 */
export default function SimulatorRoleLayout({ children, layoutScope, backLinkClass = 'hover:text-blue-600 dark:hover:text-blue-400' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebarCollapsed();

  return (
    <BrandingProvider>
      <MenuProvider layoutScope={layoutScope}>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
          <SimulatorAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex flex-1 overflow-hidden relative">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} simulatorScope={layoutScope} />
            <main
              id="main-content"
              tabIndex="-1"
              className={`flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden ${mainContentSidebarOffsetClass(collapsed)} transition-[margin] duration-300 ease-in-out pt-2 sm:pt-3`}
            >
              <div className="px-4 sm:px-6 pb-2 pt-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
                <Link to="/simulator/dashboard" className={`text-sm text-gray-600 dark:text-gray-400 ${backLinkClass}`}>
                  Back to Simulator
                </Link>
                <PracticeDashboardSwitcher />
              </div>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-4">{children}</div>
            </main>
          </div>
        </div>
      </MenuProvider>
    </BrandingProvider>
  );
}
