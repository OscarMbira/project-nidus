import React from 'react';
import { Link } from 'react-router-dom';

/**
 * PlatformFooter Component
 * 
 * @description
 * Dedicated footer component for Platform-related pages.
 * This component is completely independent from SimulatorFooter and can be
 * customized separately for Platform-specific branding, links, and content.
 * 
 * @usage
 * Import and use on Platform pages:
 * ```jsx
 * import PlatformFooter from '../../components/homepage/PlatformFooter';
 * <PlatformFooter />
 * ```
 * 
 * @customization
 * - Modify Platform-specific links in the "Platform" section
 * - Update branding colors (currently uses #A8DADC and #E63946)
 * - Add/remove footer sections as needed
 * - Customize company links and legal links independently
 * 
 * @see SimulatorFooter for Simulator-specific footer
 */
const PlatformFooter = () => {
  return (
    <footer className="bg-gray-900 dark:bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span style={{ color: '#A8DADC' }}>Project</span>{' '}
              <span style={{ color: '#E63946' }}>Nidus</span>
            </h3>
            <p className="text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                Platform
              </span>
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Powerful project management tools for teams of all sizes. Manage real projects with structured methodologies from startup to closure.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/platform/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/documentation/platform" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/simulator" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Simulator
                </Link>
              </li>
              <li>
                <Link to="/bundle-pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Bundle Plans
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Project Nidus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PlatformFooter;

