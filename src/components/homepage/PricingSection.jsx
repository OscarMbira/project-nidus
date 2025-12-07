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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-8 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">PM Platform</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Starting at $19/month</p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link to="/pm">View Pricing →</Link>
            </Button>
          </Card>
          <Card className="p-8 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Simulator</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Starting at $29/month</p>
            <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Link to="/simulator">View Pricing →</Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
