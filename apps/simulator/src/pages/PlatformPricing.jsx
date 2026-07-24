/**
 * Platform Pricing Page
 *
 * Displays subscription tiers for the Platform, sourced live from
 * public.subscription_plans (the same catalog admin edits in Pricing Plans).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Zap,
  Star,
  Crown,
  Shield,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getActivePlatformSubscription } from '../services/platformSubscriptionService';
import { useToast } from '@nidus/shared/hooks/useToast';
import {
  buildPlatformPreviewPlans,
  buildPricingComparisonRows,
  formatPreviewPrice,
  getPreviewDiscount,
} from '@nidus/shared/services/subscriptionPreviewCatalog';
import { fetchPricingCatalogBundle } from '@nidus/shared/services/subscriptionPlanCatalogService';
import MainHeader from '../components/homepage/MainHeader';
import PlatformFooter from '../components/homepage/PlatformFooter';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const PLAN_ICONS = {
  free: Zap,
  starter: Star,
  professional: Crown,
  enterprise: Shield,
  lifetime: Sparkles,
};

export default function PlatformPricing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [user, setUser] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [dbPlans, setDbPlans] = useState([]);

  const loadPricingData = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const { plans } = await fetchPricingCatalogBundle('platform');
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

  const tiers = useMemo(
    () => buildPlatformPreviewPlans(dbPlans, billingCycle),
    [dbPlans, billingCycle],
  );

  const lifetimeTiers = useMemo(
    () => buildPlatformPreviewPlans(dbPlans, 'lifetime'),
    [dbPlans],
  );

  const comparisonRows = useMemo(() => buildPricingComparisonRows(tiers), [tiers]);

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
    }
  };

  const handleSelectPlan = async () => {
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

  const isCurrentPlan = (planType) => {
    if (!currentSubscription) return false;
    return currentSubscription.plan_type === planType;
  };

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
                Save vs monthly
              </span>
            </button>
          </div>
        </div>

        {catalogLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
        <>
        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => {
            const Icon = PLAN_ICONS[tier.plan_type] || Star;
            const isCurrent = isCurrentPlan(tier.plan_type);
            const isPopular = Boolean(tier.is_popular);

            return (
              <div
                key={`${tier.plan_type}-${tier.billing_cycle}`}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 flex flex-col h-full ${
                  isPopular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-8 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {tier.name}
                  </h3>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {formatPreviewPrice(tier, billingCycle)}
                    </span>
                    {getPreviewDiscount(tier) != null && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {getPreviewDiscount(tier)}% off
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {(tier.features || []).map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
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
                      onClick={handleSelectPlan}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        isPopular
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
        {lifetimeTiers.length > 0 && (
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
              const Icon = PLAN_ICONS[tier.plan_type] || Sparkles;
              const isCurrent = isCurrentPlan(tier.plan_type);

              return (
                <div
                  key={`${tier.plan_type}-${tier.billing_cycle}`}
                  className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800 flex flex-col h-full"
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    <Sparkles className="inline-block h-3 w-3 mr-1" />
                    LIFETIME
                  </div>

                  <div className="p-8 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPreviewPrice(tier, 'lifetime')}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">one-time</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
                      {(tier.features || []).map((feature) => (
                        <li key={feature} className="flex items-start">
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
                        onClick={handleSelectPlan}
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
        )}

        {/* Feature Comparison */}
        {comparisonRows.length > 0 && tiers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="text-left py-4 px-4 text-gray-900 dark:text-white font-semibold">
                    Feature
                  </th>
                  {tiers.map((tier) => (
                    <th key={tier.plan_type} className="text-center py-4 px-4 text-gray-900 dark:text-white font-semibold">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {comparisonRows.map((row, rowIndex) => (
                  <tr key={row.label}>
                    <TableRowNumberCell number={getDisplayRowNumber(rowIndex)} />
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{row.label}</td>
                    {row.values.map((value, colIndex) => (
                      <td key={`${row.label}-${tiers[colIndex]?.plan_type}`} className="text-center py-4 px-4">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-red-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">{value}</span>
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
        </>
        )}

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
