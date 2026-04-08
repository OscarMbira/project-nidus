import React from 'react';
import { Link } from 'react-router-dom';
import AboutSection from '../components/homepage/AboutSection';
import MainHeader from '../components/homepage/MainHeader';
import Footer from '../components/homepage/Footer';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Header */}
      <MainHeader />
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Project Nidus</h1>
          <p className="text-xl text-teal-100 max-w-3xl mx-auto">
            Empowering project managers with structured methodologies and practical tools
          </p>
        </div>
      </section>

      {/* About Content */}
      <AboutSection />

      {/* Mission & Values Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                To make professional project management accessible, practical, and effective for teams of all sizes. 
                We believe that with the right tools and methodologies, any team can deliver successful projects.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Our Values
              </h2>
              <ul className="space-y-3 text-lg text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-2">✓</span>
                  <span>Commitment to excellence in project delivery</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-2">✓</span>
                  <span>Continuous innovation and improvement</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-2">✓</span>
                  <span>User-centric design and development</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-2">✓</span>
                  <span>Transparency and open communication</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Join Us on This Journey
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Be part of a growing community of project managers who are transforming how projects are delivered.
          </p>
          <Link
            to="/register"
            className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;

