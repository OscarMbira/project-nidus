import React, { useState, useEffect, useMemo, lazy, Suspense, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Removed framer-motion for performance - animations removed
import { 
  Zap, 
  Settings2, 
  BarChartBig, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../services/supabaseClient';

// Lazy load footer (below the fold)
const PlatformFooter = lazy(() => import('../components/homepage/PlatformFooter'));

// Memoize static data to prevent recreation on every render
const featureList = [
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

const howItWorksSteps = [
  { title: 'Start Up a Project', description: 'Define objectives and create the project brief effortlessly.' },
  { title: 'Initiate and Plan', description: 'Develop detailed plans, assign roles, and set up controls.' },
  { title: 'Manage Stage by Stage', description: 'Monitor progress, manage issues, and control stage boundaries.' },
  { title: 'Deliver and Close', description: 'Finalize deliverables, evaluate performance, and formally close the project.' },
];

const pricingTiers = [
  { name: 'Free', price: '$0', features: ['1 Project', 'Basic Task Management', 'Community Support'], cta: 'Get Started' },
  { name: 'Basic', price: '$19', period: '/month', features: ['5 Projects', 'Advanced Task Tracking', 'Email Support', 'Basic Reporting'], cta: 'Get Started' },
  { name: 'Professional', price: '$49', period: '/month', features: ['Unlimited Projects', 'Full Workflow', 'Advanced Reporting', 'Risk Management', 'Priority Support'], cta: 'Get Started', popular: true },
  { name: 'Enterprise', price: 'Custom', features: ['All Professional Features', 'Dedicated Account Manager', 'Custom Integrations', 'SLA', 'On-premise Option'], cta: 'Contact Sales' },
];

const testimonials = [
  { quote: "Project Nidus transformed how we manage complex projects. The structured approach is invaluable.", name: "Jane Doe", title: "Project Director", company: "Innovatech Solutions" },
  { quote: "The automated reporting saves us hours each week. Highly recommended!", name: "John Smith", title: "Operations Manager", company: "Global Corp" },
  { quote: "Finally, a tool that truly understands project management methodologies.", name: "Alice Brown", title: "Lead Consultant", company: "Strategy Hub" },
];

const stats = [
  { value: '10K+', label: 'Active Projects' },
  { value: '50K+', label: 'Users' },
  { value: '99%', label: 'Success Rate' },
  { value: '24/7', label: 'Support' },
];

// Memoized section variants
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

// Memoized header component to prevent re-renders
// Optimized with CSS classes instead of inline event handlers
const Header = memo(({ isLoggedIn, onHomeClick }) => {
  // Memoize hover handlers to prevent recreation
  const handleNavMouseEnter = useCallback((e) => {
    e.target.style.color = '#FFFFFF';
  }, []);
  
  const handleNavMouseLeave = useCallback((e) => {
    e.target.style.color = '#A8DADC';
  }, []);
  
  const handleButtonMouseEnter = useCallback((e) => {
    e.currentTarget.style.backgroundColor = 'rgba(168, 218, 220, 0.1)';
    e.currentTarget.style.borderColor = '#FFFFFF';
  }, []);
  
  const handleButtonMouseLeave = useCallback((e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderColor = '#A8DADC';
  }, []);
  
  const handleSignUpMouseEnter = useCallback((e) => {
    e.currentTarget.style.background = '#d62839';
  }, []);
  
  const handleSignUpMouseLeave = useCallback((e) => {
    e.currentTarget.style.background = '#E63946';
  }, []);

  return (
    <header className="sticky top-0 z-50 shadow-sm border-b backdrop-blur-md" style={{ background: 'linear-gradient(135deg, #0F2027 0%, #203A43 100%)', borderColor: '#203A43' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Zap className="h-6 w-6" style={{ color: '#A8DADC' }} />
          <div className="flex flex-col">
            <span className="text-3xl font-bold">
              <span style={{ color: '#A8DADC' }}>Project</span>
              <span style={{ color: '#E63946' }} className="ml-1">Nidus</span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium mt-0.5" style={{ color: '#A8DADC' }}>Platform</span>
              <div className="h-0.5 mt-0.5" style={{ background: '#E63946' }}></div>
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          <button
            type="button"
            onClick={onHomeClick}
            className="text-sm font-medium transition-colors bg-transparent border-none cursor-pointer"
            style={{ color: '#A8DADC' }}
            onMouseEnter={handleNavMouseEnter}
            onMouseLeave={handleNavMouseLeave}
          >
            Home
          </button>
          <Link to="/platform/features" className="text-sm font-medium transition-colors" style={{ color: '#A8DADC' }} onMouseEnter={handleNavMouseEnter} onMouseLeave={handleNavMouseLeave}>Features</Link>
          <Link to="/platform/blog" className="text-sm font-medium transition-colors" style={{ color: '#A8DADC' }} onMouseEnter={handleNavMouseEnter} onMouseLeave={handleNavMouseLeave}>Blog</Link>
          <Link to="/platform/resources" className="text-sm font-medium transition-colors" style={{ color: '#A8DADC' }} onMouseEnter={handleNavMouseEnter} onMouseLeave={handleNavMouseLeave}>Resources</Link>
          <Link to="/platform/pricing" className="text-sm font-medium transition-colors" style={{ color: '#A8DADC' }} onMouseEnter={handleNavMouseEnter} onMouseLeave={handleNavMouseLeave}>Pricing</Link>
          <Link to="/documentation/platform" className="text-sm font-medium transition-colors" style={{ color: '#A8DADC' }} onMouseEnter={handleNavMouseEnter} onMouseLeave={handleNavMouseLeave}>Documentation</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/platform/request-demo" className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors" style={{ color: '#A8DADC', borderColor: '#A8DADC', border: '1px solid' }} onMouseEnter={handleButtonMouseEnter} onMouseLeave={handleButtonMouseLeave}>Request Demo</Link>
          <ThemeToggle />
          <Button variant="outline" asChild className="bg-transparent shadow-lg transition-colors" style={{ borderColor: '#A8DADC', color: '#A8DADC' }} onMouseEnter={handleButtonMouseEnter} onMouseLeave={handleButtonMouseLeave}>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="text-white shadow-lg transition-colors" style={{ background: '#E63946' }} onMouseEnter={handleSignUpMouseEnter} onMouseLeave={handleSignUpMouseLeave}>
            <Link to="/platform/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
});
Header.displayName = 'Header';

const PlatformHomepage = memo(() => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Truly non-blocking auth check - defer to idle time or next frame
  useEffect(() => {
    // Use requestIdleCallback with longer timeout for non-critical auth check
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
      } catch (error) {
        // Silently fail - auth check is non-critical for homepage
        setIsLoggedIn(false);
      }
    };
    
    // Defer auth check to avoid blocking initial render
    // Use longer delay to ensure page renders first
    if ('requestIdleCallback' in window) {
      requestIdleCallback(checkAuth, { timeout: 5000 });
    } else {
      // Fallback: use setTimeout with longer delay
      setTimeout(checkAuth, 100);
    }
  }, []);

  const handleHomeClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoggedIn) {
      try {
        // Don't await - navigate immediately
        supabase.auth.signOut().catch(() => {});
        navigate('/', { replace: true });
      } catch (error) {
        navigate('/', { replace: true });
      }
    } else {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <Header isLoggedIn={isLoggedIn} onHomeClick={handleHomeClick} />

      {/* Hero Section - Render immediately, no animation delays */}
      <section className="relative text-white py-20 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, #457B9D 0%, #1D3557 100%)' }}>
        <div className="absolute inset-0 opacity-30">
          <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 right-0 w-1/2 h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Master Your Projects with the Power of Project Nidus
          </h1>
          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#FFFFFF', opacity: 0.95 }}>
            The only project management tool that guides you through every stage, from Startup to Closure, with structured methodologies.
          </p>
          <div>
            <Button
              size="lg"
              asChild
              className="text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
              style={{ background: '#E63946' }}
            >
              <Link to="/platform/register">
                Start Your Free Project Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar - Simple render, no animations */}
      <section className="bg-white dark:bg-gray-800 py-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stat.value}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Project Nidus?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Empowering you with a structured, methodology-aligned approach to project management for predictable success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureList.map((feature) => (
              <Card key={feature.title} className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-700">
                <div className="p-6 flex gap-6">
                  <div className="flex-shrink-0 w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your Project Journey, Simplified</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Project Nidus guides you through each process group seamlessly.
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            {/* Timeline */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-x-1/2"></div>
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="flex items-center mb-16 relative">
                <div className={`w-[45%] ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 ml-auto order-2'}`}>
                  <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
                  </Card>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 z-10 w-15 h-15 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold border-4 border-white dark:border-gray-900 shadow-lg">
                  {index + 1}
                </div>
                <div className={`w-[45%] ${index % 2 === 0 ? 'ml-auto order-2' : 'pr-8'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Flexible Pricing for Every Team</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Choose the plan that best fits your project management needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => (
              <div key={tier.name}>
                <Card className={`h-full flex flex-col relative ${tier.popular ? 'border-2 border-blue-600 shadow-xl' : 'border-gray-200 dark:border-gray-700'}`}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <div className="p-6 text-center flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold mb-4 mt-2">{tier.name}</h3>
                    <div className="mb-6">
                      <span className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">{tier.price}</span>
                      {tier.period && <span className="text-gray-600 dark:text-gray-400 text-base font-normal ml-1">{tier.period}</span>}
                    </div>
                    <ul className="space-y-3 mb-6 flex-1 text-left">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center text-gray-600 dark:text-gray-400">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={tier.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link to="/platform/register">{tier.cta}</Link>
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="about" className="py-16 md:py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Loved by Project Managers</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Hear what our users say about Project Nidus.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index}>
                <Card className="h-full border-gray-200 dark:border-gray-700">
                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 italic mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.title}, {testimonial.company}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Lazy loaded */}
      <Suspense fallback={<div className="h-64 bg-gray-900" />}>
        <PlatformFooter />
      </Suspense>
    </div>
  );
});

PlatformHomepage.displayName = 'PlatformHomepage';

export default PlatformHomepage;

