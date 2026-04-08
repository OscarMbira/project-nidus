/**
 * Simulator Pricing Page
 *
 * Displays subscription tiers for the Simulator
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Check, X } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '../services/subscriptionService';
import { createCheckoutSession } from '../services/stripeService';
import { simDb } from '../services/supabase/supabaseClient';
import MainHeader from '../components/homepage/MainHeader';
import SimulatorFooter from '../components/homepage/SimulatorFooter';

export default function SimulatorPricing() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [userId, setUserId] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
      if (user?.id) {
        loadSubscription(user.id);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadSubscription = async (userId) => {
    try {
      const { data, error } = await simDb
        .from('simulator_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSubscribe = async (tierId) => {
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const tier = SUBSCRIPTION_TIERS[tierId.toUpperCase()];
      
      if (!tier.priceId) {
        alert('This tier is not available for purchase yet.');
        return;
      }

      const successUrl = `${window.location.origin}/simulator/subscription/success`;
      const cancelUrl = `${window.location.origin}/simulator/pricing`;

      const { url } = await createCheckoutSession(
        tier.priceId,
        userId,
        successUrl,
        cancelUrl
      );

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error starting checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (tierId) => {
    if (!currentSubscription) return false;
    return currentSubscription.plan_type === tierId;
  };

  const tiers = [
    SUBSCRIPTION_TIERS.FREE,
    SUBSCRIPTION_TIERS.BASIC,
    SUBSCRIPTION_TIERS.PROFESSIONAL,
    SUBSCRIPTION_TIERS.LIFETIME,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MainHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className={`text-center mb-12 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-500/20 ${theme === 'dark' ? '' : ''}`}>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Choose Your <span className="text-green-300">Simulator</span> Plan
        </h1>
        <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-2">
          Select the perfect plan for your project management training needs
        </p>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Compare features below and choose the plan that best fits your learning goals
        </p>
      </div>

      {/* Billing Cycle Toggle (for monthly/yearly) */}
      {false && ( // Disabled for now, can enable when yearly pricing is added
        <div className="flex justify-center">
          <div className={`inline-flex rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-400">Save 20%</span>
            </button>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const isCurrent = isCurrentPlan(tier.id);
          const isPopular = tier.id === 'professional';

          return (
            <div
              key={tier.id}
              className={`relative rounded-xl p-6 border-2 transition-all flex flex-col h-full ${
                isPopular
                  ? 'border-blue-500 shadow-lg scale-105'
                  : theme === 'dark'
                  ? 'border-gray-700'
                  : 'border-gray-200'
              } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    ${tier.price}
                  </span>
                  {tier.billingCycle && tier.billingCycle !== 'one_time' && (
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      /{tier.billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                  {tier.billingCycle === 'one_time' && (
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      one-time
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6 flex-grow">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading || isCurrent || tier.price === 0}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrent
                    ? 'bg-gray-500 cursor-not-allowed text-white'
                    : tier.price === 0
                    ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                    : isPopular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {loading
                  ? 'Processing...'
                  : isCurrent
                  ? 'Current Plan'
                  : tier.price === 0
                  ? 'Current Plan'
                  : tier.billingCycle === 'one_time'
                  ? 'Buy Lifetime Access'
                  : 'Subscribe Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className={`rounded-xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} mb-8`}>
        <h2 className="text-2xl font-bold mb-8 text-center">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className="text-left py-4 px-4 font-semibold">Feature</th>
                <th className="text-center py-4 px-4 font-semibold">Free</th>
                <th className="text-center py-4 px-4 font-semibold">Basic</th>
                <th className="text-center py-4 px-4 font-semibold">Professional</th>
                <th className="text-center py-4 px-4 font-semibold">Lifetime</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <tr>
                <td className="py-4 px-4">Beginner Scenarios</td>
                <td className="text-center py-4 px-4">5</td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4">Intermediate Scenarios</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4">Expert Scenarios</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
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
                <td className="py-4 px-4">Advanced AI Feedback</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-4 px-4">Custom Scenarios</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
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
                <td className="py-4 px-4">Certificates</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4">Basic</td>
                <td className="text-center py-4 px-4">All (Discounted)</td>
                <td className="text-center py-4 px-4">All (Discounted)</td>
              </tr>
              <tr>
                <td className="py-4 px-4">Priority Support</td>
                <td className="text-center py-4 px-4">
                  <X className="h-5 w-5 text-red-500 mx-auto" />
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
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={`rounded-xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What happens after I cancel?</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              You'll retain access to all features until your current billing period ends. After that, you'll be moved to the Free plan.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I upgrade or downgrade?</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is there a refund policy?</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              We offer a 30-day money-back guarantee for all new subscriptions. Lifetime purchases are final but include all future updates.
            </p>
          </div>
        </div>
      </div>
      </div>
      <SimulatorFooter />
    </div>
  );
}

