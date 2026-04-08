/**
 * Free Trial Dashboard
 * Separate dashboard for trial users with upgrade prompts
 * Shows limited features and trial countdown
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTrialStatus } from '../../services/trialService';
import { toast } from 'react-hot-toast';
import {
  Clock,
  Users,
  Rocket,
  TrendingUp,
  CheckCircle,
  Lock,
  Zap,
  ArrowRight,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  AlertCircle,
  Crown,
  Sparkles
} from 'lucide-react';
import TrialCountdownBanner from '../../components/trial/TrialCountdownBanner';

const FreeTrialDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = location.state?.projectId;
  const isNewTrial = location.state?.isNewTrial;

  const [loading, setLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState(null);
  const [showWelcome, setShowWelcome] = useState(isNewTrial);

  useEffect(() => {
    if (projectId) {
      loadTrialStatus();
    } else {
      // Try to get from local storage or redirect
      toast.error('No trial project found');
      navigate('/onboarding/project-type-selection');
    }
  }, [projectId]);

  const loadTrialStatus = async () => {
    try {
      const status = await getTrialStatus(projectId);
      setTrialStatus(status);

      // Check if trial has expired
      if (status.status === 'expired' || status.status === 'locked') {
        // Show expiry modal or redirect
        navigate('/trial/expired', { state: { projectId } });
      }
    } catch (error) {
      console.error('Error loading trial status:', error);
      toast.error('Failed to load trial information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/trial/upgrade', {
      state: {
        projectId,
        currentProject: trialStatus?.project_name
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-lg">Loading your trial dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Trial Countdown Banner - Always at top */}
      {trialStatus && (
        <TrialCountdownBanner
          daysRemaining={trialStatus.days_remaining}
          trialEndDate={trialStatus.trial_end_date}
          onUpgrade={handleUpgrade}
        />
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome Message for New Trials */}
        {showWelcome && (
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-600/50 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to Your Free Trial! 🎉
                </h2>
                <p className="text-gray-300 mb-4">
                  You have {trialStatus?.days_remaining} days to explore all the features.
                  Start by creating tasks, inviting team members, and building your first Gantt chart!
                </p>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                >
                  Got it, let's start
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">
              {trialStatus?.project_name || 'Trial Project'}
            </h1>
            <span className="bg-green-600/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold">
              FREE TRIAL
            </span>
          </div>
          <p className="text-gray-400">
            Manage your trial project and explore the platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Days Remaining */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {trialStatus?.days_remaining || 0}
                </div>
                <div className="text-sm text-gray-400">Days Left</div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {trialStatus?.current_member_count || 0} / 5
                </div>
                <div className="text-sm text-gray-400">Team Members</div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-gray-400">Tasks</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0%</div>
                <div className="text-sm text-gray-400">Complete</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-500" />
              Quick Actions
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Create Task */}
              <button className="flex items-start gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-1">Create First Task</div>
                  <div className="text-sm text-gray-400">Start managing your project</div>
                </div>
              </button>

              {/* Invite Team */}
              <button className="flex items-start gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left">
                <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-1">Invite Team Members</div>
                  <div className="text-sm text-gray-400">Add up to 5 members</div>
                </div>
              </button>

              {/* View Gantt */}
              <button className="flex items-start gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left">
                <BarChart3 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-1">View Gantt Chart</div>
                  <div className="text-sm text-gray-400">Visualize your timeline</div>
                </div>
              </button>

              {/* Project Settings */}
              <button className="flex items-start gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left">
                <Settings className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-1">Project Settings</div>
                  <div className="text-sm text-gray-400">Configure your project</div>
                </div>
              </button>
            </div>
          </div>

          {/* Upgrade Prompt Card */}
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl p-6 border-2 border-blue-600">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Upgrade to Pro</h3>
            </div>

            <p className="text-gray-300 mb-4 text-sm">
              Unlock unlimited projects, advanced features, and priority support
            </p>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>20+ team members</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Advanced Gantt charts</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </button>
          </div>
        </div>

        {/* Feature Access Grid */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Feature Access
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Available Features */}
            <div>
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Available in Trial
              </h3>
              <ul className="space-y-2">
                {[
                  'Basic task management',
                  'Simple Gantt charts',
                  'Team collaboration (5 members)',
                  'File attachments',
                  'Comments & discussions',
                  'Mobile access',
                  'Email notifications'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Locked Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Unlock with Paid Plan
              </h3>
              <ul className="space-y-2">
                {[
                  'Advanced Gantt with dependencies',
                  'Resource management',
                  'Time tracking',
                  'Budget management',
                  'Custom workflows',
                  'API access',
                  'Advanced reporting',
                  'Priority support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-400">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Don't lose your work!
                </h3>
                <p className="text-gray-300">
                  Upgrade before your trial ends to keep all your data and continue managing projects.
                </p>
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              View Plans
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeTrialDashboard;
