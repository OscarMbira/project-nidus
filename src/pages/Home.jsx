import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Zap, 
  BarChartBig, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Settings2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  ArrowRight,
  Moon,
  Sun,
  Youtube
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useThemeContext } from '../context/ThemeContext'

const featureList = [
  {
    icon: <Settings2 className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Structured Processes',
    description: 'Follow Structured PM methodology for consistent project delivery, from startup to closure.',
  },
  {
    icon: <BarChartBig className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Role-Based Dashboards',
    description: 'Customized views for Project Managers, Team Members, and Stakeholders.',
  },
  {
    icon: <CheckCircle className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Automated Reporting',
    description: 'Generate insightful reports and analytics with ease, tracking progress and performance.',
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Risk Management',
    description: 'Identify, assess, and manage project risks proactively within the platform.',
  },
  {
    icon: <Users className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Quality Management',
    description: 'Ensure your deliverables meet the required standards with integrated quality checks.',
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />,
    title: 'Communication Hub',
    description: 'Centralize project communication, keeping everyone informed and aligned.',
  },
]

const howItWorksSteps = [
  { title: 'Start Up a Project', description: 'Define objectives and create the project brief effortlessly.' },
  { title: 'Initiate and Plan', description: 'Develop detailed plans, assign roles, and set up controls.' },
  { title: 'Manage Stage by Stage', description: 'Monitor progress, manage issues, and control stage boundaries.' },
  { title: 'Deliver and Close', description: 'Finalize deliverables, evaluate performance, and formally close the project.' },
]

const pricingTiers = [
  { name: 'Free', price: '$0', features: ['1 Project', 'Basic Task Management', 'Community Support'], cta: 'Get Started' },
  { name: 'Basic', price: '$19', user: '/month', features: ['5 Projects', 'Advanced Task Tracking', 'Email Support', 'Basic Reporting'], cta: 'Get Started' },
  { name: 'Professional', price: '$49', user: '/month', features: ['Unlimited Projects', 'Full Project Workflow', 'Advanced Reporting', 'Risk Management', 'Priority Support'], cta: 'Get Started', popular: true },
  { name: 'Enterprise', price: 'Custom', features: ['All Professional Features', 'Dedicated Account Manager', 'Custom Integrations', 'SLA', 'On-premise Option'], cta: 'Contact Sales' },
]

const testimonials = [
  { quote: "Project Nidus transformed how we manage complex projects. The Structured PM structure is invaluable.", name: "Jane Doe", title: "Project Director", company: "Innovatech Solutions" },
  { quote: "The automated reporting saves us hours each week. Highly recommended!", name: "John Smith", title: "Operations Manager", company: "Global Corp" },
  { quote: "Finally, a tool that truly understands project management methodologies.", name: "Alice Brown", title: "Lead Consultant", company: "Strategy Hub" },
]

const Home = () => {
  const { theme, toggleTheme } = useThemeContext()

  // Ensure homepage starts in dark mode by default
  useEffect(() => {
    if (theme !== 'dark') {
      toggleTheme()
    }
    // we intentionally run only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Resources', href: '#resources' },
    { label: 'About', href: '#about' },
  ]
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold">Project Nidus</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </a>
            ))}
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Request a Demo
            </Button>
          </nav>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <Button variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Sign Up</Link>
            </Button>
            <Button variant="default" className="hidden lg:inline-flex">Contact</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        id="hero" 
        className="relative py-20 md:py-32 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <div className="absolute inset-0 opacity-10">
          <img 
            alt="Abstract dashboard graphic" 
            className="w-full h-full object-cover" 
            src="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d" 
          />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Master Your Projects with the Power of Project Nidus
            <span className="text-blue-500"> (Nest)</span>.
          </motion.h1>
          <motion.p 
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            The only project management tool that guides you through every stage, from Startup to Closure, powered by project methodology.
          </motion.p>
          <motion.div 
            className="mt-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button 
              size="lg" 
              asChild 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transform hover:scale-105 transition-transform duration-200"
            >
              <Link to="/register">
                Start Your Free Project Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features" 
        className="py-16 md:py-24 bg-gray-100 dark:bg-gray-800"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Why Project Nidus?</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Empowering you with a structured, project-aligned approach to project management for predictable success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureList.map((feature, index) => (
              <motion.div 
                key={feature.title}
                custom={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
                  <Card.Header>
                    {feature.icon}
                    <Card.Title className="text-xl font-semibold text-gray-900 dark:text-white">{feature.title}</Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
                  </Card.Content>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How it Works / Journey Section */}
      <motion.section 
        id="about" 
        className="py-16 md:py-24 bg-white dark:bg-gray-900"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Your Project Journey, Simplified</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Project Nidus guides you through each project process group seamlessly.
            </p>
          </div>
          <div className="relative">
            {/* Desktop Timeline */}
            <div className="hidden md:block border-l-2 border-blue-600 absolute h-full top-0 left-1/2 transform -translate-x-1/2"></div>
            <div className="space-y-12 md:space-y-0">
              {howItWorksSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="md:flex items-center w-full"
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <div className={`md:w-1/2 ${index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left md:order-2'}`}>
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mb-2 md:mx-auto md:float-none float-left">
                      {index + 1}
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>
                  <div className="md:w-1/2 hidden md:block">
                    <div className={`w-10 h-10 rounded-full bg-blue-600 mx-auto ${index % 2 === 0 ? 'md:ml-auto md:mr-[-20px]' : 'md:mr-auto md:ml-[-20px]'}`}></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section 
        id="pricing" 
        className="py-16 md:py-24 bg-gray-100 dark:bg-gray-800"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Flexible Pricing for Every Team</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Choose the plan that best fits your project management needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                custom={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className={`h-full flex flex-col ${tier.popular ? 'border-blue-600 border-2 shadow-2xl transform scale-105' : ''}`}>
                  {tier.popular && <div className="bg-blue-600 text-center text-sm font-semibold py-1 text-white rounded-t-lg">Most Popular</div>}
                  <Card.Header className="text-center">
                    <Card.Title className="text-2xl font-bold text-gray-900 dark:text-white">{tier.name}</Card.Title>
                    <Card.Description className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                      {tier.price}
                      {tier.user && <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{tier.user}</span>}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content className="flex-grow">
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </Card.Content>
                  <div className="p-6 pt-0">
                    <Button className="w-full" variant={tier.popular ? 'default' : 'outline'}>
                      {tier.cta}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials / Resources Section */}
      <motion.section 
        id="resources" 
        className="py-16 md:py-24 bg-white dark:bg-gray-900"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Loved by Project Managers</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Hear what our users say about Project Nidus.
          </p>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                custom={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
              >
                <Card className="bg-gray-100 dark:bg-gray-800 h-full flex flex-col">
                  <Card.Content className="pt-6 flex-grow">
                    <p className="text-gray-600 dark:text-gray-400 italic">"{testimonial.quote}"</p>
                  </Card.Content>
                  <Card.Footer className="flex flex-col items-start border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.title}, {testimonial.company}</p>
                  </Card.Footer>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-green-600 dark:bg-green-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: Logo and Social */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white">H</div>
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white -ml-2">I</div>
                </div>
                <div>
                  <span className="text-blue-300 font-semibold">Project</span>
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold"> Nidus</span>
                </div>
              </div>
              <p className="text-green-100 text-sm mb-6">
                Empowering Aspiring and Practicing Project Managers (PM) Succeed
              </p>
              <div className="flex space-x-4">
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-red-400 transition-colors">
                  <span className="sr-only">YouTube</span>
                  <Youtube className="h-5 w-5" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 transition-colors">
                  <span className="sr-only">Facebook</span>
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Column 2: Services */}
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-lg mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-green-100">
                <li><a href="#" className="hover:text-white transition-colors">Consulting Services</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training and Workshops</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mentorship and Coaching</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Content Creation and Educational Resources</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Project Audit and Review</a></li>
              </ul>
            </div>

            {/* Column 3: Project Management Topics (Blog Links) */}
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-lg mb-4">Project Management Topics</h3>
              <ul className="space-y-2 text-sm text-green-100">
                <li><Link to="/blog/project-start-up" className="hover:text-white transition-colors">Project Start-Up</Link></li>
                <li><Link to="/blog/project-initiation" className="hover:text-white transition-colors">Project Initiation</Link></li>
                <li><Link to="/blog/controlling-a-stage" className="hover:text-white transition-colors">Controlling a Stage</Link></li>
                <li><Link to="/blog/planning-and-scheduling" className="hover:text-white transition-colors">Planning and Scheduling</Link></li>
                <li><Link to="/blog/managing-risk" className="hover:text-white transition-colors">Managing Risk</Link></li>
                <li><Link to="/blog/quality-and-change" className="hover:text-white transition-colors">Quality & Change</Link></li>
                <li><Link to="/blog/project-closure" className="hover:text-white transition-colors">Project Closure</Link></li>
                <li><Link to="/blog/project-management-basics" className="hover:text-white transition-colors">Project Management Basics</Link></li>
              </ul>
            </div>

            {/* Column 4: Stay Connected */}
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-lg mb-4">Stay Connected</h3>
              <ul className="space-y-3 text-sm text-green-100">
                <li>
                  <a href="https://youtube.com/@oscarnmbira" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                    <Youtube className="h-5 w-5 flex-shrink-0" />
                    <span>YouTube</span>
                  </a>
                </li>
                <li>
                  <a href="https://twitter.com/nmbira" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                    <Twitter className="h-5 w-5 flex-shrink-0" />
                    <span>Twitter - X</span>
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                    <Linkedin className="h-5 w-5 flex-shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                </li>
                <li>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                    <Facebook className="h-5 w-5 flex-shrink-0" />
                    <span>Facebook</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="bg-black dark:bg-gray-900 py-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-white text-sm">
              Copyright &copy; {new Date().getFullYear()} - Project Management Nidus
          </p>
        </div>
      </div>
      </footer>
    </div>
  )
}

export default Home
