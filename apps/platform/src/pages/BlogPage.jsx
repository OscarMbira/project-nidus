import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BlogSection from '../components/homepage/BlogSection';
import MainHeader from '../components/homepage/MainHeader';
import PlatformHeader from '../components/homepage/PlatformHeader';
import SimulatorHeader from '../components/homepage/SimulatorHeader';
import Footer from '../components/homepage/Footer';
import PlatformFooter from '../components/homepage/PlatformFooter';
import SimulatorFooter from '../components/homepage/SimulatorFooter';

const BlogPage = () => {
  const location = useLocation();
  const isPlatform = location.pathname.startsWith('/platform');
  const isSimulator = location.pathname.startsWith('/simulator');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conditional Header */}
      {isPlatform ? <PlatformHeader /> : isSimulator ? <SimulatorHeader /> : <MainHeader />}
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Project Management Blog</h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto">
            Insights, strategies, and best practices from industry experts
          </p>
        </div>
      </section>

      {/* Blog Content */}
      <BlogSection />

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Subscribe to our newsletter to receive the latest articles and updates.
          </p>
          <Link
            to="/register"
            className="inline-block px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Subscribe Now
          </Link>
        </div>
      </section>
      
      {/* Conditional Footer */}
      {isPlatform ? <PlatformFooter /> : isSimulator ? <SimulatorFooter /> : <Footer />}
    </div>
  );
};

export default BlogPage;

