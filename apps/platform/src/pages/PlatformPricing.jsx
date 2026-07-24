/**
 * Platform Pricing Page
 *
 * Displays subscription tiers from public.subscription_plans (same catalog as admin preview).
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
  attachLifetimePreviousTier,
  buildPricingComparisonRows,
  formatPreviewPrice,
  getPreviewDiscount,
} from '@nidus/shared/services/subscriptionPreviewCatalog';
import { fetchPricingCatalogBundle } from '@nidus/shared/services/subscriptionPlanCatalogService';
import MainHeader from '../components/homepage/MainHeader';
import PlatformFooter from '../components/homepage/PlatformFooter';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';

const PLAN_META = {
  free: { icon: Zap, color: 'gray' },
  starter: { icon: Star, color: 'blue' },
  professional: { icon: Crown, color: 'purple' },
  enterprise: { icon: Shield, color: 'indigo' },
  lifetime_starter: { icon: Star, color: 'blue' },
  lifetime_professional: { icon: Crown, color: 'purple' },
  lifetime_enterprise: { icon: Shield, color: 'indigo' },
};

function withPlanMeta(plan) {
  const meta = PLAN_META[plan.plan_type] || { icon: Star, color: 'blue' };
  return { ...plan, icon: meta.icon, color: meta.color };
}

export default function PlatformPricing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [dbPlans, setDbPlans] = useState([]);
  const [user, setUser] = useState(null);

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

  useEffect(() => {
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
        setAuthLoading(false);
      }
    };

    loadCurrentSubscription();
  }, []);

  const plans = useMemo(
    () => buildPlatformPreviewPlans(dbPlans, billingCycle).map(withPlanMeta),
    [dbPlans, billingCycle],
  );

  const lifetimePlans = useMemo(
    () => attachLifetimePreviousTier(
      buildPlatformPreviewPlans(dbPlans, 'lifetime'),
      buildPlatformPreviewPlans(dbPlans, billingCycle),
    ).map(withPlanMeta),
    [dbPlans, billingCycle],
  );

  const allPlans = useMemo(
    () => [...plans, ...lifetimePlans],
    [plans, lifetimePlans],
  );

  const comparisonRows = useMemo(() => buildPricingComparisonRows(plans), [plans]);

  const handleSelectPlan = async () => {
    if (!user) {
      navigate('/register');
      return;
    }

    showToast('info', 'Stripe checkout integration coming soon!');
  };

  const isCurrentPlan = (planType) => {
    if (!currentSubscription) return false;
    return currentSubscription.plan_type === planType;
  };

  const loading = catalogLoading || authLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MainHeader />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-500/20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Choose Your <span className="text-blue-300">Platform</span> Plan
            </h1>
            <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-2">
              Select the perfect plan for your team&apos;s project management needs
            </p>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Compare features below and choose the plan that best fits your requirements
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 inline-flex shadow">
              <button
                type="button"
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
                type="button"
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

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="mb-16 overflow-x-auto">
                <div
                  className="grid min-w-full gap-4"
                  style={{ gridTemplateColumns: `repeat(${allPlans.length}, minmax(11rem, 1fr))` }}
                >
                {allPlans.map((plan) => {
                  const Icon = plan.icon;
                  const isCurrent = isCurrentPlan(plan.plan_type);
                  const discount = getPreviewDiscount(plan);
                  const isLifetime = plan.billing_cycle === 'lifetime';

                  return (
                    <div
                      key={`${plan.plan_type}-${plan.billing_cycle}`}
                      className={`relative flex h-full flex-col overflow-hidden rounded-2xl shadow-lg transition-transform hover:scale-[1.02] ${
                        isLifetime
                          ? 'border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-purple-900/20'
                          : `bg-white dark:bg-gray-800 ${plan.is_popular ? 'ring-2 ring-blue-600' : ''}`
                      }`}
                    >
                      {isLifetime ? (
                        <div className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-[10px] font-bold text-white">
                          <Sparkles className="mr-1 inline-block h-3 w-3" />
                          LIFETIME
                        </div>
                      ) : plan.is_popular ? (
                        <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-600 px-3 py-1 text-[10px] font-bold text-white">
                          MOST POPULAR
                        </div>
                      ) : null}

                      <div className="flex h-full flex-col p-5 md:p-6">
                        <div
                          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-${plan.color}-100 dark:bg-${plan.color}-900/30`}
                        >
                          <Icon className={`h-5 w-5 text-${plan.color}-600 dark:text-${plan.color}-400`} />
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                          {plan.name}
                        </h3>

                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPreviewPrice(plan, isLifetime ? 'lifetime' : billingCycle)}
                          </span>
                          {isLifetime && (
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">one-time</span>
                          )}
                          {!isLifetime && discount != null && (
                            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                              {discount}% off
                            </p>
                          )}
                          {plan.member_limit != null && (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              Up to <strong>{plan.member_limit}</strong> team members
                              {plan.additional_member_price != null && (
                                <> · +${plan.additional_member_price}/extra member</>
                              )}
                            </p>
                          )}
                        </div>

                        {plan.previous_tier_name && (
                          <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                            Everything in {plan.previous_tier_name}, plus:
                          </p>
                        )}

                        <ul className="mb-6 flex-grow space-y-2">
                          {(plan.features || []).map((feature) => (
                            <li key={feature} className="flex items-start">
                              <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-lg bg-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(plan.plan_type)}
                            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                              isLifetime
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                                : plan.is_popular
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                            }`}
                          >
                            {isLifetime ? 'Get Lifetime Access' : user ? 'Upgrade Now' : 'Get Started'}
                            <ArrowRight className="ml-2 inline-block h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </>
          )}

          {comparisonRows.length > 0 && plans.length > 0 && (
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
                    {plans.map((plan) => (
                      <th
                        key={plan.plan_type}
                        className="text-center py-4 px-4 text-gray-900 dark:text-white font-semibold"
                      >
                        {plan.name}
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
                        <td key={`${row.label}-${plans[colIndex]?.plan_type}`} className="text-center py-4 px-4">
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
