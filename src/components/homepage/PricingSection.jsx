import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';

const PricingSection = () => {
  return (
    <section id="pricing" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
            Pricing Plans
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Both our Project Management Platform and Simulator offer flexible pricing options to suit your needs.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
            <div className="flex flex-col h-full">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Platform</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Starting at $19/month</p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/platform/pricing">View Pricing →</Link>
              </Button>
            </div>
          </Card>
          <Card className="p-8 bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
            <div className="flex flex-col h-full">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Simulator</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Starting at $29/month</p>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Link to="/simulator/pricing">View Pricing →</Link>
              </Button>
            </div>
          </Card>
          <Card className="p-8 bg-gray-50 dark:bg-gray-900 border-2 border-purple-500 flex flex-col h-full">
            <div className="flex flex-col h-full">
              <div className="text-center mb-2">
                <span className="inline-block bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
                  BEST VALUE
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bundle</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">Save up to $200/year</p>
              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                <Link to="/bundle-pricing">View Pricing →</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
