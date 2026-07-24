import React from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const ContactSection = () => {
  return (
    <section id="contact" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
            Get In Touch
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            Contact Us
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
        <Card className="p-8 bg-white dark:bg-gray-800">
          <form className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Your Email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <textarea
                placeholder="Your Message"
                rows="5"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              ></textarea>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              Send Message
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
};

export default ContactSection;
