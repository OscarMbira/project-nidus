/**
 * Simulator Pricing Page
 *
 * Displays subscription tiers for the Simulator
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@nidus/shared/context/ThemeContext';
import { Check, X, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '../services/stripeService';
import { simDb } from '@nidus/supabase';
import {
  buildSimulatorPreviewPlans,
  buildPricingComparisonRows,
  formatPreviewPrice,
} from '@nidus/shared/services/subscriptionPreviewCatalog';
import {
  fetchPricingCatalogBundle,
  findCatalogPlanRow,
} from '@nidus/shared/services/subscriptionPlanCatalogService';
import MainHeader from '../components/homepage/MainHeader';
import SimulatorFooter from '../components/homepage/SimulatorFooter';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';

export default function SimulatorPricing() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [dbPlans, setDbPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [userId, setUserId] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const loadPricingData = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const { plans } = await fetchPricingCatalogBundle('simulator');
      setDbPlans(plans);
    } catch (error) {
      console.error('Error loading subscription catalog:', error);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricingData();
  }, [loadPricingData]);

  const plans = useMemo(
    () => buildSimulatorPreviewPlans(dbPlans),
    [dbPlans],
  );

  const comparisonRows = useMemo(() => buildPricingComparisonRows(plans), [plans]);

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

  const handleSubscribe = async (planType) => {
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setCheckoutLoading(true);
      const cycle = planType === 'lifetime' ? 'lifetime' : billingCycle;
      const row = findCatalogPlanRow(dbPlans, planType, 'simulator', cycle);
      const priceId = row?.stripe_price_id;

      if (!priceId) {
        alert('This tier is not available for purchase yet.');
        return;
      }

      const successUrl = `${window.location.origin}/simulator/subscription/success`;
      const cancelUrl = `${window.location.origin}/simulator/pricing`;

      const { url } = await createCheckoutSession(
        priceId,
        userId,
        successUrl,
        cancelUrl,
      );

      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error starting checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isCurrentPlan = (planType) => {
    if (!currentSubscription) return false;
    return currentSubscription.plan_type === planType;
  };

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
            </button>
          </div>
        </div>
      )}

      {catalogLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.plan_type);
            const isPopular = Boolean(plan.is_popular);
            const isFree = Number(plan.price) === 0;
            const isLifetime = plan.billing_cycle === 'lifetime';

            return (
              <div
                key={`${plan.plan_type}-${plan.billing_cycle}`}
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
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      {formatPreviewPrice(plan, billingCycle)}
                    </span>
                    {isLifetime && (
                      <span className={`block text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        one-time
                      </span>
                    )}
                  </div>
                </div>

                {plan.previous_tier_name && (
                  <p className={`mb-3 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Everything in {plan.previous_tier_name}, plus:
                  </p>
                )}

                <ul className="space-y-3 mb-6 flex-grow">
                  {(plan.features || []).map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.plan_type)}
                  disabled={checkoutLoading || isCurrent || isFree}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isCurrent
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : isFree
                        ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                        : isPopular
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {checkoutLoading
                    ? 'Processing...'
                    : isCurrent
                      ? 'Current Plan'
                      : isFree
                        ? 'Current Plan'
                        : isLifetime
                          ? 'Buy Lifetime Access'
                          : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {comparisonRows.length > 0 && plans.length > 0 && (
      <div className={`rounded-xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} mb-8`}>
        <h2 className="text-2xl font-bold mb-8 text-center">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <TableRowNumberHeader className="!normal-case" />
                <th className="text-left py-4 px-4 font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.plan_type} className="text-center py-4 px-4 font-semibold">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {comparisonRows.map((row, rowIndex) => (
                <tr key={row.label}>
                  <TableRowNumberCell number={getDisplayRowNumber(rowIndex)} />
                  <td className="py-4 px-4">{row.label}</td>
                  {row.values.map((value, colIndex) => (
                    <td key={`${row.label}-${plans[colIndex]?.plan_type}`} className="text-center py-4 px-4">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span>{value}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

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

