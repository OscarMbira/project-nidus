import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, Loader } from 'lucide-react';
import { createSubscriptionRecord } from '../../services/subscriptionService';
import { simDb } from '../../services/supabase/supabaseClient';

const CheckoutSuccess = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    processCheckout();
  }, []);

  const processCheckout = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setError('No session ID found');
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await simDb.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // In production, you would call your backend API to:
      // 1. Verify the Stripe session
      // 2. Get subscription details from Stripe
      // 3. Create/update subscription record
      
      // For now, we'll simulate this process
      // In production, replace this with an API call to your backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock subscription data - replace with actual Stripe webhook data
      const subscriptionData = {
        planType: 'basic', // This should come from Stripe session
        status: 'active',
        stripeSubscriptionId: sessionId,
        stripeCustomerId: 'cus_xxx', // Should come from Stripe
        billingCycle: 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await createSubscriptionRecord(user.id, subscriptionData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error processing checkout:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Processing your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={() => navigate('/simulator/pricing')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-500" />
        <h1 className="text-3xl font-bold mb-4">Welcome to Premium!</h1>
        <p className={`text-lg mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Your subscription has been activated successfully. You now have access to all premium features.
        </p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => navigate('/simulator')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/simulator/scenarios')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Browse Scenarios
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;

