/**
 * Subscription Plan Service
 * Manages subscription plan configuration and pricing
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all active subscription plans
 * @returns {Promise<Array>} List of active plans ordered by display_order
 */
export const getAvailablePlans = async () => {
  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching available plans:', error);
    throw new Error(error.message || 'Failed to fetch subscription plans');
  }

  // Parse features JSON if it's a string
  const plans = data.map(plan => ({
    ...plan,
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
  }));

  return plans;
};

/**
 * Get plan by type and billing cycle
 * @param {string} planType - Plan type (starter, professional, enterprise, lifetime)
 * @param {string} billingCycle - Billing cycle (monthly, yearly, lifetime)
 * @returns {Promise<Object>} Plan details
 */
export const getPlanByType = async (planType, billingCycle) => {
  if (!planType || !billingCycle) {
    throw new Error('Plan type and billing cycle are required');
  }

  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('plan_type', planType)
    .eq('billing_cycle', billingCycle)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching plan:', error);
    throw new Error(error.message || 'Plan not found');
  }

  // Parse features JSON if it's a string
  const plan = {
    ...data,
    features: typeof data.features === 'string' ? JSON.parse(data.features) : data.features
  };

  return plan;
};

/**
 * Get plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Plan details
 */
export const getPlanById = async (planId) => {
  if (!planId) {
    throw new Error('Plan ID is required');
  }

  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching plan by ID:', error);
    throw new Error(error.message || 'Plan not found');
  }

  // Parse features JSON if it's a string
  const plan = {
    ...data,
    features: typeof data.features === 'string' ? JSON.parse(data.features) : data.features
  };

  return plan;
};

/**
 * Get plans by billing cycle
 * @param {string} billingCycle - Billing cycle (monthly, yearly, lifetime)
 * @returns {Promise<Array>} List of plans for the billing cycle
 */
export const getPlansByBillingCycle = async (billingCycle) => {
  if (!billingCycle) {
    throw new Error('Billing cycle is required');
  }

  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('billing_cycle', billingCycle)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching plans by billing cycle:', error);
    throw new Error(error.message || 'Failed to fetch plans');
  }

  // Parse features JSON if it's a string
  const plans = data.map(plan => ({
    ...plan,
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
  }));

  return plans;
};

/**
 * Get the most popular plan
 * @returns {Promise<Object|null>} Most popular plan or null
 */
export const getPopularPlan = async () => {
  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('is_popular', true)
    .eq('is_active', true)
    .eq('billing_cycle', 'yearly') // Prefer yearly if multiple popular plans
    .order('display_order', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching popular plan:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Parse features JSON if it's a string
  const plan = {
    ...data,
    features: typeof data.features === 'string' ? JSON.parse(data.features) : data.features
  };

  return plan;
};

/**
 * Calculate additional member cost
 * @param {number} currentLimit - Current member limit
 * @param {number} additionalMembers - Number of additional members needed
 * @param {string} planType - Plan type (starter, professional, enterprise, lifetime)
 * @returns {Promise<Object>} Cost calculation
 */
export const calculateAdditionalMemberCost = async (currentLimit, additionalMembers, planType) => {
  if (!planType || additionalMembers <= 0) {
    throw new Error('Valid plan type and positive additional members required');
  }

  // Get the plan to find additional_member_price
  const { data: plan, error } = await platformDb
    .from('subscription_plans')
    .select('additional_member_price')
    .eq('plan_type', planType)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching plan for member cost calculation:', error);
    throw new Error('Plan not found');
  }

  const costPerMember = plan.additional_member_price;
  const totalCost = costPerMember * additionalMembers;

  return {
    additional_members: additionalMembers,
    cost_per_member: costPerMember,
    total_cost: totalCost,
    new_member_limit: currentLimit + additionalMembers
  };
};

/**
 * Compare plans side-by-side
 * @param {Array<string>} planIds - Array of plan IDs to compare
 * @returns {Promise<Array>} Plans with comparison data
 */
export const comparePlans = async (planIds) => {
  if (!planIds || planIds.length === 0) {
    throw new Error('Plan IDs are required for comparison');
  }

  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .in('id', planIds)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Error comparing plans:', error);
    throw new Error(error.message || 'Failed to fetch plans for comparison');
  }

  // Parse features and add comparison metadata
  const plans = data.map(plan => ({
    ...plan,
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    savings: plan.original_price ? plan.original_price - plan.price : 0,
    savings_percentage: plan.original_price
      ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
      : 0
  }));

  return plans;
};

/**
 * Get pricing summary for a plan
 * @param {string} planId - Plan ID
 * @param {number} memberCount - Number of members (optional)
 * @returns {Promise<Object>} Pricing breakdown
 */
export const getPricingSummary = async (planId, memberCount = null) => {
  const plan = await getPlanById(planId);

  const baseCost = plan.price;
  let additionalMemberCost = 0;
  let totalMembers = plan.member_limit;

  // Calculate additional member costs if specified
  if (memberCount && memberCount > plan.member_limit) {
    const additionalMembers = memberCount - plan.member_limit;
    additionalMemberCost = additionalMembers * plan.additional_member_price;
    totalMembers = memberCount;
  }

  const totalCost = baseCost + additionalMemberCost;

  return {
    plan_id: plan.id,
    plan_name: plan.plan_name,
    plan_type: plan.plan_type,
    billing_cycle: plan.billing_cycle,
    base_cost: baseCost,
    base_member_limit: plan.member_limit,
    additional_members: memberCount ? Math.max(0, memberCount - plan.member_limit) : 0,
    additional_member_cost: additionalMemberCost,
    cost_per_additional_member: plan.additional_member_price,
    total_members: totalMembers,
    total_cost: totalCost,
    currency: plan.currency,
    savings: plan.original_price ? plan.original_price - plan.price : 0
  };
};

export default {
  getAvailablePlans,
  getPlanByType,
  getPlanById,
  getPlansByBillingCycle,
  getPopularPlan,
  calculateAdditionalMemberCost,
  comparePlans,
  getPricingSummary
};
