import React from 'react';

const HeroSection = () => {
  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold px-5 py-2 rounded-full mb-8">
          Project Management Blog
        </span>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
          Elevate Your Project Management Expertise
        </h1>
        <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Discover insights, strategies, and best practices from industry experts. Learn structured methodologies, risk management, team leadership, and more.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
