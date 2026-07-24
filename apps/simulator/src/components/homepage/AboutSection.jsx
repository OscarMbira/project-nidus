import React from 'react';

const AboutSection = () => {
  return (
    <section id="about" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 scroll-mt-24">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
          About Us
        </div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6">
          About Project Nidus
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Project Nidus is a comprehensive project management platform designed to empower project managers, teams, and organizations with structured methodologies and practical tools. We combine powerful project management capabilities with innovative simulation training to help you succeed.
        </p>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
          Our mission is to make professional project management accessible, practical, and effective for teams of all sizes. Whether you're managing real projects or practicing your skills, Project Nidus provides the tools and insights you need to excel.
        </p>
      </div>
    </section>
  );
};

export default AboutSection;
