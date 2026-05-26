import React from 'react';
import { ArrowRight } from 'lucide-react';
import Card from '../ui/Card';

const RESOURCES = [
  {
    id: 1,
    category: 'Guide',
    title: 'Getting Started Guide',
    description: 'Complete guide to getting started with Project Nidus platform and best practices.',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 2,
    category: 'Template',
    title: 'Project Templates',
    description: 'Ready-to-use project templates for various industries and project types.',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 3,
    category: 'Tool',
    title: 'Project Calculator',
    description: 'Calculate project timelines, budgets, and resource requirements with our tools.',
    gradient: 'from-cyan-500 to-blue-600'
  }
];

const ResourcesSection = () => {
  return (
    <section id="resources" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
            Resources
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Helpful Resources
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Access guides, templates, and tools to enhance your project management skills.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {RESOURCES.map((resource, index) => (
            <Card key={resource.id} className="h-full overflow-hidden hover:shadow-xl transition-shadow">
              <div className={`h-60 bg-gradient-to-br ${resource.gradient} relative`}>                <div className="absolute top-6 left-6 bg-white/90 dark:bg-gray-900/90 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  {resource.category}
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {resource.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {resource.description}
                </p>
                <a href="#" className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all">
                  Browse <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;
