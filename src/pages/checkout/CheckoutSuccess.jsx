/**
 * Checkout Success Page
 * Handles Paynow payment return and subscription verification
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader, ArrowRight, Sparkles, XCircle, AlertCircle } from 'lucide-react';
import { verifyAndCreateSubscription } from '../../services/paynowService';
import { toast } from 'react-hot-toast';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const type = searchParams.get('type'); // 'subscription' or 'upgrade'

    if (!reference) {
      setStatus('error');
      return;
    }

    handlePaymentVerification(reference, type);
  }, [searchParams]);

  const handlePaymentVerification = async (reference, type) => {
    try {
      // Verify payment and create subscription
      const result = await verifyAndCreateSubscription(reference);

      if (!result.success) {
        setStatus('error');
        toast.error(result.error || 'Payment verification failed');
        return;
      }

      setSubscriptionId(result.subscriptionId);
      setProjectId(result.projectId);
      setStatus('success');
      toast.success('Payment successful! Your subscription is now active.');

      // Redirect after 3 seconds if auto-redirect is enabled
      // setTimeout(() => {
      //   if (type === 'upgrade') {
      //     navigate('/dashboard', { state: { upgraded: true } });
      //   } else {
      //     navigate('/dashboard', { state: { newSubscription: true } });
      //   }
      // }, 3000);
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      toast.error('Failed to verify payment. Please contact support.');
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Verification Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't verify your payment. Please contact support if you were charged.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/support')}
              className="flex-1 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-900 px-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {subscriptionId ? 'Your subscription is now active!' : 'Welcome to your new subscription'}
          </p>
          {subscriptionId && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Subscription ID: {subscriptionId.substring(0, 8)}...
            </p>
          )}
        </div>

        {/* Success Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens next?
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Your subscription has been activated
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  You now have full access to all features
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  A confirmation email has been sent to your inbox
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  You can manage your subscription anytime from your dashboard
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContinue}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              View Subscription Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Need help? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
