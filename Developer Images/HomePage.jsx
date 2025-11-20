import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Zap, BarChartBig, CheckCircle, ShieldCheck, Users, MessageSquare, Settings2, Facebook, Twitter, Linkedin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const featureList = [
  {
    icon: <Settings2 className="h-10 w-10 text-primary mb-4" />,
    title: 'Structured Processes',
    description: 'Follow PRINCE2 methodology for consistent project delivery, from startup to closure.',
  },
  {
    icon: <BarChartBig className="h-10 w-10 text-primary mb-4" />,
    title: 'Role-Based Dashboards',
    description: 'Customized views for Project Managers, Team Members, and Stakeholders.',
  },
  {
    icon: <CheckCircle className="h-10 w-10 text-primary mb-4" />,
    title: 'Automated Reporting',
    description: 'Generate insightful reports and analytics with ease, tracking progress and performance.',
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary mb-4" />,
    title: 'Risk Management',
    description: 'Identify, assess, and manage project risks proactively within the platform.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary mb-4" />,
    title: 'Quality Management',
    description: 'Ensure your deliverables meet the required standards with integrated quality checks.',
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-primary mb-4" />,
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
  { name: 'Basic', price: '$19', user: '/month', features: ['5 Projects', 'Advanced Task Tracking', 'Email Support', 'Basic Reporting'], cta: 'Get Started' },
  { name: 'Professional', price: '$49', user: '/month', features: ['Unlimited Projects', 'Full PRINCE2 Workflow', 'Advanced Reporting', 'Risk Management', 'Priority Support'], cta: 'Get Started', popular: true },
  { name: 'Enterprise', price: 'Custom', features: ['All Professional Features', 'Dedicated Account Manager', 'Custom Integrations', 'SLA', 'On-premise Option'], cta: 'Contact Sales' },
];

const testimonials = [
  { quote: "Project Nidus transformed how we manage complex projects. The PRINCE2 structure is invaluable.", name: "Jane Doe", title: "Project Director", company: "Innovatech Solutions" },
  { quote: "The automated reporting saves us hours each week. Highly recommended!", name: "John Smith", title: "Operations Manager", company: "Global Corp" },
  { quote: "Finally, a tool that truly understands project management methodologies.", name: "Alice Brown", title: "Lead Consultant", company: "Strategy Hub" },
];

const HomePage = () => {
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Project Nidus</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {['Features', 'Pricing', 'Resources', 'About'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {item}
              </a>
            ))}
             <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-primary">Request a Demo</Button>
          </nav>
          <div className="flex items-center space-x-3">
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
        className="relative py-20 md:py-32 bg-gradient-to-br from-slate-900 via-background to-slate-800 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <div className="absolute inset-0 opacity-10">
          {/* Placeholder for abstract graphic or video loop */}
          <img  alt="Abstract dashboard graphic" class="w-full h-full object-cover" src="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-indigo-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Master Your Projects with the Power of Project Nidus
            <span className="text-primary"> (Nest)</span>.
          </motion.h1>
          <motion.p 
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            The only project management tool that guides you through every stage, from Startup to Closure, powered by PRINCE2.
          </motion.p>
          <motion.div 
            className="mt-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-lg transform hover:scale-105 transition-transform duration-200">
              <Link to="/register">Start Your Free Project Today <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features" 
        className="py-16 md:py-24 bg-secondary"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Why Project Nidus?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Empowering you with a structured, PRINCE2-aligned approach to project management for predictable success.
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
                <Card className="h-full bg-card hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
                  <CardHeader>
                    {feature.icon}
                    <CardTitle className="text-xl font-semibold text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How it Works Section */}
      <motion.section 
        id="how-it-works" 
        className="py-16 md:py-24 bg-background"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Your PRINCE2 Journey, Simplified</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Project Nidus guides you through each PRINCE2 process group seamlessly.
            </p>
          </div>
          <div className="relative">
            {/* Desktop Timeline */}
            <div className="hidden md:block border-l-2 border-primary absolute h-full top-0 left-1/2 transform -translate-x-1/2"></div>
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
                    <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mb-2 md:mx-auto md:float-none float-left">
                      {index + 1}
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="md:w-1/2 hidden md:block">
                    <div className={`w-10 h-10 rounded-full bg-primary mx-auto ${index % 2 === 0 ? 'md:ml-auto md:mr-[-20px]' : 'md:mr-auto md:ml-[-20px]'}`}></div>
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
        className="py-16 md:py-24 bg-secondary"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Flexible Pricing for Every Team</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
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
                <Card className={`h-full flex flex-col ${tier.popular ? 'border-primary border-2 shadow-2xl transform scale-105' : 'bg-card'}`}>
                  {tier.popular && <div className="bg-primary text-center text-sm font-semibold py-1 text-primary-foreground rounded-t-md">Most Popular</div>}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-foreground">{tier.name}</CardTitle>
                    <CardDescription className="text-4xl font-extrabold text-primary mt-2">
                      {tier.price}
                      {tier.user && <span className="text-sm font-normal text-muted-foreground">{tier.user}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
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

      {/* Testimonials Section */}
      <motion.section 
        id="about" 
        className="py-16 md:py-24 bg-background"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Loved by Project Managers</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
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
                <Card className="bg-secondary h-full flex flex-col">
                  <CardContent className="pt-6 flex-grow">
                    <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start border-t pt-4 mt-4">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}, {testimonial.company}</p>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center space-x-6 md:order-2">
              <Link to="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </Link>
              <Link to="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </Link>
              <Link to="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" />
              </Link>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Project Nidus. All rights reserved.
              </p>
              <nav className="flex justify-center space-x-4 mt-2 text-sm">
                <Link to="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;