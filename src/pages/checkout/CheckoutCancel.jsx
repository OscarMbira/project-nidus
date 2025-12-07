/**
 * Checkout Cancel Page
 *
 * Displayed when user cancels the checkout process
 */

import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-16 w-16 text-gray-600 dark:text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Checkout Cancelled
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No charges were made to your account
          </p>
        </div>

        {/* Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            What would you like to do?
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>

            <button
              onClick={() => navigate('/pricing')}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              View PM Pricing
            </button>

            <button
              onClick={() => navigate('/simulator/pricing')}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              View Simulator Pricing
            </button>

            <button
              onClick={() => navigate('/bundle-pricing')}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              View Bundle Pricing
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Have questions? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
