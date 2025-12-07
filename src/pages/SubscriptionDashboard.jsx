/**
 * Subscription Dashboard
 *
 * Unified dashboard showing all subscriptions across Platform and Simulator
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Briefcase,
  Gamepad2,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getSubscriptionSummary } from '../services/unifiedSubscriptionService';
import { PLATFORM_SUBSCRIPTION_TIERS } from '../services/platformSubscriptionService';
import { SUBSCRIPTION_TIERS } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

export default function SubscriptionDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);

      const subscriptionSummary = await getSubscriptionSummary(currentUser.id);
      setSummary(subscriptionSummary);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      showToast('error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const getStatusBadge = (status, isActive) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </span>
      );
    }

    const statusMap = {
      cancelled: {
        color: 'red',
        icon: AlertCircle,
        label: 'Cancelled',
      },
      expired: {
        color: 'gray',
        icon: Clock,
        label: 'Expired',
      },
      past_due: {
        color: 'yellow',
        icon: AlertCircle,
        label: 'Past Due',
      },
      trialing: {
        color: 'blue',
        icon: Sparkles,
        label: 'Trial',
      },
    };

    const statusInfo = statusMap[status] || { color: 'gray', icon: Clock, label: status };
    const Icon = statusInfo.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800 dark:bg-${statusInfo.color}-900/30 dark:text-${statusInfo.color}-300`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </span>
    );
  };

  const getPlatformIcon = (platform) => {
    return platform === 'pm' ? Briefcase : Gamepad2;
  };

  const getPlanName = (platform, planType) => {
    if (platform === 'pm') {
      const tier = PLATFORM_SUBSCRIPTION_TIERS[planType?.toUpperCase()];
      return tier?.name || planType;
    } else {
      const tier = SUBSCRIPTION_TIERS[planType?.toUpperCase()];
      return tier?.name || planType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Subscription Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your Platform and Simulator subscriptions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Active Subscriptions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Subscriptions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary?.activeSubscriptions?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Registered Platforms */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Registered Platforms
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary?.registeredPlatforms?.length || 0} / 2
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Spend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary?.totalValue?.mrr || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Subscriptions
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {summary?.subscriptions && summary.subscriptions.length > 0 ? (
              summary.subscriptions.map((subscription) => {
                const PlatformIcon = getPlatformIcon(subscription.platform);
                return (
                  <div key={subscription.subscription_id} className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Platform Info */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <PlatformIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {subscription.platform === 'platform' ? 'Platform' : 'Simulator'}
                            </h3>
                            {getStatusBadge(subscription.status, subscription.is_active)}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {getPlanName(subscription.platform, subscription.plan_type)} Plan
                          </p>

                          {/* Subscription Details */}
                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Started</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(subscription.started_at)}
                              </p>
                            </div>
                            {subscription.is_lifetime ? (
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Access</p>
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  Lifetime
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">
                                  {subscription.expires_at ? 'Expires' : 'Billing Cycle'}
                                </p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {subscription.expires_at
                                    ? formatDate(subscription.expires_at)
                                    : subscription.billing_cycle}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end space-y-2">
                        {subscription.amount_paid > 0 && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(subscription.amount_paid, subscription.currency)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {subscription.billing_cycle === 'monthly'
                                ? 'per month'
                                : subscription.billing_cycle === 'yearly'
                                ? 'per year'
                                : 'one-time'}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            const path =
                              subscription.platform === 'pm'
                                ? '/pricing'
                                : '/simulator/pricing';
                            navigate(path);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Manage Plan
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No subscriptions yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started with a free tier on any platform
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View PM Plans
                  </button>
                  <button
                    onClick={() => navigate('/simulator/pricing')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    View Simulator Plans
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Platform Access Status */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Platform</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Real project management
                  </p>
                </div>
              </div>
              {summary?.registeredPlatforms?.includes('pm') ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Get Started
                </button>
              )}
            </div>

            {/* Simulator */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Gamepad2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Simulator</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Practice PM skills</p>
                </div>
              </div>
              {summary?.registeredPlatforms?.includes('simulator') ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <button
                  onClick={() => navigate('/simulator/pricing')}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
