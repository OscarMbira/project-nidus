import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

// Navigation items - static constant (merged Option 1 & 2, starting with Features)
const NAV_ITEMS = [
  { id: 'features', label: 'Features', href: '/features' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'resources', label: 'Resources', href: '/resources' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'documentation', label: 'Documentation', href: '/documentation/platform' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'contact', label: 'Contact', href: '/contact' },
];

const MainHeader = ({ hidePlatformButton = false, hideSimulatorButton = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gray-800/80 backdrop-blur-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Project
            </span>
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-2">
              Nidus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="font-medium text-gray-400 hover:text-white transition-colors"
              style={{ fontSize: '16px' }}
            >
              Home
            </Link>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="font-medium text-gray-400 hover:text-white transition-colors"
                style={{ fontSize: '16px' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Header Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!hidePlatformButton && (
              <Link
                to="/platform"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                <span className="hidden md:inline">Platform</span>
                <span className="md:hidden">PLT</span>
              </Link>
            )}
            {!hideSimulatorButton && (
              <Link
                to="/simulator"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
              >
                <span className="hidden md:inline">Simulator</span>
                <span className="md:hidden">SIM</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-gray-600 bg-transparent hover:bg-gray-700 text-gray-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-700 bg-gray-800">
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-gray-400 hover:text-white"
              >
                Home
              </Link>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-400 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {!hidePlatformButton && (
                  <Link
                    to="/platform"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Platform
                  </Link>
                )}
                {!hideSimulatorButton && (
                  <Link
                    to="/simulator"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-md font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Simulator
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default MainHeader;

