import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section id="cta" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Choose the tool that fits your needs
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PM Platform Card */}
          <Card className="h-full p-8 md:p-12 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 transition-all hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 transform scale-x-0 hover:scale-x-100 transition-transform duration-300"></div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
              Platform
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Project Management Platform
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Comprehensive project management solution with structured methodologies. Perfect for managing real projects from startup to closure.
            </p>
            <ul className="space-y-3 mb-8">
              {['Structured project workflows', 'Role-based dashboards', 'Advanced reporting & analytics', 'Risk & quality management'].map((feature, idx) => (
                <li key={idx} className="flex items-center text-gray-600 dark:text-gray-300">
                  <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/pm');
              }}
              className="w-full h-11 px-8 text-base inline-flex items-center justify-center gap-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Launch Platform <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Card>

          {/* Simulator Card */}
          <Card className="h-full p-8 md:p-12 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-green-600 dark:hover:border-green-500 transition-all hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-600 to-green-400 transform scale-x-0 hover:scale-x-100 transition-transform duration-300"></div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-4">
              Training
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Project Management Simulator
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Practice project management in a risk-free environment. Learn through realistic simulations with instant feedback and detailed analytics.
            </p>
            <ul className="space-y-3 mb-8">
              {['Realistic project scenarios', 'Safe-to-fail practice environment', 'Performance tracking & analytics', '4 roles supported'].map((feature, idx) => (
                <li key={idx} className="flex items-center text-gray-600 dark:text-gray-300">
                  <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Link to="/simulator">
                Start Simulation <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
