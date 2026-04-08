/**
 * Platform Pricing Page
 *
 * Displays subscription tiers for the Platform
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Zap,
  Star,
  Crown,
  Users,
  FolderKanban,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PLATFORM_SUBSCRIPTION_TIERS, getActivePlatformSubscription } from '../services/platformSubscriptionService';
import { useToast } from '../hooks/useToast';
import MainHeader from '../components/homepage/MainHeader';
import PlatformFooter from '../components/homepage/PlatformFooter';

export default function PlatformPricing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadCurrentSubscription();
  }, []);

  const loadCurrentSubscription = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        const subscription = await getActivePlatformSubscription(currentUser.id);
        setCurrentSubscription(subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId) => {
    if (!user) {
      navigate('/register');
      return;
    }

    // Navigate to checkout or show coming soon
    showToast('info', 'Stripe checkout integration coming soon!');

    // TODO: Implement Stripe checkout
    // const checkoutUrl = await createCheckoutSession(user.id, planId, billingCycle);
    // window.location.href = checkoutUrl;
  };

  const isCurrentPlan = (planId) => {
    if (!currentSubscription) return false;
    return currentSubscription.plan_type === planId;
  };

  const getPlanPrice = (tier) => {
    if (tier.id === 'free') return 'Free';
    if (tier.billingCycle === 'one_time') return `$${tier.price}`;

    if (billingCycle === 'yearly' && tier.yearlyPriceId) {
      const yearlyPrice = tier.price * 12 * 0.8; // 20% discount
      return `$${yearlyPrice.toFixed(2)}/year`;
    }

    return `$${tier.price}/month`;
  };

  const getSavingsText = (tier) => {
    if (billingCycle === 'yearly' && tier.yearlyPriceId) {
      const monthlyCost = tier.price * 12;
      const yearlyCost = monthlyCost * 0.8;
      const savings = monthlyCost - yearlyCost;
      return `Save $${savings.toFixed(2)}/year`;
    }
    return null;
  };

  const tiers = [
    {
      ...PLATFORM_SUBSCRIPTION_TIERS.FREE,
      icon: Zap,
      color: 'gray',
      popular: false,
    },
    {
      ...PLATFORM_SUBSCRIPTION_TIERS.STARTER,
      icon: Star,
      color: 'blue',
      popular: true,
    },
    {
      ...PLATFORM_SUBSCRIPTION_TIERS.PROFESSIONAL,
      icon: Crown,
      color: 'purple',
      popular: false,
    },
  ];

  const lifetimeTiers = [
    {
      ...PLATFORM_SUBSCRIPTION_TIERS.LIFETIME_STARTER,
      icon: Star,
      color: 'blue',
    },
    {
      ...PLATFORM_SUBSCRIPTION_TIERS.LIFETIME_PROFESSIONAL,
      icon: Crown,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MainHeader />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-500/20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your <span className="text-blue-300">Platform</span> Plan
          </h1>
          <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-2">
            Select the perfect plan for your team's project management needs
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Compare features below and choose the plan that best fits your requirements
          </p>
        </div>

        {/* Billing Toggle */}
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

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = isCurrentPlan(tier.id);

            return (
              <div
                key={tier.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 flex flex-col h-full ${
                  tier.popular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-8 flex flex-col h-full">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg bg-${tier.color}-100 dark:bg-${tier.color}-900/30 flex items-center justify-center mb-4`}
                  >
                    <Icon className={`h-6 w-6 text-${tier.color}-600 dark:text-${tier.color}-400`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {getPlanPrice(tier)}
                    </span>
                    {getSavingsText(tier) && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {getSavingsText(tier)}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(tier.id)}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        tier.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {user ? 'Upgrade Now' : 'Get Started'}
                      <ArrowRight className="inline-block ml-2 h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lifetime Options */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Lifetime Access
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Pay once, use forever. No recurring fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {lifetimeTiers.map((tier) => {
              const Icon = tier.icon;
              const isCurrent = isCurrentPlan(tier.id);

              return (
                <div
                  key={tier.id}
                  className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800 flex flex-col h-full"
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    <Sparkles className="inline-block h-3 w-3 mr-1" />
                    LIFETIME
                  </div>

                  <div className="p-8 flex flex-col h-full">
                    <div
                      className={`w-12 h-12 rounded-lg bg-${tier.color}-100 dark:bg-${tier.color}-900/30 flex items-center justify-center mb-4`}
                    >
                      <Icon className={`h-6 w-6 text-${tier.color}-600 dark:text-${tier.color}-400`} />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${tier.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">one-time</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(tier.id)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
                      >
                        Get Lifetime Access
                        <ArrowRight className="inline-block ml-2 h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-900 dark:text-white font-semibold">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-gray-900 dark:text-white font-semibold">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 text-gray-900 dark:text-white font-semibold">
                    Starter
                  </th>
                  <th className="text-center py-4 px-4 text-gray-900 dark:text-white font-semibold">
                    Professional
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                    <FolderKanban className="inline-block h-4 w-4 mr-2" />
                    Projects
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">1</td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">10</td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">
                    Unlimited
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                    <Users className="inline-block h-4 w-4 mr-2" />
                    Team Members
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">5</td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">20</td>
                  <td className="text-center py-4 px-4 text-gray-700 dark:text-gray-300">100</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                    <TrendingUp className="inline-block h-4 w-4 mr-2" />
                    Advanced Analytics
                  </td>
                  <td className="text-center py-4 px-4">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                    <Shield className="inline-block h-4 w-4 mr-2" />
                    API Access
                  </td>
                  <td className="text-center py-4 px-4">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Need help choosing? <a href="/contact" className="text-blue-600 hover:underline">Contact us</a> or{' '}
            <a href="/simulator/pricing" className="text-blue-600 hover:underline">
              View Simulator Pricing
            </a>
          </p>
        </div>
      </div>
      </div>
      <PlatformFooter />
    </div>
  );
}
