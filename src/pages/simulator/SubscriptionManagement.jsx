import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { CreditCard, Calendar, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { getUserSubscription, getTierDetails, isSubscriptionActive, getDaysUntilExpiry, isInGracePeriod, getGracePeriodDaysRemaining } from '../../services/subscriptionService';
import { getCustomerPortalUrl, getBillingHistory } from '../../services/stripeService';
import UpgradeDowngradeModal from '../../components/sim/UpgradeDowngradeModal';
import { simDb } from '../../services/supabase/supabaseClient';

const SubscriptionManagement = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
      
      if (user?.id) {
        const sub = await getUserSubscription(user.id);
        setSubscription(sub);
        
        if (sub) {
          const history = await getBillingHistory(user.id);
          setBillingHistory(history || []);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const returnUrl = `${window.location.origin}/simulator/subscription`;
      const portalUrl = await getCustomerPortalUrl(userId, returnUrl);
      window.location.href = portalUrl;
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Error opening billing portal. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            You're currently on the Free plan. Upgrade to unlock more features!
          </p>
          <a
            href="/simulator/pricing"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
          >
            View Plans
          </a>
        </div>
      </div>
    );
  }

  const tier = getTierDetails(subscription.plan_type);
  const isActive = isSubscriptionActive(subscription);
  const daysUntilExpiry = getDaysUntilExpiry(subscription);
  const inGracePeriod = isInGracePeriod(subscription);
  const graceDaysRemaining = getGracePeriodDaysRemaining(subscription);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current Subscription Card */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{tier.name} Plan</h2>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isActive && !inGracePeriod
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : inGracePeriod
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {inGracePeriod ? 'Grace Period' : isActive ? 'Active' : subscription.status}
              </span>
              {subscription.is_lifetime && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Lifetime
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {subscription.is_lifetime ? (
                <span className="text-purple-500">Lifetime</span>
              ) : (
                <>
                  {formatCurrency(subscription.amount_paid || tier.price)}
                  <span className="text-lg text-gray-500">
                    /{subscription.billing_cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Started
            </p>
            <p className="font-medium">{formatDate(subscription.started_at)}</p>
          </div>
          {!subscription.is_lifetime && (
            <>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  {subscription.cancel_at_period_end ? 'Expires' : 'Renews'}
                </p>
                <p className="font-medium">
                  {formatDate(subscription.current_period_end || subscription.next_billing_date)}
                  {daysUntilExpiry !== null && (
                    <span className={`ml-2 text-sm ${daysUntilExpiry < 7 ? 'text-red-500' : 'text-gray-500'}`}>
                      ({daysUntilExpiry} days)
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            onClick={handleManageBilling}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Manage Billing</span>
          </button>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Change Plan</span>
          </button>
        </div>

        {inGracePeriod && (
          <div className={`mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Your subscription is in grace period
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {graceDaysRemaining !== null && graceDaysRemaining > 0
                    ? `You have ${graceDaysRemaining} day${graceDaysRemaining !== 1 ? 's' : ''} remaining to update your payment method.`
                    : 'Please update your payment method to continue access.'}
                </p>
                <button
                  onClick={handleManageBilling}
                  className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
                >
                  Update Payment Method
                </button>
              </div>
            </div>
          </div>
        )}

        {subscription.cancel_at_period_end && !inGracePeriod && (
          <div className={`mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your subscription will cancel at the end of the current billing period. You'll continue to have access until then.
            </p>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Billing History
        </h3>

        {billingHistory.length === 0 ? (
          <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No billing history available
          </p>
        ) : (
          <div className="space-y-3">
            {billingHistory.map((invoice) => (
              <div
                key={invoice.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{invoice.description || 'Subscription Payment'}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatDate(invoice.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
                {invoice.receipt_url && (
                  <a
                    href={invoice.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm text-blue-500 hover:text-blue-600"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download Receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade/Downgrade Modal */}
      <UpgradeDowngradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentSubscription={subscription}
        onSuccess={(newTier) => {
          // Reload subscription data
          loadData();
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
};

export default SubscriptionManagement;

