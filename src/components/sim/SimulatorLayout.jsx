import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { simulatorMenuConfig, filterSimMenuBySubscription } from '../../config/simulatorMenuConfig';
import {
  LayoutDashboard,
  FolderKanban,
  Rocket,
  Package,
  ClipboardList,
  FileText,
  FileBarChart,
  CheckCircle2,
  GitBranch,
  Briefcase,
  Gamepad2,
  GraduationCap,
  Trophy,
  Award,
  User,
  Settings,
  Bot,
  BookOpen,
  DollarSign,
  Receipt,
  ClipboardCheck,
  ClockAlert,
  PauseCircle,
  Library,
  List,
} from 'lucide-react';

// Icon mapping for simulator menu items
const iconMap = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'rocket': Rocket,
  'package': Package,
  'clipboard-list': ClipboardList,
  'file-text': FileText,
  'file-bar-chart': FileBarChart,
  'check-circle-2': CheckCircle2,
  'git-branch': GitBranch,
  'briefcase': Briefcase,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  'trophy': Trophy,
  'award': Award,
  'user': User,
  'settings': Settings,
  'bot': Bot,
  'book-open': BookOpen,
  'dollar-sign': DollarSign,
  'receipt': Receipt,
  'clipboard-check': ClipboardCheck,
  'clock-alert': ClockAlert,
  'pause-circle': PauseCircle,
  'library': Library,
  'list': List,
};

function SimulatorMenuItem({ menuItem, level = 0, theme }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = menuItem.children && menuItem.children.length > 0;
  const isActive = menuItem.path 
    ? (menuItem.path === '/simulator/dashboard' 
        ? location.pathname === '/simulator/dashboard' 
        : location.pathname.startsWith(menuItem.path))
    : false;

  const Icon = iconMap[menuItem.icon] || FileText;

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      {menuItem.path ? (
        <Link
          to={menuItem.path}
          onClick={handleClick}
          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            isActive
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              : theme === 'dark'
              ? 'text-gray-300 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="flex-1">{menuItem.label}</span>
          {hasChildren && (
            <span className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </Link>
      ) : (
        <button
          onClick={handleClick}
          className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{menuItem.label}</span>
          {hasChildren && (
            <span className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </button>
      )}
      {hasChildren && isExpanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 pl-2 ${
          isActive ? 'border-blue-500' : theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {menuItem.children.map((child) => (
            <SimulatorMenuItem key={child.id} menuItem={child} level={level + 1} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

const SimulatorLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  console.log('[SimulatorLayout] Rendering with theme:', theme);
  console.log('[SimulatorLayout] toggleTheme function:', toggleTheme);

  // Get user subscription tier (default to 'free' for now)
  // TODO: Get actual subscription tier from user context/service
  const userSubscriptionTier = 'free';
  const menuItems = filterSimMenuBySubscription(simulatorMenuConfig, userSubscriptionTier);


  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Top Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/simulator" className="ml-4 flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Simulator
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Back to PM App */}
            <Link
              to="/app"
              className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Back to PM App
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                console.log('[SimulatorLayout] Theme toggle button clicked!');
                console.log('[SimulatorLayout] Current theme before toggle:', theme);
                console.log('[SimulatorLayout] Calling toggleTheme...');
                toggleTheme();
                console.log('[SimulatorLayout] toggleTheme called successfully');
              }}
              className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center space-x-2 p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </button>

              {userMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
                  <Link
                    to="/simulator/profile"
                    className={`block px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/simulator/settings"
                    className={`block px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    Settings
                  </Link>
                  <Link
                    to="/simulator/subscription"
                    className={`block px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    Subscription
                  </Link>
                  <hr className={theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} />
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm text-red-500 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r w-64`}
      >
        <div className="p-4 h-full overflow-y-auto">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Upgrade CTA */}
          <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h4 className="font-semibold text-sm mb-2">Upgrade to Pro</h4>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
              Unlock all scenarios and features
            </p>
            <Link
              to="/simulator/pricing"
              className="block w-full text-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700"
            >
              View Plans
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SimulatorLayout;
