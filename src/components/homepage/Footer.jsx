import React from 'react';
import { Link } from 'react-router-dom';

const Footer = ({ scrollToSection }) => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Project Nidus</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Empowering project managers with structured methodologies, comprehensive tools, and hands-on training to deliver successful projects.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-4">Platforms</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/pm" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Project Management
                </Link>
              </li>
              <li>
                <Link to="/simulator" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Simulator
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#articles" onClick={(e) => { e.preventDefault(); scrollToSection('articles'); }} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Articles
                </a>
              </li>
              <li>
                <a href="#resources" onClick={(e) => { e.preventDefault(); scrollToSection('resources'); }} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Resources
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  About
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Project Nidus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
