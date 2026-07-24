import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Lock, AlertCircle } from 'lucide-react';
import { getSubscriptionStatusSummary } from '../../services/subscriptionStatusService';
import { simDb } from '../../services/supabase/supabaseClient';

const SubscriptionAccessGate = ({ children, requiredFeature, scenario = null }) => {
  const { theme } = useTheme();
  const [hasAccess, setHasAccess] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [statusSummary, setStatusSummary] = React.useState(null);

  React.useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const summary = await getSubscriptionStatusSummary(user.id);
      setStatusSummary(summary);

      if (!summary.isActive) {
        setHasAccess(false);
      } else if (scenario) {
        // Check scenario-specific access
        const { canAccessScenario } = await import('../../services/subscriptionService');
        const canAccess = await canAccessScenario(user.id, scenario);
        setHasAccess(canAccess);
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show access restriction message
  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
        
        {statusSummary?.inGracePeriod ? (
          <div className={`mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Your subscription is in grace period
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {statusSummary.graceDaysRemaining !== null && statusSummary.graceDaysRemaining > 0
                    ? `You have ${statusSummary.graceDaysRemaining} day${statusSummary.graceDaysRemaining !== 1 ? 's' : ''} remaining to update your payment method.`
                    : 'Please update your payment method to continue access.'}
                </p>
              </div>
            </div>
          </div>
        ) : statusSummary?.status === 'expired' ? (
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Your subscription has expired. Renew your subscription to continue accessing premium features.
          </p>
        ) : (
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {scenario
              ? 'This scenario requires a premium subscription.'
              : `This feature requires a ${requiredFeature || 'premium'} subscription.`}
          </p>
        )}

        <div className="flex space-x-4 justify-center">
          <Link
            to="/simulator/pricing"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
          >
            {statusSummary?.inGracePeriod || statusSummary?.status === 'expired'
              ? 'Renew Subscription'
              : 'Upgrade Now'}
          </Link>
          {statusSummary?.inGracePeriod && (
            <Link
              to="/simulator/subscription"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Manage Subscription
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionAccessGate;

