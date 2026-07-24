import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SimulatorFooter Component
 * 
 * @description
 * Dedicated footer component for Simulator-related pages.
 * This component is completely independent from PlatformFooter and can be
 * customized separately for Simulator-specific branding, links, and content.
 * 
 * @usage
 * Import and use on Simulator pages:
 * ```jsx
 * import SimulatorFooter from '../../components/homepage/SimulatorFooter';
 * <SimulatorFooter />
 * ```
 * 
 * @customization
 * - Modify Simulator-specific links in the "Simulator" section
 * - Update branding colors (currently uses green gradient theme)
 * - Add/remove footer sections as needed (e.g., Tutorial link)
 * - Customize company links and legal links independently
 * 
 * @see PlatformFooter for Platform-specific footer
 */
const SimulatorFooter = () => {
  return (
    <footer className="bg-gray-900 dark:bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Project
              </span>{' '}
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent">
                Nidus
              </span>
            </h3>
            <p className="text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Simulator
              </span>
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Practice project management in a safe, controlled environment. Master skills through realistic simulations without risking real projects.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Simulator</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/simulator/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/documentation/simulator" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/simulator/tutorial" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Tutorial
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
                <Link to="/platform" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Platform
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

export default SimulatorFooter;

