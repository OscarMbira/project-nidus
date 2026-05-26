import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Target,
  RefreshCw,
  TrendingUp,
  Users,
  Shield,
  BookOpen,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ThemeToggle';
import SimulatorFooter from '../components/homepage/SimulatorFooter';
import { supabase } from '../services/supabaseClient';

const learningPathSteps = [
  { 
    number: 1,
    title: 'Choose Your Role',
    description: 'Select from Programme Manager, Project Manager, Team Lead, or Team Member to practice role-specific scenarios.'
  },
  { 
    number: 2,
    title: 'Start Simulation',
    description: 'Launch a realistic project scenario and begin making decisions in a safe, controlled environment.'
  },
  { 
    number: 3,
    title: 'Make Decisions',
    description: 'Navigate through challenges, manage risks, and handle issues as they arise in your simulated project.'
  },
  { 
    number: 4,
    title: 'Learn & Improve',
    description: 'Review outcomes, understand consequences, and refine your approach with detailed feedback and analytics.'
  },
];

const features = [
  {
    icon: <Target className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: 'Realistic Scenarios',
    description: 'Experience authentic project challenges based on real-world situations and industry best practices.',
  },
  {
    icon: <RefreshCw className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: 'Iterative Practice',
    description: 'Try different strategies, see immediate results, and learn from every decision you make.',
  },
  {
    icon: <TrendingUp className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: 'Performance Analytics',
    description: 'Track your progress with comprehensive metrics and insights into your decision-making patterns.',
  },
  {
    icon: <Users className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: '4 Roles Supported',
    description: 'Practice as Programme Manager, Project Manager, Team Lead, or Team Member with role-specific challenges.',
  },
  {
    icon: <Shield className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: 'Safe Environment',
    description: 'Make mistakes and experiment freely without any risk to real projects or deadlines.',
  },
  {
    icon: <BookOpen className="h-14 w-14 text-green-600 dark:text-green-400" />,
    title: 'End-to-End Lifecycle',
    description: 'Experience the complete project journey from Mandate through Startup, Initiation, Planning, Delivery, to Closure.',
  },
];

const stats = [
  { value: '4', label: 'Roles Supported' },
  { value: '100+', label: 'Scenarios Available' },
  { value: '50K+', label: 'Simulations Completed' },
  { value: '95%', label: 'User Satisfaction' },
];

const pricingTiers = [
  { 
    name: 'Starter', 
    price: '$0', 
    features: ['5 Simulations/month', 'Basic Scenarios', 'Community Support'], 
    cta: 'Get Started' 
  },
  { 
    name: 'Professional', 
    price: '$29', 
    period: '/month', 
    features: ['Unlimited Simulations', 'All Scenarios', 'Advanced Analytics', 'Progress Tracking', 'Priority Support'], 
    cta: 'Get Started', 
    popular: true 
  },
  { 
    name: 'Enterprise', 
    price: 'Custom', 
    features: ['All Professional Features', 'Custom Scenarios', 'Team Training', 'Dedicated Support', 'On-premise Option'], 
    cta: 'Contact Sales' 
  },
];

const testimonials = [
  { 
    quote: "The simulator helped me practice difficult scenarios without risking real projects. Game changer!", 
    name: "Sarah Johnson", 
    title: "Senior Project Manager", 
    company: "TechCorp" 
  },
  { 
    quote: "Best training tool I've used. The realistic scenarios prepare you for anything.", 
    name: "Michael Chen", 
    title: "Programme Director", 
    company: "Global Solutions" 
  },
  { 
    quote: "Our team's confidence improved dramatically after using the simulator. Highly recommended!", 
    name: "Emma Williams", 
    title: "Team Lead", 
    company: "Innovation Labs" 
  },
];

const SimulatorHomepage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const handleHomeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoggedIn) {
      // Logout and redirect to NidusHomepage
      try {
        await supabase.auth.signOut();
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Logout error:', error);
        navigate('/', { replace: true });
      }
    } else {
      // Not logged in, redirect to NidusHomepage
      navigate('/', { replace: true });
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      {/* Header - Always dark theme with green gradient, not affected by theme toggle */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-900 via-emerald-800 to-teal-900 shadow-md border-b border-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-green-300" />
            <div className="flex flex-col">
              <span className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Project
                </span>
                <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-1">
                  Nidus
                </span>
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-green-300 mt-0.5">Simulator</span>
                <div className="h-0.5 bg-green-400 mt-0.5"></div>
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <button
              type="button"
              onClick={handleHomeClick}
              className="text-sm font-medium text-green-200 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Home
            </button>
            <Link
              to="/simulator/features"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              to="/simulator/blog"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              to="/simulator/resources"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Resources
            </Link>
            <Link
              to="/simulator/pricing"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/documentation/simulator"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Documentation
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/simulator/request-demo"
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-200 hover:text-white transition-colors border border-green-400/50 hover:bg-green-800/50 hover:border-green-300 rounded-md"
            >
              Request Demo
            </Link>
            <ThemeToggle />
            <Button variant="outline" asChild className="bg-transparent border-green-400/50 text-green-200 hover:bg-green-800/50 hover:border-green-300">
              <Link to="/simulator/login">Log in</Link>
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-500 text-white shadow-lg">
              <Link to="/simulator/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-200 dark:bg-green-900/20 rounded-full blur-3xl opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full text-green-700 dark:text-green-400 text-sm font-semibold mb-6">
                  Now | Project Management Simulator included
                </span>
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Turn Every Project Manager into a Safe-to-Fail{' '}
                <span className="text-green-600 dark:text-green-400">Project Pilot</span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Project Nidus combines a powerful project management workspace with a flight simulator-style training mode. Plan real projects, simulate risks and issues, and practice decisions from startup to closure without breaking production.
              </motion.p>
              <motion.div
                className="flex gap-4 flex-wrap"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button size="lg" asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <Link to="/simulator">Start free simulation</Link>
                </Button>
                <Button size="lg" asChild className="bg-emerald-700 hover:bg-emerald-600 text-white shadow-md">
                  <Link to="/simulator/run/setup">NPC live simulation (v505)</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                  <Link to="/simulator/tutorial">
                    Watch how it works <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
            <div>
              <Card className="p-6 shadow-2xl border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">Simulation workstation - Demo scenario</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full text-green-700 dark:text-green-400 text-xs font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live preview
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Programme Manager</div>
                    <div className="h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg"></div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Project Manager</div>
                    <div className="flex items-center justify-center h-16">
                      <div className="w-16 h-16 rounded-full border-8 border-green-500 border-t-transparent flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">78%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Team Lead</div>
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-[82%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg"></div>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300">82%</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">On Track</div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-green-500"></div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full w-3/5 bg-blue-500"></div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full w-[90%] bg-amber-500"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Path Section */}
      <motion.section
        id="how-it-works"
        className="py-16 md:py-24 bg-white dark:bg-gray-900"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Your Learning Journey</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Master project management through structured, hands-on simulation experiences.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {learningPathSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500">
                  <div className="p-6">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        id="features"
        className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to become a confident project manager.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500">
                  <div className="p-6">
                    <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-br from-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <h3 className="text-5xl font-extrabold mb-2">{stat.value}</h3>
                <p className="text-green-100 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <motion.section
        id="pricing"
        className="py-16 md:py-24 bg-white dark:bg-gray-900"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Simulator Pricing Plans</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Choose the plan that fits your training needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className={`h-full flex flex-col relative ${tier.popular ? 'border-2 border-green-600 shadow-xl' : 'border-gray-200 dark:border-gray-700'}`}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <div className="p-6 text-center flex-1 flex flex-col mt-2">
                    <h3 className="text-2xl font-bold mb-4">{tier.name}</h3>
                    <div className="mb-6">
                      <span className="text-5xl font-extrabold text-green-600 dark:text-green-400">{tier.price}</span>
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
                      className={`w-full ${tier.popular ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                      variant={tier.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link to="/simulator/register">{tier.cta}</Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        id="about"
        className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Loved by Project Managers</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Hear what our users say about the Simulator.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
              >
                <Card className="h-full border-gray-200 dark:border-gray-700">
                  <div className="p-6">                    <p className="text-gray-600 dark:text-gray-400 italic mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.title}, {testimonial.company}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <SimulatorFooter />
    </div>
  );
};

export default SimulatorHomepage;

