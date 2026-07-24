/**
 * Practice Dashboard Switcher — all 5 v734 practice roles.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ChevronDown } from 'lucide-react';
import { SIMULATOR_ROLE_LIST } from '@nidus/shared/constants/simulatorRoles';
import { getStoredRole } from '../../../services/sim/rolePreferenceService';

export default function PracticeDashboardSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(getStoredRole());

  useEffect(() => {
    setCurrentRole(getStoredRole());
  }, [location.pathname]);

  const active = SIMULATOR_ROLE_LIST.find((r) => location.pathname.startsWith(r.dashboardPath.replace('/dashboard', '')))
    || SIMULATOR_ROLE_LIST.find((r) => r.id === currentRole);

  if (!active) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>{active.label} Dashboard</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            <div className="py-1">
              {SIMULATOR_ROLE_LIST.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    navigate(role.dashboardPath);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    active.id === role.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{role.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{role.level}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
