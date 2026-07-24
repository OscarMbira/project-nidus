import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ResourcesSection from '../components/homepage/ResourcesSection';
import MainHeader from '../components/homepage/MainHeader';
import PlatformHeader from '../components/homepage/PlatformHeader';
import SimulatorHeader from '../components/homepage/SimulatorHeader';
import Footer from '../components/homepage/Footer';
import PlatformFooter from '../components/homepage/PlatformFooter';
import SimulatorFooter from '../components/homepage/SimulatorFooter';

const ResourcesPage = () => {
  const location = useLocation();
  const isPlatform = location.pathname.startsWith('/platform');
  const isSimulator = location.pathname.startsWith('/simulator');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conditional Header */}
      {isPlatform ? <PlatformHeader /> : isSimulator ? <SimulatorHeader /> : <MainHeader />}
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Resources</h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            Everything you need to succeed with Project Nidus
          </p>
        </div>
      </section>

      {/* Resources Content */}
      <ResourcesSection />

      {/* Additional Resources Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Video Tutorials
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Step-by-step video guides to help you get started quickly.
              </p>
              <Link
                to="/documentation/platform"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center"
              >
                Watch Videos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Webinars
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Join our live webinars to learn from experts and ask questions.
              </p>
              <Link
                to="/register"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center"
              >
                Register <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Community Forum
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Connect with other users and share best practices.
              </p>
              <Link
                to="/register"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center"
              >
                Join Community <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Conditional Footer */}
      {isPlatform ? <PlatformFooter /> : isSimulator ? <SimulatorFooter /> : <Footer />}
    </div>
  );
};

export default ResourcesPage;

