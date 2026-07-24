/**
 * Trial Upgrade Page
 * Allows users to upgrade their trial project to a paid subscription
 * Preserves all trial data during upgrade
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailablePlans, getPricingSummary } from '../../services/subscriptionPlanService';
import { getTrialStatus } from '../../services/trialService';
import { toast } from 'react-hot-toast';
import {
  Zap,
  CheckCircle,
  Star,
  Users,
  Shield,
  ArrowRight,
  Crown,
  TrendingUp,
  Clock,
  Award,
  Sparkles
} from 'lucide-react';

const TrialUpgrade = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = location.state?.projectId;
  const currentProject = location.state?.currentProject;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [memberCount, setMemberCount] = useState(20);
  const [pricingSummary, setPricingSummary] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (selectedPlan && memberCount) {
      calculatePricing();
    }
  }, [selectedPlan, memberCount]);

  const loadData = async () => {
    try {
      // Load plans
      const availablePlans = await getAvailablePlans();
      setPlans(availablePlans);

      // Auto-select most popular plan
      const popularPlan = availablePlans.find(p => p.is_popular);
      if (popularPlan) {
        setSelectedPlan(popularPlan);
        setMemberCount(popularPlan.member_limit);
      }

      // Load trial status if projectId exists
      if (projectId) {
        const status = await getTrialStatus(projectId);
        setTrialStatus(status);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load upgrade options');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!selectedPlan) return;

    try {
      const summary = await getPricingSummary(selectedPlan.id, memberCount);
      setPricingSummary(summary);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setBillingCycle(plan.billing_cycle);
    setMemberCount(plan.member_limit);
  };

  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    // Navigate to checkout with upgrade context
    navigate('/checkout/upgrade', {
      state: {
        projectId,
        currentProject,
        subscription: {
          plan_id: selectedPlan.id,
          member_count: memberCount,
          pricing_summary: pricingSummary
        },
        isUpgrade: true
      }
    });
  };

  const filteredPlans = plans.filter(p => p.billing_cycle === billingCycle);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-lg">Loading upgrade options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full mb-4">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">UPGRADE YOUR TRIAL</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">
            Unlock Full Access
          </h1>

          {currentProject && (
            <p className="text-xl text-gray-300 mb-2">
              Upgrade "{currentProject}" to continue without limits
            </p>
          )}

          <p className="text-gray-400">
            Keep all your data and unlock unlimited projects and advanced features
          </p>
        </div>

        {/* Trial Status Alert */}
        {trialStatus && trialStatus.days_remaining <= 5 && (
          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {trialStatus.days_remaining === 0
                    ? 'Your Trial Has Ended'
                    : `Only ${trialStatus.days_remaining} Day${trialStatus.days_remaining === 1 ? '' : 's'} Left!`}
                </h3>
                <p className="text-yellow-200">
                  {trialStatus.days_remaining === 0
                    ? 'Upgrade now to restore access to your project and all its data.'
                    : 'Upgrade now to ensure uninterrupted access to your project.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits of Upgrading */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-600/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                Why Upgrade Now?
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Keep Your Data</strong>
                    <span className="text-sm text-gray-400">All tasks and files preserved</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">No Limits</strong>
                    <span className="text-sm text-gray-400">Unlimited projects forever</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Advanced Features</strong>
                    <span className="text-sm text-gray-400">Full feature access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition relative ${
              billingCycle === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {filteredPlans.map(plan => (
            <div
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`bg-gray-800 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan?.id === plan.id
                  ? 'border-2 border-blue-500 shadow-lg shadow-blue-900/50 scale-105'
                  : 'border-2 border-gray-700 hover:border-gray-600'
              } ${plan.is_popular ? 'relative' : ''}`}
            >
              {/* Popular Badge */}
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" fill="currentColor" />
                  MOST POPULAR
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 mt-2">
                <h3 className="text-xl font-bold text-white mb-2">{plan.plan_name}</h3>
                <div className="text-3xl font-bold text-white mb-1">
                  ${plan.price}
                  <span className="text-sm text-gray-400 font-normal">
                    /{plan.billing_cycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {plan.billing_cycle === 'yearly' && (
                  <p className="text-xs text-green-400">
                    ${(plan.price / 12).toFixed(2)}/month when billed yearly
                  </p>
                )}
              </div>

              {/* Member Limit */}
              <div className="flex items-center justify-center gap-2 mb-4 text-gray-300">
                <Users className="w-5 h-5" />
                <span className="font-medium">Up to {plan.member_limit} members</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.slice(0, 6).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Select Indicator */}
              {selectedPlan?.id === plan.id && (
                <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-2 text-center">
                  <CheckCircle className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs text-blue-400 font-medium">Selected Plan</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Member Count Selector */}
        {selectedPlan && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Team Size
            </h3>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-2">
                  Number of team members
                </label>
                <input
                  type="number"
                  min={selectedPlan.member_limit}
                  value={memberCount}
                  onChange={(e) => setMemberCount(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum {selectedPlan.member_limit} members included
                </p>
              </div>

              {pricingSummary && (
                <div className="bg-gray-700 rounded-lg p-4 min-w-[200px]">
                  <div className="text-sm text-gray-400 mb-1">Total Price</div>
                  <div className="text-2xl font-bold text-white">
                    ${pricingSummary.total_price}
                    <span className="text-sm text-gray-400 font-normal">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {memberCount > selectedPlan.member_limit && (
                    <div className="text-xs text-blue-400 mt-1">
                      +{memberCount - selectedPlan.member_limit} additional members
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guarantee */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                30-Day Money-Back Guarantee
              </h3>
              <p className="text-gray-300">
                Try our paid plan risk-free. If you're not completely satisfied within 30 days,
                we'll refund your payment in full. No questions asked.
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade Button */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-xl p-8 text-center">
          <div className="mb-6">
            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Ready to Unlock Full Access?
            </h3>
            <p className="text-gray-300">
              Upgrade now and continue managing projects without limits
            </p>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={!selectedPlan}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition text-lg inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Upgrade to {selectedPlan?.plan_name || 'Selected Plan'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-sm text-gray-400 mt-4">
            Cancel anytime • No hidden fees • Instant activation
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialUpgrade;
