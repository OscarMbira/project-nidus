/**
 * Payment Form Component
 * Paynow payment integration for subscription processing
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../../services/paynowService';
import { CreditCard, Lock, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PaymentForm = ({ plan, organisationId, projectId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate unique reference for this payment
      const reference = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare subscription data for Paynow
      const subscriptionData = {
        amount: parseFloat(plan.price),
        currency: plan.currency || 'USD',
        reference: reference,
        returnUrl: `${window.location.origin}/checkout/success?reference=${reference}&type=subscription`,
        resultUrl: `${window.location.origin}/api/webhooks/paynow`,
        description: `${plan.plan_name} - ${plan.billing_cycle}`,
        metadata: {
          plan_id: plan.id,
          plan_type: plan.plan_type,
          billing_cycle: plan.billing_cycle,
          organisation_id: organisationId,
          project_id: projectId,
          member_limit: plan.member_limit,
        },
      };

      // Create Paynow checkout session
      const result = await createCheckoutSession(subscriptionData);

      if (!result.success) {
        setError(result.error || 'Failed to initiate payment');
        setLoading(false);
        return;
      }

      // Store payment reference in sessionStorage for verification
      sessionStorage.setItem('pending_payment', JSON.stringify({
        reference,
        plan_id: plan.id,
        organisation_id: organisationId,
        project_id: projectId,
        type: 'subscription',
      }));

      // Redirect to Paynow checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        // If checkout URL is not provided, show error
        setError('Payment gateway unavailable. Please try again later.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8">
      {/* Plan Summary */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white font-semibold">{plan.plan_name}</div>
            <div className="text-gray-400 text-sm">
              {plan.billing_cycle === 'lifetime' 
                ? 'One-time payment' 
                : `${plan.billing_cycle.charAt(0).toUpperCase() + plan.billing_cycle.slice(1)} billing`}
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ${plan.price}
            {plan.billing_cycle !== 'lifetime' && (
              <span className="text-sm text-gray-400 font-normal">
                /{plan.billing_cycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            )}
          </div>
        </div>
        {plan.original_price && plan.original_price > plan.price && (
          <div className="mt-2 text-sm text-green-400">
            Save ${(plan.original_price - plan.price).toFixed(2)}!
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-medium text-white mb-1">You will be redirected to Paynow</p>
            <p>Complete your payment securely on Paynow's platform. You'll be redirected back after payment.</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
        <Lock className="w-4 h-4" />
        <span>Payments are secure and encrypted via Paynow</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Processing...
            </>
          ) : (
            <>
              Continue to Paynow
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;

