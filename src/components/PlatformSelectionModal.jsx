/**
 * Platform Selection Modal
 *
 * Shown when a user tries to access a platform they haven't registered for
 * Allows them to start a free trial or view pricing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Briefcase, Gamepad2, Sparkles, CheckCircle, Loader } from 'lucide-react';
import { registerForPlatform, PLATFORMS } from '../services/unifiedSubscriptionService';
import { useToast } from '../hooks/useToast';

export default function PlatformSelectionModal({ isOpen, onClose, platform, userId }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const platformInfo = {
    pm: {
      name: 'PM Platform',
      icon: Briefcase,
      description: 'Manage real projects with your team',
      features: [
        'Unlimited projects on free tier',
        'Task management & Gantt charts',
        'Team collaboration',
        'Basic analytics',
        'Multiple PM methodologies',
      ],
      freeTier: {
        projects: 1,
        teamMembers: 5,
      },
    },
    simulator: {
      name: 'PM Simulator',
      icon: Gamepad2,
      description: 'Practice project management skills',
      features: [
        '5 beginner scenarios',
        'Interactive simulations',
        'AI-driven challenges',
        'Progress tracking',
        'Community access',
      ],
      freeTier: {
        scenarios: 5,
        simulationsPerMonth: 10,
      },
    },
  };

  const info = platformInfo[platform] || platformInfo.pm;
  const Icon = info.icon;

  const handleStartFreeTrial = async () => {
    setLoading(true);
    try {
      // Register user for the platform
      await registerForPlatform(userId, platform);

      showToast('success', `Welcome to ${info.name}! Free tier activated.`);

      // Close modal
      onClose();

      // Navigate to the platform
      const redirectPath = platform === PLATFORMS.PM ? '/dashboard' : '/simulator';
      navigate(redirectPath);
    } catch (error) {
      console.error('Error starting free trial:', error);
      showToast('error', 'Failed to activate free tier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPricing = () => {
    onClose();
    const pricingPath = platform === PLATFORMS.PM ? '/pricing' : '/simulator/pricing';
    navigate(pricingPath);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to {info.name}!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {info.description}
            </p>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
              Free Tier Includes:
            </h3>
            <ul className="space-y-2">
              {info.features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Free tier limits */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-2">
              Free Tier Limits:
            </p>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              {platform === PLATFORMS.PM && (
                <>
                  <p>• {info.freeTier.projects} project</p>
                  <p>• {info.freeTier.teamMembers} team members</p>
                </>
              )}
              {platform === PLATFORMS.SIMULATOR && (
                <>
                  <p>• {info.freeTier.scenarios} beginner scenarios</p>
                  <p>• {info.freeTier.simulationsPerMonth} simulations per month</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleStartFreeTrial}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin mr-2" />
                  Activating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Free Trial
                </>
              )}
            </button>

            <button
              onClick={handleViewPricing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              View All Plans & Pricing
            </button>

            <button
              onClick={handleSkip}
              className="w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Maybe later
            </button>
          </div>

          {/* Upgrade info */}
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            You can upgrade to a paid plan anytime to unlock more features
          </p>
        </div>
      </div>
    </div>
  );
}
