/**
 * Project Type Selection
 * User chooses between Free Trial or Paid Subscription
 * KEY DECISION POINT in registration flow
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkTrialEligibility } from '../../services/organisationService';
import { toast } from 'react-hot-toast';
import { Clock, CreditCard, CheckCircle, AlertCircle, ArrowRight, Star } from 'lucide-react';
import PlatformHeader from '../../components/homepage/PlatformHeader';

const ProjectTypeSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const organisationId = location.state?.organisationId;

  const [trialEligible, setTrialEligible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisationId) {
      toast.error('Organisation ID is required');
      navigate('/onboarding/organisation-setup');
      return;
    }
    checkEligibility();
  }, [organisationId]);

  const checkEligibility = async () => {
    try {
      const eligible = await checkTrialEligibility(organisationId);
      setTrialEligible(eligible);
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      toast.error('Failed to check trial eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleTrialSelect = () => {
    navigate('/onboarding/trial-project-setup', {
      state: { organisationId }
    });
  };

  const handlePaidSelect = () => {
    navigate('/onboarding/paid-project-setup', {
      state: { organisationId }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-lg">Loading options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PlatformHeader />
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Starting Plan
          </h1>
          <p className="text-xl text-gray-400">
            Start with a free trial or subscribe for full access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Free Trial Card */}
          <div
            className={`bg-gray-800 rounded-xl shadow-2xl p-8 border-2 transition-all ${
              trialEligible
                ? 'border-green-600 hover:shadow-green-900/50'
                : 'border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Free Trial</h2>
                  <p className="text-gray-400">Perfect for testing</p>
                </div>
              </div>
              {trialEligible && (
                <span className="bg-green-600/20 text-green-400 text-xs font-semibold py-1 px-3 rounded-full">
                  AVAILABLE
                </span>
              )}
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-white mb-2">FREE</div>
              <p className="text-gray-400">10-day trial period</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>1 Project</strong> - Test with a real project
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>5 Team Members</strong> - Collaborate with your team
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Basic Task Management</strong> - Create and assign tasks
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Simple Gantt Charts</strong> - Visualize timelines
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Community Support</strong> - Help from our community
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Upgrade Anytime</strong> - No commitment required
                </span>
              </li>
            </ul>

            {!trialEligible && (
              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <strong>Trial already used</strong>
                    <br />
                    Your organisation already has a trial project. Additional projects require a paid plan.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleTrialSelect}
              disabled={!trialEligible}
              className={`w-full font-semibold py-4 px-6 rounded-lg transition text-lg flex items-center justify-center gap-2 ${
                trialEligible
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {trialEligible ? (
                <>
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                'Trial Already Used'
              )}
            </button>
          </div>

          {/* Paid Subscription Card */}
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl shadow-2xl p-8 border-2 border-blue-600 hover:shadow-blue-900/50 transition-all relative">
            {/* Recommended Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold py-1 px-4 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" fill="currentColor" />
              RECOMMENDED
            </div>

            <div className="flex items-center justify-between mb-6 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Paid Subscription</h2>
                  <p className="text-gray-300">Full platform access</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-white mb-2">
                From $29<span className="text-lg text-gray-400">/month</span>
              </div>
              <p className="text-gray-300">Choose your plan</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Unlimited Projects</strong> - Create as many as you need
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>20+ Team Members</strong> - Scale your team
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Advanced Features</strong> - Full task management suite
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Advanced Gantt Charts</strong> - Interactive timelines
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Priority Support</strong> - Get help when you need it
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Full Platform Access</strong> - All features unlocked
                </span>
              </li>
            </ul>

            <button
              onClick={handlePaidSelect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition text-lg flex items-center justify-center gap-2"
            >
              View Subscription Plans
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer Benefits */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 flex items-center justify-center gap-6 flex-wrap">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              No credit card required for trial
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Upgrade as you grow
            </span>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProjectTypeSelection;
