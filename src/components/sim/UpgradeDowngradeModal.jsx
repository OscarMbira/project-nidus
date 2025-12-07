import React, { useState } from 'react';
import { useThemeContext } from '../../context/ThemeContext';
import { X, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { SUBSCRIPTION_TIERS, getTierDetails } from '../../services/subscriptionService';
import { updateSubscription } from '../../services/stripeService';

const UpgradeDowngradeModal = ({ isOpen, onClose, currentSubscription, onSuccess }) => {
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  if (!isOpen) return null;

  const currentTier = currentSubscription ? getTierDetails(currentSubscription.plan_type) : SUBSCRIPTION_TIERS.FREE;
  const availableTiers = Object.values(SUBSCRIPTION_TIERS).filter(
    tier => tier.id !== currentTier.id && tier.price > 0
  );

  const isUpgrade = (tier) => {
    const tierOrder = ['free', 'basic', 'professional', 'lifetime'];
    const currentIndex = tierOrder.indexOf(currentTier.id);
    const newIndex = tierOrder.indexOf(tier.id);
    return newIndex > currentIndex;
  };

  const handleChangePlan = async () => {
    if (!selectedTier || !currentSubscription) return;

    try {
      setLoading(true);
      
      // Call Stripe API to update subscription
      await updateSubscription(
        currentSubscription.stripe_subscription_id,
        selectedTier.priceId,
        currentSubscription.user_id
      );

      if (onSuccess) {
        onSuccess(selectedTier);
      }
      onClose();
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Error changing plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveDate = (tier) => {
    if (isUpgrade(tier)) {
      return 'Immediately';
    } else {
      return `At end of current billing period (${new Date(currentSubscription.current_period_end).toLocaleDateString()})`;
    }
  };

  const calculateProration = (tier) => {
    if (!currentSubscription || isUpgrade(tier)) {
      return null;
    }
    
    // Calculate days remaining in current period
    const now = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((periodEnd - new Date(currentSubscription.current_period_start)) / (1000 * 60 * 60 * 24));
    
    // Calculate prorated refund
    const currentPrice = currentSubscription.amount_paid || currentTier.price;
    const proratedAmount = (currentPrice * daysRemaining) / totalDays;
    
    return {
      daysRemaining,
      proratedAmount: proratedAmount.toFixed(2),
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } shadow-xl`}>
        {/* Header */}
        <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        } bg-inherit z-10`}>
          <h2 className="text-2xl font-bold">Change Subscription Plan</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Plan */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Current Plan
          </p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{currentTier.name}</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                ${currentTier.price}
                {currentTier.billingCycle && currentTier.billingCycle !== 'one_time' && `/${currentTier.billingCycle === 'monthly' ? 'mo' : 'yr'}`}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Active
            </span>
          </div>
        </div>

        {/* Available Plans */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Select New Plan</h3>
          <div className="space-y-3">
            {availableTiers.map((tier) => {
              const isSelected = selectedTier?.id === tier.id;
              const upgrade = isUpgrade(tier);
              const proration = calculateProration(tier);

              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {upgrade ? (
                          <ArrowUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDown className="w-5 h-5 text-orange-500" />
                        )}
                        <h4 className="text-lg font-semibold">{tier.name}</h4>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        ${tier.price}
                        {tier.billingCycle && tier.billingCycle !== 'one_time' && `/${tier.billingCycle === 'monthly' ? 'mo' : 'yr'}`}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        Effective: {getEffectiveDate(tier)}
                      </p>
                      {proration && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                          Prorated credit: ${proration.proratedAmount} ({proration.daysRemaining} days remaining)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-inherit">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleChangePlan}
            disabled={!selectedTier || loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeDowngradeModal;

