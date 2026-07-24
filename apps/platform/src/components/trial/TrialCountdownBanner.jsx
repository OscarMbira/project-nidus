/**
 * Trial Countdown Banner
 * Displays at top of trial dashboard showing days remaining
 * Prominent upgrade CTA when trial is ending soon
 */

import React from 'react';
import { Clock, Zap, AlertTriangle, Calendar } from 'lucide-react';

const TrialCountdownBanner = ({ daysRemaining, trialEndDate, onUpgrade }) => {
  // Determine urgency level
  const getUrgencyLevel = () => {
    if (daysRemaining <= 2) return 'critical';
    if (daysRemaining <= 5) return 'warning';
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  // Format end date
  const formatEndDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Different styles based on urgency
  const getBannerStyles = () => {
    switch (urgency) {
      case 'critical':
        return {
          container: 'bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-600',
          icon: 'text-red-400',
          text: 'text-red-100',
          button: 'bg-red-600 hover:bg-red-700',
          glow: 'shadow-lg shadow-red-900/50'
        };
      case 'warning':
        return {
          container: 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-600',
          icon: 'text-yellow-400',
          text: 'text-yellow-100',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          glow: 'shadow-lg shadow-yellow-900/50'
        };
      default:
        return {
          container: 'bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-600',
          icon: 'text-green-400',
          text: 'text-green-100',
          button: 'bg-green-600 hover:bg-green-700',
          glow: ''
        };
    }
  };

  const styles = getBannerStyles();

  const getMessage = () => {
    if (daysRemaining === 0) {
      return {
        title: 'Trial Ends Today!',
        description: 'Upgrade now to keep all your data and continue managing projects.'
      };
    } else if (daysRemaining === 1) {
      return {
        title: 'Trial Ends Tomorrow!',
        description: 'Don\'t lose access to your project. Upgrade to continue.'
      };
    } else if (daysRemaining <= 2) {
      return {
        title: `Only ${daysRemaining} Days Left!`,
        description: 'Your trial is ending soon. Upgrade to keep your project active.'
      };
    } else if (daysRemaining <= 5) {
      return {
        title: `${daysRemaining} Days Remaining`,
        description: 'Consider upgrading to unlock all features and unlimited projects.'
      };
    } else {
      return {
        title: `${daysRemaining} Days of Free Trial`,
        description: 'Explore all features and upgrade anytime to unlock full access.'
      };
    }
  };

  const message = getMessage();

  return (
    <div className={`border-b-2 ${styles.container} ${styles.glow}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-4 flex-1">
            {urgency === 'critical' ? (
              <div className={`w-10 h-10 ${styles.icon} animate-pulse`}>
                <AlertTriangle className="w-10 h-10" />
              </div>
            ) : (
              <div className={`w-10 h-10 ${styles.icon}`}>
                <Clock className="w-10 h-10" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`text-lg font-bold ${styles.text}`}>
                  {message.title}
                </h3>
                {trialEndDate && (
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ends {formatEndDate(trialEndDate)}
                  </span>
                )}
              </div>
              <p className={`text-sm ${styles.text}`}>
                {message.description}
              </p>
            </div>
          </div>

          {/* Right: Upgrade Button */}
          <button
            onClick={onUpgrade}
            className={`${styles.button} text-white font-semibold px-6 py-3 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              urgency === 'critical' ? 'animate-pulse' : ''
            }`}
          >
            <Zap className="w-4 h-4" />
            {urgency === 'critical' ? 'Upgrade Now!' : 'Upgrade'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                urgency === 'critical'
                  ? 'bg-red-500'
                  : urgency === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${Math.max((daysRemaining / 10) * 100, 5)}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialCountdownBanner;
