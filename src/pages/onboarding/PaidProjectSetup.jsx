/**
 * Paid Project Setup
 * Select subscription plan and create paid project
 * Routes to checkout/payment flow
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailablePlans, getPricingSummary } from '../../services/subscriptionPlanService';
import { toast } from 'react-hot-toast';
import PlatformHeader from '../../components/homepage/PlatformHeader';
import {
  Rocket,
  Calendar,
  Users,
  CheckCircle,
  CreditCard,
  Zap,
  ArrowRight,
  Star,
  DollarSign,
  TrendingUp,
  Shield
} from 'lucide-react';

const PaidProjectSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const organisationId = location.state?.organisationId;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('yearly'); // yearly or monthly
  const [memberCount, setMemberCount] = useState(20);
  const [pricingSummary, setPricingSummary] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'software',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    platformEnabled: true,
    simulatorEnabled: false
  });

  useEffect(() => {
    if (!organisationId) {
      toast.error('Organisation ID is required');
      navigate('/onboarding/project-type-selection');
      return;
    }

    loadPlans();
  }, [organisationId, navigate]);

  useEffect(() => {
    if (selectedPlan && memberCount) {
      calculatePricing();
    }
  }, [selectedPlan, memberCount]);

  const loadPlans = async () => {
    try {
      const availablePlans = await getAvailablePlans();
      setPlans(availablePlans);

      // Auto-select the most popular plan
      const popularPlan = availablePlans.find(p => p.is_popular);
      if (popularPlan) {
        setSelectedPlan(popularPlan);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load subscription plans');
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

    // Set member count to plan's base limit
    setMemberCount(plan.member_limit);
  };

  const handleMemberCountChange = (value) => {
    const count = parseInt(value);
    if (count >= (selectedPlan?.member_limit || 20)) {
      setMemberCount(count);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }

    if (!formData.platformEnabled && !formData.simulatorEnabled) {
      toast.error('Please select at least one subsystem (Platform or Simulator)');
      return;
    }

    // Prepare project data for checkout
    const projectSetupData = {
      organisationId,
      project: {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        start_date: formData.startDate,
        platform_enabled: formData.platformEnabled,
        simulator_enabled: formData.simulatorEnabled
      },
      subscription: {
        plan_id: selectedPlan.id,
        member_count: memberCount,
        pricing_summary: pricingSummary
      }
    };

    // Navigate to checkout page
    navigate('/checkout/subscription', {
      state: projectSetupData
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredPlans = plans.filter(p => p.billing_cycle === billingCycle);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-lg">Loading subscription plans...</div>
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full mb-4">
            <Zap className="w-5 h-5" />
            <span className="font-semibold">FULL ACCESS</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Create Your First Project
          </h1>
          <p className="text-xl text-gray-400">
            Choose a plan and start managing projects professionally
          </p>
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
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {filteredPlans.map(plan => (
            <div
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`bg-gray-800 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan?.id === plan.id
                  ? 'border-2 border-blue-500 shadow-lg shadow-blue-900/50'
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
                    Save ${((plan.price / 10) * 12 - plan.price).toFixed(0)} per year
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
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Select Indicator */}
              {selectedPlan?.id === plan.id && (
                <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-2 text-center">
                  <CheckCircle className="w-5 h-5 text-blue-400 mx-auto" />
                  <span className="text-xs text-blue-400 font-medium">Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Project Setup Form */}
        {selectedPlan && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-blue-500" />
              Project Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="My Project"
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="software">Software Development</option>
                  <option value="construction">Construction</option>
                  <option value="marketing">Marketing Campaign</option>
                  <option value="product">Product Launch</option>
                  <option value="event">Event Planning</option>
                  <option value="research">Research & Development</option>
                  <option value="internal">Internal Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Brief description..."
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Member Count */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Team Members
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min={selectedPlan.member_limit}
                    value={memberCount}
                    onChange={(e) => handleMemberCountChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum {selectedPlan.member_limit} members included in plan
                  {memberCount > selectedPlan.member_limit && (
                    <span className="text-blue-400">
                      {' '}• +{memberCount - selectedPlan.member_limit} additional members
                    </span>
                  )}
                </p>
              </div>

              {/* Subsystem Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Subsystem(s) *
                </label>
                <div className="space-y-3">
                  {/* Platform */}
                  <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                    <input
                      type="checkbox"
                      checked={formData.platformEnabled}
                      onChange={(e) => handleChange('platformEnabled', e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-white">Platform (Project Management)</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Real project management tools and collaboration
                      </p>
                    </div>
                  </label>

                  {/* Simulator */}
                  <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                    <input
                      type="checkbox"
                      checked={formData.simulatorEnabled}
                      onChange={(e) => handleChange('simulatorEnabled', e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-semibold text-white">Simulator (Learning & Training)</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Project management simulator and training
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Pricing Summary */}
              {pricingSummary && (
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Pricing Summary</h3>
                  </div>

                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between">
                      <span>{selectedPlan.plan_name}</span>
                      <span className="font-medium">${pricingSummary.base_price}</span>
                    </div>
                    {pricingSummary.additional_member_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Additional {memberCount - selectedPlan.member_limit} members</span>
                        <span>${pricingSummary.additional_member_cost}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold text-white">
                        <span>Total</span>
                        <span>{`$${pricingSummary.total_price}/${billingCycle === 'yearly' ? 'year' : 'month'}`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-200">
                    <strong className="block mb-1">What You Get:</strong>
                    <ul className="space-y-1">
                      <li>• Unlimited projects</li>
                      <li>• Full feature access</li>
                      <li>• Priority support</li>
                      <li>• Cancel anytime</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition text-lg flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PaidProjectSetup;
