/**
 * Bundle Pricing Page
 *
 * Displays bundle subscription options for PM + Simulator
 * Highlights savings when subscribing to both platforms
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Briefcase,
  Gamepad2,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Gift,
  Star,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getSubscriptionSummary } from '../services/unifiedSubscriptionService';
import { useToast } from '../hooks/useToast';

export default function BundlePricing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        const subscriptionSummary = await getSubscriptionSummary(currentUser.id);
        setSummary(subscriptionSummary);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const bundlePlans = [
    {
      id: 'starter_bundle',
      name: 'Starter Bundle',
      pmPlan: 'Starter',
      simPlan: 'Basic',
      monthlyPrice: 24.99,
      yearlyPrice: 239.9,
      regularMonthly: 29.98,
      regularYearly: 287.8,
      savingsMonthly: 4.99,
      savingsYearly: 47.9,
      icon: Star,
      color: 'blue',
      popular: true,
      features: [
        '10 PM projects',
        '20 team members',
        'All beginner & intermediate scenarios',
        '50 simulations/month',
        'Advanced PM analytics',
        'Simulator progress tracking',
        'Email support',
      ],
    },
    {
      id: 'professional_bundle',
      name: 'Professional Bundle',
      pmPlan: 'Professional',
      simPlan: 'Professional',
      monthlyPrice: 69.99,
      yearlyPrice: 671.9,
      regularMonthly: 79.98,
      regularYearly: 767.8,
      savingsMonthly: 9.99,
      savingsYearly: 95.9,
      icon: TrendingUp,
      color: 'purple',
      popular: false,
      features: [
        'Unlimited PM projects',
        '100 team members',
        'All simulator scenarios',
        'Unlimited simulations',
        'Full PM analytics & reporting',
        'Custom scenarios',
        'API access',
        'Priority support',
      ],
    },
    {
      id: 'lifetime_bundle',
      name: 'Lifetime Bundle',
      pmPlan: 'Lifetime Professional',
      simPlan: 'Lifetime Professional',
      lifetimePrice: 1099,
      regularPrice: 1299.98,
      savings: 199.99,
      icon: Sparkles,
      color: 'gold',
      popular: false,
      isLifetime: true,
      features: [
        'Lifetime access to both platforms',
        'All Professional features',
        'All future updates included',
        'No recurring fees ever',
        'Priority support forever',
        'Best long-term value',
      ],
    },
  ];

  const handleSelectBundle = async (bundleId) => {
    if (!user) {
      navigate('/register');
      return;
    }

    // Navigate to checkout
    showToast('info', 'Stripe checkout integration coming soon!');

    // TODO: Implement Stripe checkout
    // const checkoutUrl = await createBundleCheckoutSession(user.id, bundleId, billingCycle);
    // window.location.href = checkoutUrl;
  };

  const hasBundle = () => {
    if (!summary) return false;
    const hasPM = summary.registeredPlatforms?.includes('pm');
    const hasSim = summary.registeredPlatforms?.includes('simulator');
    return hasPM && hasSim;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Bundle & Save
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get both Platform and Simulator together and save up to $200/year
          </p>
        </div>

        {/* Value Proposition */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                  <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Platform</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage real projects
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Full project lifecycle management
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Team collaboration tools
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Advanced analytics
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
                  <Gamepad2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Simulator</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Practice PM skills
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Interactive simulations
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  AI-driven challenges
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Progress tracking
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Billing Toggle (for non-lifetime plans) */}
        <div className="flex justify-center mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 inline-flex shadow">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Bundle Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {bundlePlans.map((bundle) => {
            const Icon = bundle.icon;
            const price = bundle.isLifetime
              ? bundle.lifetimePrice
              : billingCycle === 'yearly'
              ? bundle.yearlyPrice
              : bundle.monthlyPrice;

            const regularPrice = bundle.isLifetime
              ? bundle.regularPrice
              : billingCycle === 'yearly'
              ? bundle.regularYearly
              : bundle.regularMonthly;

            const savings = bundle.isLifetime
              ? bundle.savings
              : billingCycle === 'yearly'
              ? bundle.savingsYearly
              : bundle.savingsMonthly;

            return (
              <div
                key={bundle.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                  bundle.popular ? 'ring-2 ring-blue-600' : ''
                } ${bundle.isLifetime ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10' : ''}`}
              >
                {bundle.popular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    BEST VALUE
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg bg-${bundle.color}-100 dark:bg-${bundle.color}-900/30 flex items-center justify-center mb-4`}
                  >
                    <Icon
                      className={`h-6 w-6 text-${bundle.color}-600 dark:text-${bundle.color}-400`}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {bundle.name}
                  </h3>

                  {/* Included Plans */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {bundle.pmPlan} + {bundle.simPlan}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        {bundle.isLifetime
                          ? 'one-time'
                          : billingCycle === 'yearly'
                          ? '/year'
                          : '/month'}
                      </span>
                    </div>

                    {/* Savings */}
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                        ${regularPrice}
                      </span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Save ${savings}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {bundle.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {hasBundle() ? (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      Already Subscribed
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectBundle(bundle.id)}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                        bundle.popular || bundle.isLifetime
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {user ? 'Get Bundle' : 'Get Started'}
                      <ArrowRight className="inline-block ml-2 h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison with Individual Plans */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Why Bundle?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Individual Plans */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Separate Subscriptions
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">PM Professional</span>
                  <span className="font-semibold">$49.99/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Simulator Pro</span>
                  <span className="font-semibold">$29.99/mo</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-gray-900 dark:text-white">$79.98/mo</span>
                </div>
              </div>
            </div>

            {/* Bundle */}
            <div className="border-2 border-green-500 dark:border-green-600 rounded-xl p-6 bg-green-50 dark:bg-green-900/10">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Professional Bundle
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">PM Professional</span>
                  <span className="text-gray-500 dark:text-gray-400">Included</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Simulator Pro</span>
                  <span className="text-gray-500 dark:text-gray-400">Included</span>
                </div>
                <div className="border-t border-green-200 dark:border-green-700 pt-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-900 dark:text-white">Bundle Price</span>
                    <span className="font-bold text-green-600 dark:text-green-400">$69.99/mo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      You Save
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      $9.99/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ/Help */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Not sure which bundle is right for you?
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              View PM Pricing
            </button>
            <button
              onClick={() => navigate('/simulator/pricing')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              View Simulator Pricing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
