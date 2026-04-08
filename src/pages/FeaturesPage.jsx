import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings2, BarChartBig, CheckCircle, ShieldCheck, Users, MessageSquare } from 'lucide-react';
import Card from '../components/ui/Card';
import MainHeader from '../components/homepage/MainHeader';
import PlatformHeader from '../components/homepage/PlatformHeader';
import SimulatorHeader from '../components/homepage/SimulatorHeader';
import Footer from '../components/homepage/Footer';
import PlatformFooter from '../components/homepage/PlatformFooter';
import SimulatorFooter from '../components/homepage/SimulatorFooter';

const features = [
  {
    icon: <Settings2 className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Structured Processes',
    description: 'Follow proven methodologies for consistent project delivery, from startup to closure.',
  },
  {
    icon: <BarChartBig className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Role-Based Dashboards',
    description: 'Customized views for Project Managers, Team Members, and Stakeholders.',
  },
  {
    icon: <CheckCircle className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Automated Reporting',
    description: 'Generate insightful reports and analytics with ease, tracking progress and performance.',
  },
  {
    icon: <ShieldCheck className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Risk Management',
    description: 'Identify, assess, and manage project risks proactively within the platform.',
  },
  {
    icon: <Users className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Quality Management',
    description: 'Ensure your deliverables meet the required standards with integrated quality checks.',
  },
  {
    icon: <MessageSquare className="h-14 w-14 text-blue-600 dark:text-blue-400" />,
    title: 'Communication Hub',
    description: 'Centralize project communication, keeping everyone informed and aligned.',
  },
];

const FeaturesPage = () => {
  const location = useLocation();
  const isPlatform = location.pathname.startsWith('/platform');
  const isSimulator = location.pathname.startsWith('/simulator');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conditional Header */}
      {isPlatform ? <PlatformHeader /> : isSimulator ? <SimulatorHeader /> : <MainHeader />}
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Platform Features</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Discover the powerful tools and capabilities that make Project Nidus the complete project management solution
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Experience These Features?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Start your free trial today and see how Project Nidus can transform your project management.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/platform"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
      
      {/* Conditional Footer */}
      {isPlatform ? <PlatformFooter /> : isSimulator ? <SimulatorFooter /> : <Footer />}
    </div>
  );
};

export default FeaturesPage;

