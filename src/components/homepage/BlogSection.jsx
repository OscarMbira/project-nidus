import React from 'react';
import { ArrowRight } from 'lucide-react';
import Card from '../ui/Card';

const BLOG_POSTS = [
  {
    id: 1,
    category: 'Methodology',
    date: 'November 20, 2025',
    title: 'Mastering Project Initiation: A Complete Guide',
    excerpt: 'Learn the essential steps for starting projects correctly. From understanding the mandate to creating a comprehensive project brief.',
    gradient: 'from-blue-500 to-purple-600'
  },
  {
    id: 2,
    category: 'Risk Management',
    date: 'November 18, 2025',
    title: 'Advanced Risk Management Strategies',
    excerpt: 'Discover proven techniques for identifying, assessing, and mitigating project risks before they impact your timeline or budget.',
    gradient: 'from-green-500 to-teal-600'
  },
  {
    id: 3,
    category: 'Team Leadership',
    date: 'November 15, 2025',
    title: 'Building High-Performance Project Teams',
    excerpt: 'Explore the principles of team formation, role assignment, and performance management that drive exceptional results.',
    gradient: 'from-orange-500 to-red-600'
  }
];

const BlogSection = () => {
  return (
    <section id="articles" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
            Latest Articles
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Latest Articles
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <Card key={post.id} className="h-full overflow-hidden hover:shadow-xl transition-shadow">
              <div className={`h-60 bg-gradient-to-br ${post.gradient} relative`}>
                <div className="absolute top-6 left-6 bg-white/90 dark:bg-gray-900/90 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  {post.category}
                </div>
              </div>
              <div className="p-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {post.date}
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {post.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                <a href="#" className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all">
                  Read more <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
