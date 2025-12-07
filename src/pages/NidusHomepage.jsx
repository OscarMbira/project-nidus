import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Moon, Sun } from 'lucide-react';

// Import components - Hero and CTA load immediately
import HeroSection from '../components/homepage/HeroSection';
import CTASection from '../components/homepage/CTASection';
import LazySection from '../components/homepage/LazySection';

// Lazy-loaded sections (load only when visible)
import BlogSection from '../components/homepage/BlogSection';
import PricingSection from '../components/homepage/PricingSection';
import ResourcesSection from '../components/homepage/ResourcesSection';
import AboutSection from '../components/homepage/AboutSection';
import ContactSection from '../components/homepage/ContactSection';
import Footer from '../components/homepage/Footer';

// Standalone theme toggle for homepage - optimized for performance
const StandaloneThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      html.classList.add('dark');
      body.classList.add('dark');
      html.classList.remove('light');
      body.classList.remove('light');
    } else {
      html.classList.add('light');
      body.classList.add('light');
      html.classList.remove('dark');
      body.classList.remove('dark');
    }

    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

// Navigation items - static constant (merged Option 1 & 2, starting with Features)
const NAV_ITEMS = [
  { id: 'cta', label: 'Features', href: '#cta' },
  { id: 'articles', label: 'Blog', href: '#articles' },
  { id: 'resources', label: 'Resources', href: '#resources' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
  { id: 'documentation', label: 'Documentation', href: '/documentation/pm' },
  { id: 'about', label: 'About', href: '#about' },
  { id: 'contact', label: 'Contact', href: '#contact' },
];

const NidusHomepage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      {/* Header - Always dark theme, not affected by theme toggle */}
      <header className="sticky top-0 z-50 bg-gray-800/80 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Project
              </span>
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-2">
                Nidus
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map((item) => {
                // Handle Documentation as a route link, others as anchor links
                if (item.id === 'documentation') {
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  );
                }
                // Handle anchor links for sections
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Header Buttons */}
            <div className="flex items-center gap-3">
              <StandaloneThemeToggle />
              <Link
                to="/pm"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                <span className="hidden md:inline">PM Platform</span>
                <span className="md:hidden">PM</span>
              </Link>
              <Link
                to="/simulator"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
              >
                <span className="hidden md:inline">Simulator</span>
                <span className="md:hidden">SIM</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg border border-gray-600 bg-transparent hover:bg-gray-700 text-gray-300"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-700 bg-gray-800">
            <div className="px-4 py-4 space-y-3">
              {NAV_ITEMS.map((item) => {
                // Handle Documentation as a route link, others as anchor links
                if (item.id === 'documentation') {
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-400 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  );
                }
                // Handle anchor links for sections
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
                    className="block py-2 text-gray-400 hover:text-white"
                  >
                    {item.label}
                  </a>
                );
              })}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <Link
                  to="/pm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  PM Platform
                </Link>
                <Link
                  to="/simulator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-md font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Simulator
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Hero Section - Load immediately for fast First Contentful Paint */}
      <HeroSection />

      {/* CTA Section - Load immediately (above the fold) */}
      <CTASection />

      {/* Blog Section - Lazy load when scrolling down */}
      <LazySection>
        <BlogSection />
      </LazySection>

      {/* Pricing Section - Lazy load */}
      <LazySection>
        <PricingSection />
      </LazySection>

      {/* Resources Section - Lazy load */}
      <LazySection>
        <ResourcesSection />
      </LazySection>

      {/* About Section - Lazy load */}
      <LazySection>
        <AboutSection />
      </LazySection>

      {/* Contact Section - Lazy load */}
      <LazySection>
        <ContactSection />
      </LazySection>

      {/* Footer - Lazy load */}
      <LazySection>
        <Footer scrollToSection={scrollToSection} />
      </LazySection>
    </div>
  );
};

export default NidusHomepage;
