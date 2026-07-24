/**
 * Trial Expiry Modal
 * Shown when trial period has ended
 * Blocks access until user upgrades
 */

import React from 'react';
import { Lock, Zap, CheckCircle, AlertCircle, ArrowRight, XCircle } from 'lucide-react';

const TrialExpiryModal = ({ projectName, onUpgrade, onClose, canClose = false }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border-2 border-red-600/50 relative">
        {/* Close Button - Only if canClose is true */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}

        {/* Header with Lock Icon */}
        <div className="text-center pt-12 pb-6 px-8">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Lock className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">
            Your Trial Has Ended
          </h2>

          <p className="text-xl text-gray-300 mb-2">
            {projectName ? `"${projectName}"` : 'Your project'} is now locked
          </p>

          <p className="text-gray-400">
            Your 10-day free trial has expired. Upgrade to continue accessing your project.
          </p>
        </div>

        {/* What's Locked */}
        <div className="px-8 pb-6">
          <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Currently Locked:
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>Project access and dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>All tasks and Gantt charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>Team collaboration features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>File attachments and documents</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-300">
                <strong className="text-white">Don't worry!</strong> All your data is safe.
                Upgrade now to restore full access immediately.
              </p>
            </div>
          </div>

          {/* What You Get by Upgrading */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Unlock Full Access
            </h3>

            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Unlimited projects',
                'Advanced Gantt charts',
                '20+ team members',
                'Resource management',
                'Time tracking',
                'Budget management',
                'API access',
                'Priority support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Highlight */}
          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Plans starting at</p>
            <p className="text-3xl font-bold text-white">
              $29<span className="text-lg text-gray-400">/month</span>
            </p>
            <p className="text-sm text-green-400 mt-1">Save 20% with yearly billing</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition text-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Upgrade to Continue
              <ArrowRight className="w-5 h-5" />
            </button>

            {canClose && (
              <button
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition"
              >
                I'll Decide Later
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Questions? Contact{' '}
            <a href="mailto:support@projectnidus.com" className="text-blue-400 hover:underline">
              support@projectnidus.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiryModal;
