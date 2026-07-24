import React from 'react';
import { Link } from 'react-router-dom';
import PricingSection from '../components/homepage/PricingSection';
import MainHeader from '../components/homepage/MainHeader';
import Footer from '../components/homepage/Footer';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Header */}
      <MainHeader />
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 text-white py-20 border-b border-slate-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Pricing Plans</h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto">
            Choose the perfect plan for your team and start managing projects with confidence
          </p>
        </div>
      </section>

      {/* Pricing Content */}
      <PricingSection />

      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, all plans include a free tier. You can start using the platform immediately with limited features.
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept all major credit cards and PayPal. Enterprise plans can be invoiced.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PricingPage;

